import { z } from "zod";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import { normalizeRedditListing } from "./normalization";

const booleanQuerySchema = z.preprocess((value) => {
  if (value === "false" || value === "0") return false;
  if (value === "true" || value === "1") return true;
  return value;
}, z.boolean());

const redditPostLinksInputSchema = z.object({
  urls: z.preprocess(splitUrlInput, z.array(z.string()).min(1).max(50)),
  allowNsfw: booleanQuerySchema.default(true),
});

export type RedditPostLinksInput = z.input<typeof redditPostLinksInputSchema>;
export type ParsedRedditPostLinksInput = z.output<
  typeof redditPostLinksInputSchema
>;

export async function fetchRedditRuntimePostLinks(input: RedditPostLinksInput) {
  const parsed = parseRedditPostLinksInput(input);
  const items: RuntimeFeedItem[] = [];
  const unsupportedIds: string[] = [];

  for (const postUrl of parsed.urls) {
    const response = await fetch(toRedditJsonUrl(postUrl), {
      headers: {
        "User-Agent": getRedditUserAgent(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw toRedditPostError(response.status);
    }

    const payload = await response.json();
    const listing = Array.isArray(payload) ? payload[0] : payload;
    const normalized = normalizeRedditListing(listing, {
      subreddit: "reddit",
      allowNsfw: parsed.allowNsfw,
    });

    items.push(...normalized.items);
    unsupportedIds.push(...normalized.unsupportedIds);
  }

  if (items.length === 0) {
    throw new Error("reddit_post_has_no_supported_media");
  }

  return { items, unsupportedIds };
}

export function parseRedditPostLinksInput(
  input: RedditPostLinksInput,
): ParsedRedditPostLinksInput {
  const parsed = redditPostLinksInputSchema.parse(input);

  return {
    ...parsed,
    urls: parsed.urls.map((url) => normalizeRedditPostUrl(url)),
  };
}

function splitUrlInput(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => splitUrlInput(entry) as string[]);
  }

  if (typeof value !== "string") return value;

  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeRedditPostUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid_reddit_post_url");
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "redd.it") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (!id) throw new Error("invalid_reddit_post_url");

    return `https://www.reddit.com/comments/${id}/`;
  }

  if (
    host !== "reddit.com" &&
    host !== "old.reddit.com" &&
    host !== "new.reddit.com"
  ) {
    throw new Error("invalid_reddit_post_url");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const commentsIndex = segments.indexOf("comments");
  if (commentsIndex === -1 || !segments[commentsIndex + 1]) {
    throw new Error("invalid_reddit_post_url");
  }

  return `https://www.reddit.com/${segments.slice(0, commentsIndex + 3).join("/")}/`;
}

function toRedditJsonUrl(postUrl: string) {
  return `${postUrl.replace(/\/$/, "")}/.json?raw_json=1`;
}

function getRedditUserAgent() {
  return (
    process.env.REDDIT_USER_AGENT ??
    "web:scrollable-feed:v0.1.0 (by /u/scrollable-app)"
  );
}

function toRedditPostError(status: number) {
  if (status === 403 || status === 404) {
    return new Error("reddit_post_not_found");
  }
  if (status === 429) return new Error("reddit_rate_limited");
  return new Error(`reddit_post_fetch_failed_${status}`);
}
