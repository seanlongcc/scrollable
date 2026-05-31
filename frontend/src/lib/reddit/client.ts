import type { RuntimeFeedItem, RuntimeMedia } from "@/lib/feed/types";
import { isRedditUrl } from "@/lib/url-source/resolver-routing";
import { extractYtDlpRuntimeItems } from "@/lib/url-source/ytdlp";
import { fetchRedditMediaEmbed, isRedditHostedVideoUrl } from "./mediaembed";
import { normalizeRedditListing } from "./normalization";
import {
  fetchOldRedditGalleryMedia,
  isRedditGalleryUrl,
} from "./oldreddit-gallery";
import {
  normalizeRedditAtomFeed,
  type RedditRssMediaResolverInput,
} from "./rss";
import {
  parseRedditPostLinksInput,
  parseRedditSourceUrl,
  redditPublicJsonRequests,
  shouldTryNextRedditRequest,
  toRedditOauthUrl,
  toRedditPostError,
  toRedditRssUrl,
  type ParsedRedditSourceUrl,
  type RedditPostLinksInput,
} from "./source";

const REDDIT_OAUTH_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

export { parseRedditPostLinksInput } from "./source";
export type {
  ParsedRedditPostLinksInput,
  RedditPostLinksInput,
} from "./source";

type RedditAccessToken = {
  key: string;
  token: string;
  expiresAt: number;
};

type RedditRequest = {
  url: string;
  headers: Record<string, string>;
  parser: "json" | "rss";
};

let cachedAccessToken: RedditAccessToken | null = null;

export async function fetchRedditRuntimePostLinks(input: RedditPostLinksInput) {
  const parsed = parseRedditPostLinksInput(input);
  const items: RuntimeFeedItem[] = [];
  const unsupportedIds: string[] = [];

  for (const sourceUrl of parsed.urls) {
    const source = parseRedditSourceUrl(sourceUrl);
    const requests = await redditJsonRequests(source, parsed.limit);
    let sawOkResponse = false;
    let sourceHasItems = false;
    let lastRetryableStatus = 502;
    let lastUnsupportedIds: string[] = [];

    for (const request of requests) {
      const response = await fetch(request.url, {
        headers: {
          "User-Agent": getRedditUserAgent(),
          ...request.headers,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        lastRetryableStatus = response.status;
        if (shouldTryNextRedditRequest(response.status)) continue;
        throw toRedditPostError(response.status);
      }

      sawOkResponse = true;
      const normalized = await normalizeRedditResponse(
        response,
        request.parser,
        {
          subreddit: source.subreddit ?? "reddit",
          allowNsfw: parsed.allowNsfw,
          limit: parsed.limit,
        },
      );

      if (normalized.items.length > 0) {
        items.push(...normalized.items);
        unsupportedIds.push(...normalized.unsupportedIds);
        sourceHasItems = true;
        break;
      }

      lastUnsupportedIds = normalized.unsupportedIds;
    }

    if (!sourceHasItems) {
      if (!sawOkResponse) throw toRedditPostError(lastRetryableStatus);
      unsupportedIds.push(...lastUnsupportedIds);
    }
  }

  if (items.length === 0) {
    throw new Error("reddit_source_has_no_supported_media");
  }

  return { items, unsupportedIds };
}

async function redditJsonRequests(
  source: ParsedRedditSourceUrl,
  limit: number,
): Promise<RedditRequest[]> {
  const accessToken = await redditAccessToken();
  if (!accessToken) {
    return [
      ...redditPublicJsonRequests(source, limit).map((request) => ({
        ...request,
        headers: {},
        parser: "json" as const,
      })),
      {
        url: toRedditRssUrl(source, limit),
        headers: {},
        parser: "rss",
      },
    ];
  }

  return [
    {
      url: toRedditOauthUrl(source, limit),
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      parser: "json",
    },
  ];
}

async function normalizeRedditResponse(
  response: Response,
  parser: RedditRequest["parser"],
  options: {
    subreddit: string;
    allowNsfw?: boolean;
    limit?: number;
  },
) {
  if (parser === "rss") {
    return normalizeRedditAtomFeed(await response.text(), {
      ...options,
      resolveMedia: resolveRedditRssMedia,
    });
  }

  const payload = await response.json();
  const listing = Array.isArray(payload) ? payload[0] : payload;
  return normalizeRedditListing(listing, options);
}

async function resolveRedditRssMedia({
  allowNsfw,
  permalink,
  postId,
  url,
}: RedditRssMediaResolverInput): Promise<RuntimeMedia[]> {
  if (postId && isRedditHostedVideoUrl(url)) {
    const media = await fetchRedditMediaEmbed(postId, {
      userAgent: getRedditUserAgent(),
    });

    return media ? [media] : [];
  }

  if (postId && isRedditGalleryUrl(url)) {
    return fetchOldRedditGalleryMedia({
      allowNsfw,
      permalink,
      postId,
      userAgent: getRedditUserAgent(),
    });
  }

  if (isRedditUrl(url)) return [];

  const items = await extractYtDlpRuntimeItems(url);

  return items.flatMap((item) => item.media);
}

function getRedditUserAgent() {
  return (
    process.env.REDDIT_USER_AGENT ??
    "web:scrollable-feed:v0.1.0 (by /u/scrollable-app)"
  );
}

async function redditAccessToken() {
  const credentials = redditCredentials();
  if (!credentials) return null;

  const now = Date.now();
  if (
    cachedAccessToken &&
    cachedAccessToken.key === credentials.key &&
    cachedAccessToken.expiresAt > now
  ) {
    return cachedAccessToken.token;
  }

  const response = await fetch(REDDIT_OAUTH_TOKEN_URL, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${credentials.clientId}:${credentials.clientSecret}`,
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": getRedditUserAgent(),
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("reddit_oauth_failed");

  const payload = (await response.json()) as {
    access_token?: unknown;
    expires_in?: unknown;
  };
  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw new Error("reddit_oauth_failed");
  }

  const expiresIn =
    typeof payload.expires_in === "number" &&
    Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 3600;
  cachedAccessToken = {
    key: credentials.key,
    token: payload.access_token,
    expiresAt: now + Math.max(60, expiresIn - 60) * 1000,
  };

  return cachedAccessToken.token;
}

function redditCredentials() {
  const clientId = process.env.REDDIT_CLIENT_ID?.trim();
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    key: `${clientId}:${clientSecret}`,
  };
}
