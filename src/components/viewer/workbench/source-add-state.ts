import type {
  RedditInputMode,
  RedditListingSort,
  RedditTimeRange,
  SourceGroupingMode,
} from "./types";
import { DEFAULT_REDDIT_MEDIA_LIMIT } from "./types";
import {
  buildSubredditListingUrls,
  normalizeRedditLimit,
  splitRedditUrls,
} from "./helpers";

export type SourceAddFormState = {
  urlValue: string;
  urlTitle: string;
  redditUrls: string;
  subredditName: string;
  redditInputMode: RedditInputMode;
  redditSort: RedditListingSort;
  redditTimeRange: RedditTimeRange;
  redditLimit: number;
};

export function defaultSourceAddFormState(): SourceAddFormState {
  return {
    urlValue: "",
    urlTitle: "",
    redditUrls: "",
    subredditName: "",
    redditInputMode: "subreddit",
    redditSort: "top",
    redditTimeRange: "week",
    redditLimit: DEFAULT_REDDIT_MEDIA_LIMIT,
  };
}

export function sourceAddPanelPlacement(
  fixedSlot: number | null = null,
  templateSlotId: string | null = null,
) {
  return {
    pendingFixedSlot: fixedSlot,
    pendingTemplateSlotId: templateSlotId,
  };
}

export function resolveRedditAddInput({
  redditInputMode,
  subredditName,
  redditSort,
  redditTimeRange,
  redditUrls,
  redditLimit,
}: Pick<
  SourceAddFormState,
  | "redditInputMode"
  | "subredditName"
  | "redditSort"
  | "redditTimeRange"
  | "redditUrls"
  | "redditLimit"
>) {
  return {
    urls:
      redditInputMode === "subreddit"
        ? buildSubredditListingUrls(subredditName, redditSort, redditTimeRange)
        : splitRedditUrls(redditUrls),
    limit: normalizeRedditLimit(redditLimit),
  };
}

export function separateSourceSlotError({
  sourceGroupingMode,
  requestedCount,
  availableSeparateSourceSlots,
}: {
  sourceGroupingMode: SourceGroupingMode;
  requestedCount: number;
  availableSeparateSourceSlots: number;
}) {
  if (
    sourceGroupingMode !== "separate" ||
    requestedCount <= availableSeparateSourceSlots
  ) {
    return null;
  }

  return `Only ${availableSeparateSourceSlots} source slot${
    availableSeparateSourceSlots === 1 ? "" : "s"
  } available`;
}
