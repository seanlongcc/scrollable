import type { RuntimeFeedItem } from "@/lib/feed/types";
import { parseRedditPostLinksInput } from "@/lib/reddit/source";
import { fetchBrowserRedditRuntimePostItems } from "./browser-reddit-runtime";

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

type BrowserFallbackOutcome =
  | {
      source: "browser";
      status: "success";
      items: RuntimeFeedItem[];
    }
  | {
      source: "browser";
      status: "error";
      error: unknown;
    };

const BROWSER_REDDIT_FALLBACK_RACE_DELAY_MS = 750;

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
  if (!canUseBrowserRedditFallback()) {
    return resolveApiOutcome(
      await fetchRedditRuntimePostItemsFromApiOnly({ url, allowNsfw, limit }),
      () =>
        fetchBrowserRedditRuntimePostItems({
          url,
          allowNsfw,
          limit,
        }),
    );
  }

  const apiOutcome = fetchRedditRuntimePostItemsFromApiOnly({
    url,
    allowNsfw,
    limit,
  });
  let browserFallback: Promise<RuntimeFeedItem[]> | undefined;
  const startBrowserFallback = () => {
    browserFallback ??= fetchBrowserRedditRuntimePostItems({
      url,
      allowNsfw,
      limit,
    });
    return browserFallback;
  };
  const browserOutcome = delayedBrowserFallbackOutcome({
    apiOutcome,
    startBrowserFallback,
  });

  const firstOutcome = await Promise.race([apiOutcome, browserOutcome]);
  if (firstOutcome.status === "success") return firstOutcome.items;

  if (firstOutcome.source === "browser") {
    return resolveApiOutcome(await apiOutcome, startBrowserFallback);
  }

  return resolveApiOutcome(firstOutcome, startBrowserFallback);
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

  return { source: "api", status: "success", items: payload.items };
}

async function resolveApiOutcome(
  outcome: RedditApiOutcome,
  startBrowserFallback: () => Promise<RuntimeFeedItem[]>,
) {
  if (outcome.status === "success") return outcome.items;
  if (shouldTryBrowserRedditFallback(outcome.error)) {
    return startBrowserFallback();
  }

  throw new Error(outcome.error);
}

function delayedBrowserFallbackOutcome({
  apiOutcome,
  startBrowserFallback,
}: {
  apiOutcome: Promise<RedditApiOutcome>;
  startBrowserFallback: () => Promise<RuntimeFeedItem[]>;
}): Promise<BrowserFallbackOutcome> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      void startBrowserFallback().then(
        (items) => resolve({ source: "browser", status: "success", items }),
        (error: unknown) =>
          resolve({ source: "browser", status: "error", error }),
      );
    }, BROWSER_REDDIT_FALLBACK_RACE_DELAY_MS);

    void apiOutcome.then((outcome) => {
      if (
        outcome.status === "success" ||
        !shouldTryBrowserRedditFallback(outcome.error)
      ) {
        window.clearTimeout(timeout);
      }
    });
  });
}

function canUseBrowserRedditFallback() {
  return typeof window !== "undefined" && Boolean(window.document);
}

function shouldTryBrowserRedditFallback(error: string) {
  return (
    error === "reddit_fetch_forbidden" ||
    error === "reddit_rate_limited" ||
    error === "reddit_source_fetch_failed" ||
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
