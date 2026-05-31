import type { RuntimeFeedItem, RuntimeMedia } from "@/lib/feed/types";

export type NormalizeRedditAtomFeedOptions = {
  subreddit: string;
  allowNsfw?: boolean;
  limit?: number;
  resolveMedia?: (
    input: RedditRssMediaResolverInput,
  ) => Promise<RuntimeMedia[]>;
};

export type NormalizedRedditAtomFeed = {
  items: RuntimeFeedItem[];
  unsupportedIds: string[];
};

export type RedditRssMediaResolverInput = {
  url: string;
  postId: string | null;
  permalink: string | null;
  allowNsfw?: boolean;
};

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

export async function normalizeRedditAtomFeed(
  feed: string,
  options: NormalizeRedditAtomFeedOptions,
): Promise<NormalizedRedditAtomFeed> {
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const entries = Array.from(
    feed.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi),
  );
  const unsupportedIds: string[] = [];
  const items: RuntimeFeedItem[] = [];

  for (const entry of entries) {
    if (items.length >= limit) break;

    const entryXml = entry[1] ?? "";
    const title = textContent(entryXml, "title") ?? "Untitled Reddit post";
    const permalink = entryPermalink(entryXml);
    const id = redditPostId(entryXml, permalink);
    const media = await mediaFromEntry(entryXml, {
      allowNsfw: options.allowNsfw,
      permalink,
      postId: id,
      resolveMedia: options.resolveMedia,
    });

    if (media.length === 0) {
      if (id) unsupportedIds.push(id);
      continue;
    }

    items.push({
      id: `reddit:${id ?? crypto.randomUUID()}`,
      source: "reddit",
      title,
      permalink: permalink ?? undefined,
      author: authorFromEntry(entryXml),
      subreddit: entrySubreddit(entryXml) ?? options.subreddit,
      isNsfw: /\bnsfw\b/i.test(title),
      createdAt: dateFromEntry(entryXml),
      media,
    });
  }

  return {
    items:
      options.allowNsfw === false
        ? items.filter((item) => !item.isNsfw)
        : items,
    unsupportedIds,
  };
}

async function mediaFromEntry(
  entryXml: string,
  options: {
    allowNsfw?: boolean;
    postId: string | null;
    permalink: string | null;
    resolveMedia?: NormalizeRedditAtomFeedOptions["resolveMedia"];
  },
): Promise<RuntimeMedia[]> {
  const content = textContent(entryXml, "content") ?? "";
  const linkUrl = linkUrlFromContent(content);
  const thumbnail = thumbnailUrl(entryXml);
  const thumbnailMedia = thumbnail ? mediaFromUrl(thumbnail) : null;
  const linkMedia = linkUrl ? mediaFromUrl(linkUrl) : null;
  if (linkMedia) return [linkMedia];

  if (linkUrl && options.resolveMedia) {
    try {
      const resolved = await options.resolveMedia({
        allowNsfw: options.allowNsfw,
        url: linkUrl,
        postId: options.postId,
        permalink: options.permalink,
      });
      if (resolved.length) return resolved;
    } catch {
      // Leave this RSS entry unsupported and let the caller continue.
    }
  }

  if (linkUrl) {
    return isRedditGalleryUrl(linkUrl) && thumbnailMedia
      ? [thumbnailMedia]
      : [];
  }

  return thumbnailMedia ? [thumbnailMedia] : [];
}

function isRedditGalleryUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      /^(.+\.)?reddit\.com$/i.test(url.hostname) &&
      /^\/gallery\/[^/]+\/?$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function linkUrlFromContent(content: string) {
  const match = content.match(
    /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>\s*\[link\]\s*<\/a>/i,
  );

  return match?.[1] ? decodeXmlEntities(match[1]) : null;
}

function thumbnailUrl(entryXml: string) {
  const match = entryXml.match(/<media:thumbnail\b[^>]*>/i);
  return match?.[0] ? xmlAttribute(match[0], "url") : null;
}

function mediaFromUrl(value: string): RuntimeMedia | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const pathname = url.pathname.toLowerCase();
  const extension = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]
    .sort((first, second) => second.length - first.length)
    .find((candidate) => pathname.endsWith(candidate));

  if (!extension) return null;
  if (IMAGE_EXTENSIONS.has(extension)) {
    return { type: "image", url: url.toString() };
  }

  return {
    type: "video",
    url: url.toString(),
    isHls: extension === ".m3u8",
  };
}

function entryPermalink(entryXml: string) {
  const linkTags = Array.from(entryXml.matchAll(/<link\b[^>]*>/gi)).map(
    (match) => match[0],
  );

  return (
    linkTags
      .map((tag) => xmlAttribute(tag, "href"))
      .find((href) => href?.includes("/comments/")) ?? null
  );
}

function redditPostId(entryXml: string, permalink: string | null) {
  const permalinkId = permalink?.match(/\/comments\/([^/]+)/i)?.[1];
  if (permalinkId) return permalinkId;

  const feedId = textContent(entryXml, "id");
  return feedId?.replace(/^t3_/i, "") ?? null;
}

function authorFromEntry(entryXml: string) {
  return textContent(entryXml, "name")?.replace(/^\/u\//i, "");
}

function entrySubreddit(entryXml: string) {
  const category = entryXml.match(/<category\b[^>]*>/i)?.[0];
  return category ? xmlAttribute(category, "term") : null;
}

function dateFromEntry(entryXml: string) {
  const value =
    textContent(entryXml, "updated") ?? textContent(entryXml, "published");
  const timestamp = value ? Date.parse(value) : Number.NaN;

  return Number.isNaN(timestamp)
    ? new Date().toISOString()
    : new Date(timestamp).toISOString();
}

function textContent(value: string, tagName: string) {
  const match = value.match(
    new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"),
  );

  return match?.[1] ? decodeXmlEntities(match[1]).trim() : null;
}

function xmlAttribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  const value = match?.[2] ?? match?.[3] ?? match?.[4];

  return value ? decodeXmlEntities(value) : null;
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, codepoint: string) =>
      String.fromCodePoint(Number.parseInt(codepoint, 16)),
    )
    .replace(/&#(\d+);/g, (_match, codepoint: string) =>
      String.fromCodePoint(Number.parseInt(codepoint, 10)),
    )
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}
