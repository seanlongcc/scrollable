import type { RuntimeFeedItem, RuntimeMedia } from "@/lib/feed/types";
import { mapWithConcurrency } from "./runtime-request-scheduler";

const DEFAULT_REDLIB_ORIGINS = [
  "https://redlib.perennialte.ch",
  "https://redlib.catsarch.com",
  "https://redlib.r4fo.com",
  "https://red.artemislena.eu",
  "https://redlib.cow.rip",
  "https://redlib.privacyredirect.com",
  "https://redlib.nadeko.net",
  "https://redlib.orangenet.cc",
  "https://redlib.privadency.com",
];
const REDLIB_REQUEST_TIMEOUT_MS = 10000;
const REDLIB_LISTING_MAX_LIMIT = 50;
const REDLIB_LISTING_MEDIA_RESOLVE_CONCURRENCY = 4;

export type RedlibGalleryPost = {
  author?: string;
  createdAt?: string;
  media: RuntimeMedia[];
  subreddit?: string;
  title?: string;
};

export type RedlibListingMediaResolverInput = {
  permalink: string;
};

export type RedlibListingMediaResolver = (
  input: RedlibListingMediaResolverInput,
) => Promise<RuntimeMedia[]>;

type RedlibHtmlRequest = {
  abort: () => void;
  promise: Promise<string | null>;
};

type RedlibHtmlValidator = (html: string) => boolean;

export async function fetchRedlibGalleryPost({
  permalink,
  userAgent,
}: {
  permalink: string;
  userAgent: string;
}): Promise<RedlibGalleryPost | null> {
  const path = redlibPostPath(permalink);
  if (!path) return null;

  const html = await fetchRedlibHtml(
    path,
    userAgent,
    redlibPostHtmlLooksUsable,
  );
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
  const path = redlibListingPath(listingUrl, limit);
  if (!path) return [];

  return fetchRedlibListingItemsFromOrigins({
    allowNsfw,
    limit,
    listingUrl,
    path,
    userAgent,
  });
}

