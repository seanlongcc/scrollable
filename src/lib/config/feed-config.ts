import { z } from "zod";

export const redditSortSchema = z.enum(["top", "hot", "new"]);
export const redditTimeRangeSchema = z.enum([
  "hour",
  "day",
  "week",
  "month",
  "year",
  "all",
]);

export const feedConfigInputSchema = z
  .object({
    source: z.literal("reddit").default("reddit"),
    name: z.string().trim().min(1).max(80).optional(),
    subreddit: z
      .string()
      .trim()
      .min(1, "Subreddit is required")
      .max(80)
      .regex(/^(r\/)?[A-Za-z0-9_]+$/, "Use a subreddit name like pics or r/pics")
      .transform((value) => value.replace(/^r\//i, "")),
    sort: redditSortSchema.default("top"),
    timeRange: redditTimeRangeSchema.default("day"),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    skip: z.coerce.number().int().min(0).max(100).default(0),
    timerSeconds: z.coerce.number().int().min(3).max(120).default(12),
    isNsfw: z.coerce.boolean().default(false),
    displayMode: z.enum(["single", "grid"]).default("single"),
  })
  .strip();

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
