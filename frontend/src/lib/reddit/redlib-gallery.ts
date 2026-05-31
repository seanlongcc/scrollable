import type { RuntimeMedia } from "@/lib/feed/types";

const DEFAULT_REDLIB_ORIGIN = "https://redlib.perennialte.ch";

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
  const url = redlibPostUrl(permalink);
  if (!url) return null;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": userAgent,
    },
  });
  if (!response.ok) return null;

  const html = await response.text();
  const media = redlibGalleryHtmlToMedia(html);

  return {
    author: redlibAuthor(html),
    createdAt: redlibCreatedAt(html),
    media,
    subreddit: redlibSubreddit(html),
    title: redlibTitle(html),
  };
}

export function redlibGalleryHtmlToMedia(html: string): RuntimeMedia[] {
  const media: RuntimeMedia[] = [];
  const seenUrls = new Set<string>();

  for (const match of html.matchAll(
    /<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>\s*<img\b[^>]*alt\s*=\s*["']Gallery image["'][^>]*>/gi,
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

  return media;
}

function redlibPostUrl(permalink: string) {
  try {
    const redditUrl = new URL(permalink);
    const redlibUrl = new URL(redlibOrigin());
    redlibUrl.pathname = redditUrl.pathname;
    redlibUrl.search = "";
    redlibUrl.hash = "";
    return redlibUrl.toString();
  } catch {
    return null;
  }
}

function redlibPreviewToRedditUrl(value: string) {
  try {
    const parsed = new URL(value, redlibOrigin());
    if (!parsed.pathname.startsWith("/preview/pre/")) return null;

    const mediaPath = parsed.pathname.replace(/^\/preview\/pre\//, "");
    if (!mediaPath) return null;

    const redditUrl = new URL(`https://preview.redd.it/${mediaPath}`);
    redditUrl.search = parsed.search;
    return redditUrl.toString();
  } catch {
    return null;
  }
}

function redlibOrigin() {
  return process.env.REDDIT_REDLIB_ORIGIN?.trim() || DEFAULT_REDLIB_ORIGIN;
}

function redlibTitle(html: string) {
  return (
    textContent(
      html.match(
        /<h1\b[^>]*class=["'][^"']*\bpost_title\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i,
      )?.[1] ?? "",
    )
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
  return html.match(/\/user\/([^"'/\s]+)/i)?.[1] ?? undefined;
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
