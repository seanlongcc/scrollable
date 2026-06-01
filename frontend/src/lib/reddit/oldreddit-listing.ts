import type { RuntimeFeedItem, RuntimeMedia } from "@/lib/feed/types";
import { oldRedditGalleryHtmlToMedia } from "./oldreddit-gallery";

export type OldRedditListingMediaResolverInput = {
  url: string;
  postId: string | null;
  permalink: string | null;
  allowNsfw?: boolean;
};

export type OldRedditListingMediaResolver = (
  input: OldRedditListingMediaResolverInput,
) => Promise<RuntimeMedia[]>;

const IMAGE_EXTENSIONS = new Set([
  ".apng",
  ".avif",
  ".gif",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);
const VIDEO_EXTENSIONS = new Set([".m3u8", ".m4v", ".mov", ".mp4", ".webm"]);

export async function fetchOldRedditListingItems({
  allowNsfw,
  limit,
  listingUrl,
  resolveMedia,
  userAgent,
}: {
  allowNsfw?: boolean;
  limit: number;
  listingUrl: string;
  resolveMedia?: OldRedditListingMediaResolver;
  userAgent: string;
}): Promise<RuntimeFeedItem[]> {
  const url = oldRedditListingUrl(listingUrl, limit);
  if (!url) return [];

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        ...(allowNsfw ? { Cookie: "over18=1" } : {}),
        "User-Agent": userAgent,
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return [];

    return oldRedditListingHtmlToItems(await response.text(), {
      allowNsfw,
      limit,
      listingUrl,
      resolveMedia,
    });
  } catch {
    return [];
  }
}

export async function oldRedditListingHtmlToItems(
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
    resolveMedia?: OldRedditListingMediaResolver;
  },
): Promise<RuntimeFeedItem[]> {
  const items: RuntimeFeedItem[] = [];

  for (const match of html.matchAll(
    /<div\b(?=[^>]*\bthing\b)(?=[^>]*\bdata-fullname=["']t3_[^"']+["'])([^>]*)>([\s\S]*?)(?=<div\b(?=[^>]*\bthing\b)(?=[^>]*\bdata-fullname=["']t3_)|<div\b[^>]*class=["'][^"']*\bnav-buttons\b|$)/gi,
  )) {
    if (items.length >= limit) break;

    const openingTag = `<div ${match[1] ?? ""}>`;
    const block = match[2] ?? "";
    const id = postIdFromFullname(htmlAttribute(openingTag, "data-fullname"));
    const url = htmlAttribute(openingTag, "data-url");
    const permalink = oldRedditPermalink(
      htmlAttribute(openingTag, "data-permalink"),
      listingUrl,
    );
    const isNsfw = htmlAttribute(openingTag, "data-nsfw") === "true";
    if (!id || (isNsfw && allowNsfw === false)) continue;

    const media = await oldRedditListingMedia(block, {
      allowNsfw,
      permalink,
      postId: id,
      resolveMedia,
      url,
    });
    if (!media.length) continue;

    items.push({
      id: `reddit:${id}`,
      source: "reddit",
      title: oldRedditListingTitle(block) ?? "Untitled Reddit post",
      permalink,
      author: htmlAttribute(openingTag, "data-author") ?? undefined,
      subreddit:
        htmlAttribute(openingTag, "data-subreddit") ??
        subredditFromListingUrl(listingUrl),
      isNsfw,
      createdAt:
        timestampToIso(htmlAttribute(openingTag, "data-timestamp")) ??
        new Date().toISOString(),
      media,
    });
  }

  return items;
}

async function oldRedditListingMedia(
  block: string,
  {
    allowNsfw,
    permalink,
    postId,
    resolveMedia,
    url,
  }: {
    allowNsfw?: boolean;
    permalink?: string;
    postId: string;
    resolveMedia?: OldRedditListingMediaResolver;
    url: string | null;
  },
) {
  const galleryMedia = oldRedditGalleryHtmlToMedia(block);
  if (galleryMedia.length) return galleryMedia;

  const directMedia = url ? mediaFromUrl(url) : null;
  if (directMedia) return [directMedia];

  if (!url || !resolveMedia) return [];

  return resolveMedia({
    allowNsfw,
    permalink: permalink ?? null,
    postId,
    url,
  });
}

function oldRedditListingUrl(listingUrl: string, limit: number) {
  try {
    const url = new URL(listingUrl);
    url.protocol = "https:";
    url.hostname = "old.reddit.com";
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    url.searchParams.set("limit", String(limit));
    return url.toString();
  } catch {
    return null;
  }
}

function oldRedditListingTitle(block: string) {
  const titleLink =
    block.match(
      /<a\b(?=[^>]*\btitle\b)(?=[^>]*\bdata-event-action="title")[^>]*>[\s\S]*?<\/a>/i,
    )?.[0] ??
    block.match(/<a\b(?=[^>]*\btitle\b)[^>]*>[\s\S]*?<\/a>/i)?.[0] ??
    "";

  return textContent(titleLink) || undefined;
}

function oldRedditPermalink(value: string | null, listingUrl: string) {
  if (!value) return undefined;

  try {
    return new URL(value, "https://www.reddit.com").toString();
  } catch {
    return listingUrl;
  }
}

function mediaFromUrl(value: string): RuntimeMedia | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const pathname = url.pathname.toLowerCase();
  const imageExtension = [...IMAGE_EXTENSIONS]
    .sort((first, second) => second.length - first.length)
    .find((candidate) => pathname.endsWith(candidate));
  if (imageExtension) {
    return {
      type: "image",
      url: url.toString(),
    };
  }

  const videoExtension = [...VIDEO_EXTENSIONS]
    .sort((first, second) => second.length - first.length)
    .find((candidate) => pathname.endsWith(candidate));
  if (!videoExtension) return null;

  return {
    type: "video",
    url: url.toString(),
    isHls: videoExtension === ".m3u8",
  };
}

function postIdFromFullname(value: string | null) {
  return value?.replace(/^t3_/i, "") || null;
}

function subredditFromListingUrl(value: string) {
  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean);
    const subredditIndex = segments.indexOf("r");
    return subredditIndex === -1
      ? "reddit"
      : (segments[subredditIndex + 1] ?? "reddit");
  } catch {
    return "reddit";
  }
}

function timestampToIso(value: string | null) {
  const timestamp = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : undefined;
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
    .replaceAll("&#32;", " ")
    .replaceAll("&#38;", "&")
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}
