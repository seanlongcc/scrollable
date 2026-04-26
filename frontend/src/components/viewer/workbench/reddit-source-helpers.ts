import type { RuntimeFeedItem } from "@/lib/feed/types";
import type {
  PersistedSourceConfig,
  RedditListingSort,
  RedditTimeRange,
} from "./types";
import { DEFAULT_REDDIT_MEDIA_LIMIT, MAX_REDDIT_MEDIA_LIMIT } from "./types";
import { clamp } from "./numeric-helpers";

export function normalizeRedditLimit(value: number) {
  return clamp(value || DEFAULT_REDDIT_MEDIA_LIMIT, 1, MAX_REDDIT_MEDIA_LIMIT);
}

export function splitRedditUrls(value: string) {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildSubredditListingUrls(
  value: string,
  sort: RedditListingSort,
  timeRange: RedditTimeRange,
) {
  const entries = value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!entries.length) throw new Error("Enter one or more subreddit names");

  return Array.from(
    new Set(
      entries.map((entry) => {
        const subreddit = normalizeSubredditName(entry);
        if (!subreddit) {
          throw new Error(`Unsupported subreddit name: ${entry}`);
        }

        return subreddit;
      }),
    ),
  ).map((subreddit) => buildSubredditListingUrl(subreddit, sort, timeRange));
}

export function buildSubredditListingUrl(
  value: string,
  sort: RedditListingSort,
  timeRange: RedditTimeRange,
) {
  const subreddit = normalizeSubredditName(value);
  if (!subreddit) throw new Error("Enter a subreddit name");

  const url = new URL(`https://www.reddit.com/r/${subreddit}/${sort}/`);
  if (sort === "top" || sort === "controversial") {
    url.searchParams.set("t", timeRange);
  }

  return url.toString();
}

export function normalizeSubredditName(value: string) {
  const trimmed = value.trim().replace(/^\/?r\//i, "");
  const withoutSlashes = trimmed.split(/[/?#]/)[0] ?? "";

  return /^[A-Za-z0-9_]{2,21}$/.test(withoutSlashes) ? withoutSlashes : null;
}

export async function redditHashesForItemId(itemId: string) {
  const itemHashInput = redditItemHashInput(itemId);
  const parentHashInput = redditParentPostHashInput(itemId);
  const hashes = [await hashRedditItemId(itemHashInput)];

  if (parentHashInput !== itemHashInput) {
    hashes.push(await hashRedditItemId(parentHashInput));
  }

  return hashes;
}

export async function hashRedditItemId(itemId: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(redditItemHashInput(itemId)),
  );

  return `sha256:${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function redditItemHashInput(itemId: string) {
  return itemId;
}

export function redditParentPostHashInput(itemId: string) {
  const [source, postId] = itemId.split(":");
  return source === "reddit" && postId ? `reddit:${postId}` : itemId;
}

export function redditHiddenItemHashes(sourceConfig: PersistedSourceConfig) {
  if (sourceConfig.kind !== "reddit") return [];

  return [
    ...(sourceConfig.hiddenItemIdHashes ?? []),
    ...(sourceConfig.hiddenPostIdHashes ?? []),
  ];
}

export function redditRuntimeItemLabels(items: RuntimeFeedItem[]) {
  const counts = items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.title] = (accumulator[item.title] ?? 0) + 1;
    return accumulator;
  }, {});
  const indexes = new Map<string, number>();

  return new Map(
    items.map((item) => {
      const nextIndex = (indexes.get(item.title) ?? 0) + 1;
      indexes.set(item.title, nextIndex);

      return [
        item.id,
        counts[item.title] > 1 ? `${item.title} item ${nextIndex}` : item.title,
      ];
    }),
  );
}

export function redditLinksTitle(urls: string[], items: RuntimeFeedItem[]) {
  const subredditsFromUrls = uniqueSubreddits(urls.map(subredditFromRedditUrl));
  const subreddits = subredditsFromUrls.length
    ? subredditsFromUrls
    : uniqueSubreddits(items.map((item) => item.subreddit));

  if (subreddits.length) {
    return subreddits.map((subreddit) => `r/${subreddit}`).join(", ");
  }

  return urls.length === 1 ? "Reddit post" : "Reddit links";
}

export function uniqueSubreddits(values: Array<string | null | undefined>) {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    if (!value) return [];

    const key = value.toLowerCase();
    if (seen.has(key)) return [];

    seen.add(key);
    return [value];
  });
}

export function subredditFromRedditUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    const subredditIndex = segments.indexOf("r");
    const commentsIndex = segments.indexOf("comments");

    if (subredditIndex !== -1 && commentsIndex > subredditIndex + 1) {
      return segments[subredditIndex + 1];
    }

    if (subredditIndex !== -1 && segments[subredditIndex + 1]) {
      return segments[subredditIndex + 1];
    }
  } catch {
    return null;
  }

  return null;
}
