import type { RuntimeFeedItem, RuntimeMedia } from "@/lib/feed/types";

const DEFAULT_REDLIB_ORIGINS = [
  "https://redlib.perennialte.ch",
  "https://redlib.catsarch.com",
  "https://redlib.r4fo.com",
  "https://red.artemislena.eu",
  "https://redlib.cow.rip",
  "https://redlib.privadency.com",
];

export type RedlibGalleryPost = {
  author?: string;
  createdAt?: string;
  media: RuntimeMedia[];
  subreddit?: string;
  title?: string;
};

export async function fetchRedlibGalleryPost({
  permalink,
  userAgent,
}: {
  permalink: string;
  userAgent: string;
}): Promise<RedlibGalleryPost | null> {
  const path = redlibPostPath(permalink);
  if (!path) return null;

  const html = await fetchRedlibHtml(path, userAgent);
  if (!html) return null;
  const media = redlibGalleryHtmlToMedia(html);

  return {
    author: redlibAuthor(html),
    createdAt: redlibCreatedAt(html),
    media,
    subreddit: redlibSubreddit(html),
    title: redlibTitle(html),
  };
}

export async function fetchRedlibListingItems({
  allowNsfw,
  limit,
  listingUrl,
  userAgent,
}: {
  allowNsfw?: boolean;
  limit: number;
  listingUrl: string;
  userAgent: string;
}): Promise<RuntimeFeedItem[]> {
  const path = redlibListingPath(listingUrl);
  if (!path) return [];

  const html = await fetchRedlibHtml(path, userAgent);
  if (!html) return [];

  return redlibListingHtmlToItems(html, {
    allowNsfw,
    limit,
    listingUrl,
  });
}

export function redlibGalleryHtmlToMedia(html: string): RuntimeMedia[] {
  const media: RuntimeMedia[] = [];
  const seenUrls = new Set<string>();

  for (const match of html.matchAll(
    /<a\b(?=[^>]*(?:\bpost_media_image\b|href\s*=\s*["']\/preview\/pre\/))[^>]*href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>[\s\S]*?<img\b[^>]*(?:alt\s*=\s*["'](?:Gallery image|Post image)["'][^>]*)?>/gi,
  )) {
    const raw = match[2] ?? match[3] ?? match[4];
    const url = raw ? redlibPreviewToRedditUrl(decodeHtml(raw)) : null;
    if (!url || seenUrls.has(url)) continue;

    media.push({
      type: "image",
      url,
      galleryIndex: media.length,
    });
    seenUrls.add(url);
  }

  for (const match of html.matchAll(
    /<video\b([^>]*)>[\s\S]*?<source\b[^>]*src\s*=\s*["']\/hls\/([^/"']+)\/HLSPlaylist\.m3u8["'][^>]*>/gi,
  )) {
    const videoTag = match[1] ?? "";
    const videoId = match[2];
    const url = videoId ? `https://v.redd.it/${videoId}/HLSPlaylist.m3u8` : "";
    if (!url || seenUrls.has(url)) continue;

    media.push({
      type: "video",
      url,
      width: numberAttribute(`<video ${videoTag}>`, "width"),
      height: numberAttribute(`<video ${videoTag}>`, "height"),
      isHls: true,
      galleryIndex: media.length,
    });
    seenUrls.add(url);
  }

  return media;
}

export function redlibListingHtmlToItems(
  html: string,
  {
    allowNsfw,
    limit,
    listingUrl,
  }: {
    allowNsfw?: boolean;
    limit: number;
    listingUrl: string;
  },
): RuntimeFeedItem[] {
  const items: RuntimeFeedItem[] = [];

  for (const match of html.matchAll(
    /<div\b[^>]*class=["'][^"']*\bpost\b[^"']*["'][^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)(?=<hr\b[^>]*class=["'][^"']*\bsep\b|<\/main>|<footer|$)/gi,
  )) {
    if (items.length >= limit) break;

    const postId = match[1];
    const block = match[2] ?? "";
    const isNsfw = /\bclass=["'][^"']*\bnsfw\b/i.test(block);
    if (isNsfw && allowNsfw === false) continue;

    const media = redlibGalleryHtmlToMedia(block);
    if (!postId || !media.length) continue;

    items.push({
      id: `reddit:${postId}`,
      source: "reddit",
      title: redlibTitle(block) ?? "Untitled Reddit post",
      permalink: redlibPermalink(block) ?? listingUrl,
      author: redlibAuthor(block),
      subreddit: redlibSubreddit(block) ?? subredditFromRedlibPath(listingUrl),
      isNsfw,
      createdAt: redlibCreatedAt(block) ?? new Date().toISOString(),
      media,
    });
  }

  return items;
}

async function fetchRedlibHtml(path: string, userAgent: string) {
  for (const origin of redlibOrigins()) {
    const url = new URL(origin);
    url.pathname = path;
    url.search = path.includes("?") ? path.slice(path.indexOf("?")) : "";
    if (path.includes("?")) {
      url.pathname = path.slice(0, path.indexOf("?"));
    }

    try {
      const response = await fetch(url.toString(), {
        cache: "no-store",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          Cookie: "show_nsfw=on; blur_nsfw=off",
          "User-Agent": userAgent,
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) continue;

      const html = await response.text();
      if (redlibLooksBlocked(html)) continue;
      return html;
    } catch {
      continue;
    }
  }

  return null;
}

function redlibPostPath(permalink: string) {
  try {
    const redditUrl = new URL(permalink);
    return redditUrl.pathname;
  } catch {
    return null;
  }
}

function redlibListingPath(listingUrl: string) {
  try {
    const redditUrl = new URL(listingUrl);
    const path = redditUrl.pathname.endsWith("/")
      ? redditUrl.pathname
      : `${redditUrl.pathname}/`;
    const search = redditUrl.search;
    return `${path}${search}`;
  } catch {
    return null;
  }
}

function redlibPreviewToRedditUrl(value: string) {
  try {
    const parsed = new URL(value, redlibOrigins()[0]);
    if (!parsed.pathname.startsWith("/preview/pre/")) return null;

    const mediaPath = parsed.pathname.replace(/^\/preview\/pre\//, "");
    if (!mediaPath) return null;

    return `https://i.redd.it/${mediaPath}`;
  } catch {
    return null;
  }
}

function redlibOrigins() {
  const configured = process.env.REDDIT_REDLIB_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...(configured ?? []), ...DEFAULT_REDLIB_ORIGINS])];
}