export function redlibGalleryHtmlToMedia(html: string): RuntimeMedia[] {
  const media: RuntimeMedia[] = [];
  const seenUrls = new Set<string>();

  for (const match of html.matchAll(
    /<a\b(?=[^>]*(?:\bpost_media_image\b|href\s*=\s*["']\/(?:preview\/pre|img)\/))[^>]*href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>[\s\S]*?<img\b[^>]*(?:alt\s*=\s*["'](?:Gallery image|Post image)["'][^>]*)?>/gi,
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

export async function redlibListingHtmlToItems(
  html: string,
  {
    allowNsfw,
    limit,
    listingUrl,
    resolveMedia,
  }: {
    allowNsfw?: boolean;
    limit: number;
    listingUrl: string;
    resolveMedia?: RedlibListingMediaResolver;
  },
): Promise<RuntimeFeedItem[]> {
  const matches = Array.from(
    html.matchAll(
      /<div\b[^>]*class=["'][^"']*\bpost\b[^"']*["'][^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)(?=<hr\b[^>]*class=["'][^"']*\bsep\b|<\/main>|<footer|$)/gi,
    ),
  ).map((match) => ({
    block: match[2] ?? "",
    postId: match[1],
  }));

  const resolvedItems = await mapWithConcurrency(
    matches,
    REDLIB_LISTING_MEDIA_RESOLVE_CONCURRENCY,
    ({ block, postId }) =>
      redlibListingItemFromBlock({
        allowNsfw,
        block,
        listingUrl,
        postId,
        resolveMedia,
      }),
  );

  return resolvedItems
    .filter((item): item is RuntimeFeedItem => Boolean(item))
    .slice(0, limit);
}

async function redlibListingItemFromBlock({
  allowNsfw,
  block,
  listingUrl,
  postId,
  resolveMedia,
}: {
  allowNsfw?: boolean;
  block: string;
  listingUrl: string;
  postId: string | undefined;
  resolveMedia?: RedlibListingMediaResolver;
}): Promise<RuntimeFeedItem | null> {
  const isNsfw = /\bclass=["'][^"']*\bnsfw\b/i.test(block);
  if (!postId || (isNsfw && allowNsfw === false)) return null;

  const permalink = redlibPermalink(block) ?? listingUrl;
  const media = await redlibListingMedia(block, {
    permalink,
    resolveMedia,
  });
  if (!media.length) return null;

  return {
    id: `reddit:${postId}`,
    source: "reddit",
    title: redlibTitle(block) ?? "Untitled Reddit post",
    permalink,
    author: redlibAuthor(block),
    subreddit: redlibSubreddit(block) ?? subredditFromRedlibPath(listingUrl),
    isNsfw,
    createdAt: redlibCreatedAt(block) ?? new Date().toISOString(),
    media,
  };
}

async function redlibListingMedia(
  block: string,
  {
    permalink,
    resolveMedia,
  }: {
    permalink: string;
    resolveMedia?: RedlibListingMediaResolver;
  },
) {
  const media = redlibGalleryHtmlToMedia(block);
  if (media.length) return media;

  if (!resolveMedia || !redlibListingBlockLooksLikeGallery(block)) return [];

  try {
    return await resolveMedia({ permalink });
  } catch {
    return [];
  }
}

async function fetchRedlibHtml(
  path: string,
  userAgent: string,
  isUsable: RedlibHtmlValidator,
) {
  const pendingRequests = startRedlibHtmlRequests(path, userAgent, isUsable);

  while (pendingRequests.size) {
    const html = await settleNextRedlibHtmlRequest(pendingRequests);

    if (html) {
      abortRedlibHtmlRequests(pendingRequests);
      return html;
    }
  }

  return null;
}

async function fetchRedlibListingItemsFromOrigins({
  allowNsfw,
  limit,
  listingUrl,
  path,
  userAgent,
}: {
  allowNsfw?: boolean;
  limit: number;
  listingUrl: string;
  path: string;
  userAgent: string;
}) {
  const pendingRequests = startRedlibHtmlRequests(
    path,
    userAgent,
    redlibListingHtmlLooksUsable,
  );
  const resolveMedia = redlibListingMediaResolver(userAgent);
  let bestItems: RuntimeFeedItem[] = [];

  while (pendingRequests.size) {
    const html = await settleNextRedlibHtmlRequest(pendingRequests);
    if (!html) continue;

    const items = await redlibListingHtmlToItems(html, {
      allowNsfw,
      limit,
      listingUrl,
      resolveMedia,
    });

    if (items.length >= limit) {
      abortRedlibHtmlRequests(pendingRequests);
      return items.slice(0, limit);
    }

    if (items.length > bestItems.length) {
      bestItems = items;
    }
  }

  return bestItems.slice(0, limit);
}

function redlibListingMediaResolver(
  userAgent: string,
): RedlibListingMediaResolver {
  return async ({ permalink }) =>
    (
      await fetchRedlibGalleryPost({
        permalink,
        userAgent,
      })
    )?.media ?? [];
}

function startRedlibHtmlRequests(
  path: string,
  userAgent: string,
  isUsable: RedlibHtmlValidator,
) {
  return new Set(
    redlibOrigins().map((origin) =>
      startRedlibHtmlRequest(origin, path, userAgent, isUsable),
    ),
  );
}

async function settleNextRedlibHtmlRequest(
  pendingRequests: Set<RedlibHtmlRequest>,
) {
  const { html, request } = await Promise.race(
    [...pendingRequests].map(async (pendingRequest) => ({
      html: await pendingRequest.promise,
      request: pendingRequest,
    })),
  );
  pendingRequests.delete(request);

  return html;
}

function abortRedlibHtmlRequests(pendingRequests: Set<RedlibHtmlRequest>) {
  for (const pendingRequest of pendingRequests) {
    pendingRequest.abort();
  }
  pendingRequests.clear();
}

function startRedlibHtmlRequest(
  origin: string,
  path: string,
  userAgent: string,
  isUsable: RedlibHtmlValidator,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REDLIB_REQUEST_TIMEOUT_MS);
  const abort = () => {
    clearTimeout(timeout);
    controller.abort();
  };
  const promise = Promise.resolve()
    .then(() =>
      fetch(redlibUrl(origin, path), {
        cache: "no-store",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          Cookie: "show_nsfw=on; blur_nsfw=off",
          "User-Agent": userAgent,
        },
        signal: controller.signal,
      }),
    )
    .then(async (response) => {
      if (!response.ok) return null;

      const html = await response.text();
      return redlibLooksBlocked(html) || !isUsable(html) ? null : html;
    })
    .catch(() => null)
    .finally(() => {
      clearTimeout(timeout);
    });

  return { abort, promise };
}

function redlibUrl(origin: string, path: string) {
  const url = new URL(origin);
  url.pathname = path;
  url.search = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  if (path.includes("?")) {
    url.pathname = path.slice(0, path.indexOf("?"));
  }

  return url.toString();
}

function redlibPostPath(permalink: string) {
  try {
    const redditUrl = new URL(permalink);
    return redditUrl.pathname;
  } catch {
    return null;
  }
}

function redlibListingPath(listingUrl: string, limit: number) {
  try {
    const redditUrl = new URL(listingUrl);
    const path = redditUrl.pathname.endsWith("/")
      ? redditUrl.pathname
      : `${redditUrl.pathname}/`;
    redditUrl.searchParams.set(
      "limit",
      String(Math.min(limit, REDLIB_LISTING_MAX_LIMIT)),
    );
    const search = redditUrl.search;
    return `${path}${search}`;
  } catch {
    return null;
  }
}

function redlibPreviewToRedditUrl(value: string) {
  try {
    const parsed = new URL(value, redlibOrigins()[0]);
    if (parsed.pathname.startsWith("/img/")) {
      const mediaPath = parsed.pathname.replace(/^\/img\//, "");
      return mediaPath ? `https://i.redd.it/${mediaPath}` : null;
    }

    if (!parsed.pathname.startsWith("/preview/pre/")) return null;

    const mediaPath = parsed.pathname.replace(/^\/preview\/pre\//, "");
    if (!mediaPath) return null;

    return `https://i.redd.it/${mediaPath}`;
  } catch {
    return null;
  }
}

function redlibListingBlockLooksLikeGallery(block: string) {
  return (
    /<span\b[^>]*>\s*gallery\s*<\/span>/i.test(block) ||
    /post_type:\s*gallery/i.test(block)
  );
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

function redlibListingHtmlLooksUsable(html: string) {
  return (
    /<div\b[^>]*id=["']posts["'][^>]*>/i.test(html) &&
    /<div\b[^>]*class=["'][^"']*\bpost\b[^"']*["'][^>]*>/i.test(html)
  );
}

function redlibPostHtmlLooksUsable(html: string) {
  return (
    /<h[12]\b[^>]*class=["'][^"']*\bpost_title\b[^"']*["'][^>]*>/i.test(html) ||
    /<div\b[^>]*class=["'][^"']*\bgallery\b[^"']*["'][^>]*>/i.test(html) ||
    /<video\b/i.test(html)
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
