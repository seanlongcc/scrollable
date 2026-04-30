import { z } from "zod";

const DEFAULT_REDDIT_SOURCE_LIMIT = 20;
const MAX_REDDIT_SOURCE_LIMIT = 200;
const MAX_REDDIT_SOURCE_URLS = 200;
const REDDIT_LISTING_FETCH_LIMIT = 200;
const REDDIT_LISTING_SORTS = new Set([
  "hot",
  "new",
  "rising",
  "top",
  "controversial",
]);
const REDDIT_TIME_RANGES = new Set(["day", "week", "month", "year", "all"]);
const REDDIT_PUBLIC_ORIGIN = "https://www.reddit.com";
const REDDIT_PUBLIC_API_ORIGIN = "https://api.reddit.com";
const REDDIT_OAUTH_API_ORIGIN = "https://oauth.reddit.com";

const booleanQuerySchema = z.preprocess((value) => {
  if (value === "false" || value === "0") return false;
  if (value === "true" || value === "1") return true;
  return value;
}, z.boolean());

const redditPostLinksInputSchema = z.object({
  urls: z.preprocess(
    splitUrlInput,
    z.array(z.string()).min(1).max(MAX_REDDIT_SOURCE_URLS),
  ),
  allowNsfw: booleanQuerySchema.default(true),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_REDDIT_SOURCE_LIMIT)
    .default(DEFAULT_REDDIT_SOURCE_LIMIT),
});

export type RedditPostLinksInput = z.input<typeof redditPostLinksInputSchema>;
export type ParsedRedditPostLinksInput = z.output<
  typeof redditPostLinksInputSchema
>;

export type ParsedRedditSourceUrl =
  | {
      kind: "post";
      url: string;
      subreddit?: string;
    }
  | {
      kind: "listing";
      url: string;
      subreddit: string;
      sort: string;
      timeRange?: string;
    };

export function parseRedditPostLinksInput(
  input: RedditPostLinksInput,
): ParsedRedditPostLinksInput {
  const parsed = redditPostLinksInputSchema.parse(input);

  return {
    ...parsed,
    urls: parsed.urls.map((url) => parseRedditSourceUrl(url).url),
  };
}

export function parseRedditSourceUrl(value: string): ParsedRedditSourceUrl {
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

    return {
      kind: "post",
      url: `https://www.reddit.com/comments/${id}/`,
    };
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
  if (commentsIndex !== -1 && segments[commentsIndex + 1]) {
    return {
      kind: "post",
      url: `https://www.reddit.com/${segments.slice(0, commentsIndex + 3).join("/")}/`,
      subreddit: subredditFromSegments(segments),
    };
  }

  if (segments[0] !== "r" || !segments[1] || !segments[2]) {
    throw new Error("invalid_reddit_listing_url");
  }

  const subreddit = segments[1];
  const sort = segments[2].toLowerCase();
  if (!REDDIT_LISTING_SORTS.has(sort)) {
    throw new Error("invalid_reddit_listing_url");
  }

  const timeRange = url.searchParams.get("t")?.toLowerCase();
  if (timeRange && !REDDIT_TIME_RANGES.has(timeRange)) {
    throw new Error("invalid_reddit_listing_url");
  }

  const canonical = new URL(`https://www.reddit.com/r/${subreddit}/${sort}/`);
  if (timeRange) canonical.searchParams.set("t", timeRange);

  return {
    kind: "listing",
    url: canonical.toString(),
    subreddit,
    sort,
    timeRange,
  };
}

export function redditPublicJsonRequests(
  source: ParsedRedditSourceUrl,
  limit: number,
) {
  return [
    { url: toRedditJsonUrl(source, limit) },
    { url: toRedditJsonUrl(source, limit, REDDIT_PUBLIC_API_ORIGIN) },
  ];
}

export function toRedditOauthUrl(source: ParsedRedditSourceUrl, limit: number) {
  return `${REDDIT_OAUTH_API_ORIGIN}${toRedditApiPath(source, limit)}`;
}

export function shouldTryNextRedditRequest(status: number) {
  return status === 403 || status === 429 || status >= 500;
}

export function toRedditPostError(status: number) {
  if (status === 403) return new Error("reddit_fetch_forbidden");
  if (status === 404) {
    return new Error("reddit_post_not_found");
  }
  if (status === 429) return new Error("reddit_rate_limited");
  return new Error(`reddit_post_fetch_failed_${status}`);
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

function subredditFromSegments(segments: string[]) {
  const subredditIndex = segments.indexOf("r");
  const commentsIndex = segments.indexOf("comments");
  if (
    subredditIndex === -1 ||
    commentsIndex === -1 ||
    commentsIndex <= subredditIndex + 1
  ) {
    return undefined;
  }

  return segments[subredditIndex + 1];
}

function toRedditJsonUrl(
  source: ParsedRedditSourceUrl,
  limit: number,
  origin = REDDIT_PUBLIC_ORIGIN,
) {
  return `${origin}${toRedditApiPath(source, limit)}`;
}

function toRedditApiPath(source: ParsedRedditSourceUrl, limit: number) {
  if (source.kind === "post") {
    const url = new URL(source.url);
    return `${url.pathname.replace(/\/$/, "")}/.json?raw_json=1`;
  }

  const url = new URL(
    `/r/${source.subreddit}/${source.sort}/.json`,
    REDDIT_PUBLIC_ORIGIN,
  );
  url.searchParams.set("raw_json", "1");
  if (source.timeRange) url.searchParams.set("t", source.timeRange);
  url.searchParams.set(
    "limit",
    String(
      Math.min(
        Math.max(limit, REDDIT_LISTING_FETCH_LIMIT),
        MAX_REDDIT_SOURCE_LIMIT,
      ),
    ),
  );

  return `${url.pathname}${url.search}`;
}
