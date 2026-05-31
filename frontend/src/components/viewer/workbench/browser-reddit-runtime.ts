import type { RuntimeFeedItem } from "@/lib/feed/types";
import { normalizeRedditListing } from "@/lib/reddit/normalization";
import {
  parseRedditSourceUrl,
  redditPublicJsonRequests,
} from "@/lib/reddit/source";

type RedditJsonpPayload = unknown;

export async function fetchBrowserRedditRuntimePostItems({
  allowNsfw,
  limit,
  url,
}: {
  allowNsfw: boolean;
  limit: number;
  url: string;
}): Promise<RuntimeFeedItem[]> {
  if (typeof window === "undefined" || !window.document) {
    throw new Error("reddit_browser_fallback_unavailable");
  }

  const source = parseRedditSourceUrl(url);
  const request = redditPublicJsonRequests(source, limit)[0]?.url;
  if (!request) throw new Error("reddit_browser_fallback_unavailable");

  const requestUrl = new URL(request);
  if (allowNsfw) requestUrl.searchParams.set("include_over_18", "on");

  const payload = await fetchRedditJsonp(requestUrl.toString());
  const listing = Array.isArray(payload) ? payload[0] : payload;
  const normalized = normalizeRedditListing(
    listing as Parameters<typeof normalizeRedditListing>[0],
    {
      allowNsfw,
      limit,
      subreddit: source.subreddit ?? "reddit",
    },
  );

  if (!normalized.items.length) {
    throw new Error("reddit_browser_fallback_no_supported_media");
  }

  return normalized.items;
}

function fetchRedditJsonp(url: string): Promise<RedditJsonpPayload> {
  return new Promise((resolve, reject) => {
    const callbackName = `__scrollableRedditJsonp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const script = window.document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("reddit_browser_fallback_timeout"));
    }, 8000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callbackName];
    }

    (
      window as unknown as Record<string, (payload: RedditJsonpPayload) => void>
    )[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("reddit_browser_fallback_failed"));
    };

    const requestUrl = new URL(url);
    requestUrl.searchParams.set("jsonp", callbackName);
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = requestUrl.toString();
    window.document.head.append(script);
  });
}
