import type { RuntimeFeedItem, RuntimeMedia } from "@/lib/feed/types";
import { isRedditUrl } from "@/lib/url-source/resolver-routing";
import { extractYtDlpRuntimeItems } from "@/lib/url-source/ytdlp";
import { fetchRedditMediaEmbed, isRedditHostedVideoUrl } from "./mediaembed";
import { normalizeRedditListing } from "./normalization";
import {
  fetchOldRedditGalleryMedia,
  fetchOldRedditGalleryPost,
  isRedditGalleryUrl,
} from "./oldreddit-gallery";
import {
  fetchRedlibGalleryPost,
  fetchRedlibListingItems,
} from "./redlib-gallery";
import {
  normalizeRedditAtomFeed,
  type RedditRssMediaResolverInput,
} from "./rss";
import {
  parseRedditPostLinksInput,
  parseRedditSourceUrl,
  redditPublicJsonRequests,
  shouldTryNextRedditRequest,
  toRedditPostError,
  toRedditRssUrl,
  type ParsedRedditSourceUrl,
  type RedditPostLinksInput,
} from "./source";

export { parseRedditPostLinksInput } from "./source";
export type {
  ParsedRedditPostLinksInput,
  RedditPostLinksInput,
} from "./source";

type RedditRequest = {
  url: string;
  headers: Record<string, string>;
  parser: "json" | "rss";
};

