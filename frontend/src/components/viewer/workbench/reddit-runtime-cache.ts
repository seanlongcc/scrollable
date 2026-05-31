import type { RuntimeFeedItem } from "@/lib/feed/types";
import { parseRedditPostLinksInput } from "@/lib/reddit/source";
import { fetchBrowserRedditRuntimePostItems } from "./browser-reddit-runtime";

export type RedditRuntimePostCache = Map<string, Promise<RuntimeFeedItem[]>>;

type RedditListingApiPayload = {
  items?: RuntimeFeedItem[];
  error?: string;
};

export function createRedditRuntimePostCache(): RedditRuntimePostCache {
  return new Map();
}

export async function fetchRedditRuntimePostItems({
  urls,
  allowNsfw,
  limit,
  cache = createRedditRuntimePostCache(),
}: {
  urls: string[];
  allowNsfw: boolean;
  limit?: number;
  cache?: RedditRuntimePostCache;
}) {
  const itemSets = await Promise.all(
    urls.map((url) =>
      fetchSingleRedditRuntimePostItems({
        url,
        allowNsfw,
        limit,
        cache,
      }),
    ),
  );

  return itemSets.flatMap(cloneRuntimeItems);
}

async function fetchSingleRedditRuntimePostItems({
  url,
  allowNsfw,
  limit,
  cache,
}: {
  url: string;
  allowNsfw: boolean;
  limit?: number;
  cache: RedditRuntimePostCache;
}) {
  const parsed = parseRedditPostLinksInput({
    urls: url,
    allowNsfw,
    ...(limit === undefined ? {} : { limit }),
  });
  const canonicalUrl = parsed.urls[0]!;
  const cacheKey = JSON.stringify([
    canonicalUrl,
    parsed.allowNsfw,
    parsed.limit,
  ]);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const request = fetchRedditRuntimePostItemsFromApi({
    url: canonicalUrl,
    allowNsfw: parsed.allowNsfw,
    limit: parsed.limit,
  });
  cache.set(cacheKey, request);

  return request;
}

async function fetchRedditRuntimePostItemsFromApi({
  url,
  allowNsfw,
  limit,
}: {
  url: string;
  allowNsfw: boolean;
  limit: number;
}) {
  const params = new URLSearchParams({
    urls: url,
    allowNsfw: String(allowNsfw),
    limit: String(limit),
  });
  const response = await fetch(`/api/reddit/listing?${params}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as RedditListingApiPayload;

  if (!response.ok) {
    const error = payload.error ?? "reddit_source_fetch_failed";
    if (shouldTryBrowserRedditFallback(error)) {
      return fetchBrowserRedditRuntimePostItems({
        url,
        allowNsfw,
        limit,
      });
    }

    throw new Error(error);
  }

  if (!Array.isArray(payload.items)) {
    throw new Error("reddit_source_fetch_failed");
  }

  return payload.items;
}

function shouldTryBrowserRedditFallback(error: string) {
  return (
    error === "reddit_fetch_forbidden" ||
    error === "reddit_rate_limited" ||
    error === "reddit_source_has_no_supported_media" ||
    error.startsWith("reddit_post_fetch_failed_")
  );
}

function cloneRuntimeItems(items: RuntimeFeedItem[]) {
  return items.map((item) => ({
    ...item,
    media: item.media.map((media) => ({ ...media })),
  }));
}
