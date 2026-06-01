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
import { fetchOldRedditListingItems } from "./oldreddit-listing";
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
  toOldRedditRssUrl,
  toRedditPostError,
  toRedditRssUrl,
  type ParsedRedditSourceUrl,
  type RedditPostLinksInput,
} from "./source";
import {
  fetchFirstSupportedRedditResponse,
  mapWithConcurrency,
  type RedditRuntimeRequest,
} from "./runtime-request-scheduler";

export { parseRedditPostLinksInput } from "./source";
export type {
  ParsedRedditPostLinksInput,
  RedditPostLinksInput,
} from "./source";

const REDDIT_SOURCE_FETCH_CONCURRENCY = 4;

export async function fetchRedditRuntimePostLinks(input: RedditPostLinksInput) {
  const parsed = parseRedditPostLinksInput(input);
  const sourceResults = await mapWithConcurrency(
    parsed.urls,
    REDDIT_SOURCE_FETCH_CONCURRENCY,
    (sourceUrl) =>
      fetchRedditRuntimeSource(sourceUrl, {
        allowNsfw: parsed.allowNsfw,
        limit: parsed.limit,
      }),
  );
  const items = sourceResults.flatMap((result) => result.items);
  const unsupportedIds = sourceResults.flatMap(
    (result) => result.unsupportedIds,
  );

  if (items.length === 0) {
    throw new Error("reddit_source_has_no_supported_media");
  }

  return { items, unsupportedIds };
}

async function fetchRedditRuntimeSource(
  sourceUrl: string,
  options: {
    allowNsfw?: boolean;
    limit: number;
  },
) {
  const source = parseRedditSourceUrl(sourceUrl);
  let sawOkResponse = false;
  let lastRetryableStatus = 502;
  let lastUnsupportedIds: string[] = [];

  for (const requests of redditRequestGroups(
    source,
    options.limit,
    options.allowNsfw,
  )) {
    const result = await fetchFirstSupportedRedditResponse(requests, {
      allowNsfw: options.allowNsfw,
      limit: options.limit,
      normalizeResponse: normalizeRedditResponse,
      subreddit: source.subreddit ?? "reddit",
      userAgent: getRedditUserAgent(),
    });

    if (result.status === "supported") {
      return {
        items: result.normalized.items,
        unsupportedIds: result.normalized.unsupportedIds,
      };
    }

    sawOkResponse ||= result.sawOkResponse;
    lastRetryableStatus = result.lastRetryableStatus;
    if (result.lastUnsupportedIds.length) {
      lastUnsupportedIds = result.lastUnsupportedIds;
    }
    if (result.fatalError) throw result.fatalError;
  }

  const sourceFallbackItems = await redditSourceFallbackItems(source, {
    allowNsfw: options.allowNsfw,
    limit: options.limit,
  });
  if (sourceFallbackItems.length) {
    return {
      items: sourceFallbackItems,
      unsupportedIds: [],
    };
  }

  if (!sawOkResponse) throw toRedditPostError(lastRetryableStatus);

  return {
    items: [],
    unsupportedIds: lastUnsupportedIds,
  };
}

function redditRequestGroups(
  source: ParsedRedditSourceUrl,
  limit: number,
  allowNsfw?: boolean,
): RedditRuntimeRequest[][] {
  return [
    redditPublicJsonRequests(source, limit).map((request) => ({
      url: redditRequestUrl(request.url, allowNsfw),
      headers: {},
      parser: "json" as const,
    })),
    [
      {
        url: toRedditRssUrl(source, limit),
        headers: {},
        parser: "rss",
      },
      {
        url: toOldRedditRssUrl(source, limit),
        headers: {},
        parser: "rss",
      },
    ],
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
  parser: RedditRuntimeRequest["parser"],
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

  const oldRedditListingItems = await fetchOldRedditListingItems({
    allowNsfw: options.allowNsfw,
    limit: options.limit,
    listingUrl: source.url,
    resolveMedia: resolveRedditRssMedia,
    userAgent: getRedditUserAgent(),
  });
  if (oldRedditListingItems.length) return oldRedditListingItems;

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
