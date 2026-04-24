import { z } from "zod";

import { normalizeRedditListing } from "./normalization";

const booleanQuerySchema = z.preprocess((value) => {
  if (value === "false" || value === "0") return false;
  if (value === "true" || value === "1") return true;
  return value;
}, z.boolean());

const redditListingInputSchema = z.object({
  subreddit: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^(r\/)?[A-Za-z0-9_]+$/)
    .transform((value) => value.replace(/^r\//i, "")),
  sort: z.enum(["top", "hot", "new"]).default("top"),
  timeRange: z
    .enum(["hour", "day", "week", "month", "year", "all"])
    .default("day"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  skip: z.coerce.number().int().min(0).max(100).default(0),
  allowNsfw: booleanQuerySchema.default(true),
});

export type RedditListingInput = z.input<typeof redditListingInputSchema>;
export type ParsedRedditListingInput = z.output<
  typeof redditListingInputSchema
>;

type RedditToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: RedditToken | null = null;

export async function fetchRedditRuntimeListing(input: RedditListingInput) {
  const parsed = parseRedditListingInput(input);
  const token = await getRedditAppToken();
  const params = new URLSearchParams({
    limit: String(Math.min(parsed.limit + parsed.skip + 5, 100)),
    raw_json: "1",
  });

  if (parsed.sort === "top") {
    params.set("t", parsed.timeRange);
  }

  const response = await fetch(
    `https://oauth.reddit.com/r/${parsed.subreddit}/${parsed.sort}?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": getRedditUserAgent(),
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw toRedditError(response.status);
  }

  const listing = await response.json();
  return normalizeRedditListing(listing, {
    subreddit: parsed.subreddit,
    skip: parsed.skip,
    limit: parsed.limit,
    allowNsfw: parsed.allowNsfw,
  });
}

export function parseRedditListingInput(
  input: RedditListingInput,
): ParsedRedditListingInput {
  return redditListingInputSchema.parse(input);
}

async function getRedditAppToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": getRedditUserAgent(),
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Reddit OAuth failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

function getRedditUserAgent() {
  return (
    process.env.REDDIT_USER_AGENT ??
    "web:scrollable-feed:v0.1.0 (by /u/scrollable-app)"
  );
}

function toRedditError(status: number) {
  if (status === 401) return new Error("reddit_auth_failed");
  if (status === 403) return new Error("subreddit_private_or_banned");
  if (status === 404) return new Error("subreddit_not_found");
  if (status === 429) return new Error("reddit_rate_limited");
  return new Error(`reddit_network_error_${status}`);
}