export async function fetchRedditRuntimePostLinks(input: RedditPostLinksInput) {
  const parsed = parseRedditPostLinksInput(input);
  const items: RuntimeFeedItem[] = [];
  const unsupportedIds: string[] = [];

  for (const sourceUrl of parsed.urls) {
    const source = parseRedditSourceUrl(sourceUrl);
    const requests = redditJsonRequests(source, parsed.limit, parsed.allowNsfw);
    let sawOkResponse = false;
    let sourceHasItems = false;
    let lastRetryableStatus = 502;
    let lastUnsupportedIds: string[] = [];

    for (const request of requests) {
      const response = await fetch(request.url, {
        headers: {
          "User-Agent": getRedditUserAgent(),
          ...request.headers,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        lastRetryableStatus = response.status;
        if (shouldTryNextRedditRequest(response.status)) continue;
        throw toRedditPostError(response.status);
      }

      sawOkResponse = true;
      const normalized = await normalizeRedditResponse(
        response,
        request.parser,
        {
          subreddit: source.subreddit ?? "reddit",
          allowNsfw: parsed.allowNsfw,
          limit: parsed.limit,
        },
      );

      if (normalized.items.length > 0) {
        items.push(...normalized.items);
        unsupportedIds.push(...normalized.unsupportedIds);
        sourceHasItems = true;
        break;
      }

      lastUnsupportedIds = normalized.unsupportedIds;
    }

    if (!sourceHasItems) {
      const sourceFallbackItems = await redditSourceFallbackItems(source, {
        allowNsfw: parsed.allowNsfw,
        limit: parsed.limit,
      });
      if (sourceFallbackItems.length) {
        items.push(...sourceFallbackItems);
        continue;
      }

      if (!sawOkResponse) throw toRedditPostError(lastRetryableStatus);
      unsupportedIds.push(...lastUnsupportedIds);
    }
  }

  if (items.length === 0) {
    throw new Error("reddit_source_has_no_supported_media");
  }

  return { items, unsupportedIds };
}

function redditJsonRequests(
  source: ParsedRedditSourceUrl,
  limit: number,
  allowNsfw?: boolean,
): RedditRequest[] {
  return [
    ...redditPublicJsonRequests(source, limit).map((request) => ({
      url: redditRequestUrl(request.url, allowNsfw),
      headers: {},
      parser: "json" as const,
    })),
    {
      url: toRedditRssUrl(source, limit),
      headers: {},
      parser: "rss",
    },
  ];
}

function redditRequestUrl(url: string, allowNsfw?: boolean) {
  if (!allowNsfw) return url;

  const parsed = new URL(url);
  parsed.searchParams.set("include_over_18", "on");
  return parsed.toString();
}

async function normalizeRedditResponse(
  response: Response,
  parser: RedditRequest["parser"],
  options: {
    subreddit: string;
    allowNsfw?: boolean;
    limit?: number;
  },
) {
  if (parser === "rss") {
    return normalizeRedditAtomFeed(await response.text(), {
      ...options,
      resolveMedia: resolveRedditRssMedia,
    });
  }

  const payload = await response.json();
  const listing = Array.isArray(payload) ? payload[0] : payload;
  return normalizeRedditListing(listing, options);
}

async function redditSourceFallbackItems(
  source: ParsedRedditSourceUrl,
  options: {
    allowNsfw?: boolean;
    limit: number;
  },
): Promise<RuntimeFeedItem[]> {
  const oldRedditFallback = await oldRedditPostFallbackItem(source, {
    allowNsfw: options.allowNsfw,
  });
  if (oldRedditFallback) return [oldRedditFallback];

  if (source.kind !== "listing") return [];

  return fetchRedlibListingItems({
    allowNsfw: options.allowNsfw,
    limit: options.limit,
    listingUrl: source.url,
    userAgent: getRedditUserAgent(),
  });
}

async function oldRedditPostFallbackItem(
  source: ParsedRedditSourceUrl,
  options: {
    allowNsfw?: boolean;
  },
): Promise<RuntimeFeedItem | null> {
  if (source.kind !== "post") return null;

  const postId = redditPostIdFromUrl(source.url);
  if (!postId) return null;

  const oldRedditPost = await fetchOldRedditGalleryPost({
    allowNsfw: options.allowNsfw,
    permalink: source.url,
    postId,
    userAgent: getRedditUserAgent(),
  });
  const post = oldRedditPost?.media.length
    ? oldRedditPost
    : await fetchRedlibGalleryPost({
        permalink: source.url,
        userAgent: getRedditUserAgent(),
      });
  if (!post?.media.length) return null;

  return {
    id: `reddit:${postId}`,
    source: "reddit",
    title: post.title ?? titleFromRedditPostUrl(source.url),
    permalink: source.url,
    author: post.author,
    subreddit: post.subreddit ?? source.subreddit ?? "reddit",
    isNsfw: false,
    createdAt: post.createdAt ?? new Date().toISOString(),
    media: post.media,
  };
}

async function resolveRedditRssMedia({
  allowNsfw,
  permalink,
  postId,
  url,
}: RedditRssMediaResolverInput): Promise<RuntimeMedia[]> {
  if (postId && isRedditHostedVideoUrl(url)) {
    const media = await fetchRedditMediaEmbed(postId, {
      userAgent: getRedditUserAgent(),
    });

    return media ? [media] : [];
  }

  if (postId && isRedditGalleryUrl(url)) {
    const userAgent = getRedditUserAgent();
    const oldRedditMedia = await fetchOldRedditGalleryMedia({
      allowNsfw,
      permalink,
      postId,
      userAgent,
    });
    if (oldRedditMedia.length) return oldRedditMedia;

    if (!permalink) return [];
    const redlibPost = await fetchRedlibGalleryPost({
      permalink,
      userAgent,
    });

    return redlibPost?.media ?? [];
  }

  if (isRedditUrl(url)) return [];

  const items = await extractYtDlpRuntimeItems(url);

  return items.flatMap((item) => item.media);
}

function redditPostIdFromUrl(value: string) {
  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean);
    const commentsIndex = segments.indexOf("comments");
    return commentsIndex === -1 ? null : (segments[commentsIndex + 1] ?? null);
  } catch {
    return null;
  }
}

function titleFromRedditPostUrl(value: string) {
  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean);
    const commentsIndex = segments.indexOf("comments");
    const slug =
      commentsIndex === -1 ? "" : (segments[commentsIndex + 2] ?? "");
    return slug ? slug.replaceAll("_", " ") : "Reddit post";
  } catch {
    return "Reddit post";
  }
}

function getRedditUserAgent() {
  return (
    process.env.REDDIT_USER_AGENT ??
    "web:scrollable-feed:v0.1.0 (by /u/scrollable-app)"
  );
}
