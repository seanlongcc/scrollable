import type { RuntimeFeedItem } from "@/lib/feed/types";
import { normalizeRedditListing } from "./normalization";
import {
  parseRedditPostLinksInput,
  parseRedditSourceUrl,
  redditPublicJsonRequests,
  shouldTryNextRedditRequest,
  toRedditPostError,
  type RedditPostLinksInput,
} from "./source";

export async function fetchPublicRedditRuntimePostLinks(
  input: RedditPostLinksInput,
) {
  const parsed = parseRedditPostLinksInput(input);
  const items: RuntimeFeedItem[] = [];
  const unsupportedIds: string[] = [];

  for (const sourceUrl of parsed.urls) {
    const source = parseRedditSourceUrl(sourceUrl);
    const requests = redditPublicJsonRequests(source, parsed.limit);
    let response: Response | null = null;

    for (const request of requests) {
      response = await fetch(request.url, {
        cache: "no-store",
      });

      if (response.ok || !shouldTryNextRedditRequest(response.status)) {
        break;
      }
    }

    if (!response?.ok) {
      throw toRedditPostError(response?.status ?? 502);
    }

    const payload = await response.json();
    const listing = Array.isArray(payload) ? payload[0] : payload;
    const normalized = normalizeRedditListing(listing, {
      subreddit: source.subreddit ?? "reddit",
      allowNsfw: parsed.allowNsfw,
      limit: parsed.limit,
    });

    items.push(...normalized.items);
    unsupportedIds.push(...normalized.unsupportedIds);
  }

  if (items.length === 0) {
    throw new Error("reddit_source_has_no_supported_media");
  }

  return { items, unsupportedIds };
}
