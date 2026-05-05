import { z } from "zod";

import {
  normalizeUrlSourceUrl,
  urlResolverHintSchema,
} from "@/lib/url-source/validation";

export const DEFAULT_FEED_TIMER_SECONDS = 10;
const MAX_REDDIT_SOURCE_URLS = 100;

const REDDIT_LISTING_SORTS = new Set([
  "hot",
  "new",
  "rising",
  "top",
  "controversial",
]);
const REDDIT_TIME_RANGES = new Set(["day", "week", "month", "year", "all"]);

const redditPostUrlSchema = z
  .string()
  .trim()
  .refine((value) => normalizeRedditSourceUrl(value) !== null, {
    message: "Use Reddit post or subreddit listing URLs",
  })
  .transform((value) => normalizeRedditSourceUrl(value) ?? value);

const feedConfigBaseSchema = {
  name: z.string().trim().min(1).max(80).optional(),
  timerSeconds: z.coerce
    .number()
    .int()
    .min(1)
    .max(120)
    .default(DEFAULT_FEED_TIMER_SECONDS),
  isNsfw: z.coerce.boolean().default(false),
  displayMode: z.enum(["single", "grid"]).default("single"),
};

const redditFeedConfigInputSchema = z
  .object({
    source: z.literal("reddit").default("reddit"),
    postUrls: z.preprocess(
      splitUrlInput,
      z.array(redditPostUrlSchema).min(1).max(MAX_REDDIT_SOURCE_URLS),
    ),
    ...feedConfigBaseSchema,
  })
  .strip();

const urlFeedConfigInputSchema = z
  .object({
    source: z.literal("url"),
    url: z
      .string()
      .trim()
      .min(1)
      .transform((value) => normalizeUrlSourceUrl(value)),
    title: z.string().trim().min(1).max(120).optional(),
    resolverHint: urlResolverHintSchema.optional(),
    ...feedConfigBaseSchema,
  })
  .strip();

export const feedConfigInputSchema = z.union([
  urlFeedConfigInputSchema,
  redditFeedConfigInputSchema,
]);

export type FeedConfigInput = z.input<typeof feedConfigInputSchema>;
export type SavedFeedConfig = z.output<typeof feedConfigInputSchema> & {
  id?: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function parseFeedConfigInput(input: FeedConfigInput): SavedFeedConfig {
  return feedConfigInputSchema.parse(input);
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

function normalizeRedditSourceUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "redd.it") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? `https://www.reddit.com/comments/${id}/` : null;
  }

  if (
    host !== "reddit.com" &&
    host !== "old.reddit.com" &&
    host !== "new.reddit.com"
  ) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const commentsIndex = segments.indexOf("comments");
  if (commentsIndex !== -1 && segments[commentsIndex + 1]) {
    return `https://www.reddit.com/${segments.slice(0, commentsIndex + 3).join("/")}/`;
  }

  if (segments[0] !== "r" || !segments[1] || !segments[2]) {
    return null;
  }

  const sort = segments[2].toLowerCase();
  if (!REDDIT_LISTING_SORTS.has(sort)) {
    return null;
  }

  const timeRange = url.searchParams.get("t")?.toLowerCase();
  if (timeRange && !REDDIT_TIME_RANGES.has(timeRange)) {
    return null;
  }

  const canonical = new URL(`https://www.reddit.com/r/${segments[1]}/${sort}/`);
  if (timeRange) canonical.searchParams.set("t", timeRange);

  return canonical.toString();
}