function redlibLooksBlocked(html: string) {
  return (
    /just a moment/i.test(html) ||
    /making sure you(?:'|&#39;)?re not a bot/i.test(html) ||
    /blocked by network security/i.test(html)
  );
}

function redlibTitle(html: string) {
  const titleHtml =
    html
      .match(
        /<h[12]\b[^>]*class=["'][^"']*\bpost_title\b[^"']*["'][^>]*>([\s\S]*?)<\/h[12]>/i,
      )?.[1]
      .replace(/<small\b[\s\S]*?<\/small>/gi, "") ?? "";

  return (
    textContent(titleHtml)
      ?.replace(/^\[[^\]]+\]\s*/u, "")
      .trim() ||
    htmlAttribute(
      html.match(/<meta\b(?=[^>]*\bproperty=["']og:title["'])[^>]*>/i)?.[0] ??
        "",
      "content",
    )
      ?.replace(/\s*-\s*r\/[^-]+$/u, "")
      .trim() ||
    undefined
  );
}

function redlibAuthor(html: string) {
  return html.match(/\/(?:user|u)\/([^"'/\s]+)/i)?.[1] ?? undefined;
}

function redlibSubreddit(html: string) {
  return html.match(/\/r\/([^"'/\s]+)/i)?.[1] ?? undefined;
}

function redlibCreatedAt(html: string) {
  const value = htmlAttribute(
    html.match(/<span\b(?=[^>]*\bcreated\b)[^>]*>/i)?.[0] ?? "",
    "title",
  );
  const timestamp = value
    ? Date.parse(`${value.replace(" UTC", "")} UTC`)
    : Number.NaN;

  return Number.isNaN(timestamp)
    ? undefined
    : new Date(timestamp).toISOString();
}

function redlibPermalink(html: string) {
  const href = htmlAttribute(
    html.match(/<a\b(?=[^>]*href=["'][^"']*\/comments\/)[^>]*>/i)?.[0] ?? "",
    "href",
  );
  if (!href) return undefined;

  try {
    return new URL(href, "https://www.reddit.com").toString();
  } catch {
    return undefined;
  }
}

function subredditFromRedlibPath(value: string) {
  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean);
    const subredditIndex = segments.indexOf("r");
    return subredditIndex === -1 ? undefined : segments[subredditIndex + 1];
  } catch {
    return undefined;
  }
}

function textContent(html: string) {
  return decodeHtml(
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function htmlAttribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  const value = match?.[2] ?? match?.[3] ?? match?.[4];

  return value ? decodeHtml(value) : null;
}

function numberAttribute(tag: string, name: string) {
  const value = htmlAttribute(tag, name);
  const number = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isFinite(number) ? number : undefined;
}

function decodeHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, codepoint: string) =>
      String.fromCodePoint(Number.parseInt(codepoint, 16)),
    )
    .replace(/&#(\d+);/g, (_match, codepoint: string) =>
      String.fromCodePoint(Number.parseInt(codepoint, 10)),
    )
    .replaceAll("&quot;", '"')
    .replaceAll("&#38;", "&")
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}
