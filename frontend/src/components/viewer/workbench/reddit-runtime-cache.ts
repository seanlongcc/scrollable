import type { RuntimeFeedItem } from "@/lib/feed/types";
import { parseRedditPostLinksInput } from "@/lib/reddit/source";

export type RedditRuntimePostCache = Map<string, Promise<RuntimeFeedItem[]>>;

type RedditListingApiPayload = {
  items?: RuntimeFeedItem[];
  error?: string;
};

type RedditApiOutcome =
  | {
      source: "api";
      status: "success";
      items: RuntimeFeedItem[];
    }
  | {
      source: "api";
      status: "error";
      error: string;
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
  return resolveApiOutcome(
    await fetchRedditRuntimePostItemsFromApiOnly({ url, allowNsfw, limit }),
  );
}

async function fetchRedditRuntimePostItemsFromApiOnly({
  url,
  allowNsfw,
  limit,
}: {
  url: string;
  allowNsfw: boolean;
  limit: number;
}): Promise<RedditApiOutcome> {
  const params = new URLSearchParams({
    urls: url,
    allowNsfw: String(allowNsfw),
    limit: String(limit),
  });
  let response: Response;

  try {
    response = await fetch(`/api/reddit/listing?${params}`, {
      cache: "no-store",
    });
  } catch {
    return {
      source: "api",
      status: "error",
      error: "reddit_source_fetch_failed",
    };
  }

  const payload = (await response
    .json()
    .catch(() => ({}))) as RedditListingApiPayload;

  if (!response.ok) {
    return {
      source: "api",
      status: "error",
      error: payload.error ?? "reddit_source_fetch_failed",
    };
  }

  if (!Array.isArray(payload.items)) {
    return {
      source: "api",
      status: "error",
      error: "reddit_source_fetch_failed",
    };
  }

  return {
    source: "api",
    status: "success",
    items: payload.items,
  };
}

async function resolveApiOutcome(outcome: RedditApiOutcome) {
  if (outcome.status === "success") {
    return outcome.items;
  }

  throw new Error(outcome.error);
}

function cloneRuntimeItems(items: RuntimeFeedItem[]) {
  return items.map((item) => ({
    ...item,
    media: item.media.map((media) => ({ ...media })),
  }));
}
