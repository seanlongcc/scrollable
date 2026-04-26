import type { RuntimeFeedItem } from "@/lib/feed/types";
import type {
  UrlRuntimeResolution,
  UrlSourceConfig,
} from "@/lib/url-source/types";
import { createTimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import { hashRedditItemId, redditHiddenItemHashes } from "./helpers";

export type EditedRedditSourceState = {
  title: string;
  urls: string[];
  limit: number;
  items: RuntimeFeedItem[];
  allItems: RuntimeFeedItem[];
  hiddenItemIdHashes: string[];
};

export type EditedUrlSourceState = {
  title: string;
  items: RuntimeFeedItem[];
  allItems?: RuntimeFeedItem[];
  urlResolution?: UrlRuntimeResolution;
  sourceConfig: UrlSourceConfig;
};

export function withSessionRuntimeLoading(
  session: FeedSession,
  isRuntimeLoading: boolean,
) {
  return { ...session, isRuntimeLoading };
}

export function buildEditedUrlSourceConfig({
  currentSource,
  url,
  title,
}: {
  currentSource?: FeedSession;
  url: string;
  title?: string;
}): UrlSourceConfig {
  const currentConfig =
    currentSource?.sourceConfig.kind === "url"
      ? currentSource.sourceConfig
      : null;

  return {
    kind: "url",
    url,
    ...(title?.trim() ? { title: title.trim() } : {}),
    ...(currentConfig?.resolverHint
      ? { resolverHint: currentConfig.resolverHint }
      : {}),
  };
}

export async function resolveEditedRedditHiddenItemHashes({
  currentSource,
  hiddenItemIds,
  unhiddenItemHashes,
}: {
  currentSource?: FeedSession;
  hiddenItemIds: string[];
  unhiddenItemHashes: string[];
}) {
  const existingHiddenHashes =
    currentSource?.sourceConfig.kind === "reddit"
      ? redditHiddenItemHashes(currentSource.sourceConfig)
      : [];
  const unhidden = new Set(unhiddenItemHashes);
  const addedHiddenHashes = await Promise.all(
    hiddenItemIds.map((itemId) => hashRedditItemId(itemId)),
  );

  return Array.from(
    new Set([
      ...existingHiddenHashes.filter((hash) => !unhidden.has(hash)),
      ...addedHiddenHashes,
    ]),
  );
}

export function applyEditedRedditSourceToSession(
  session: FeedSession,
  result: EditedRedditSourceState,
): FeedSession {
  const timer = timerForEditedItems(session, result.items.length);

  return {
    ...session,
    title: result.title,
    items: result.items,
    allItems: result.allItems,
    urlResolution: undefined,
    localFiles: undefined,
    isRuntimeLoading: false,
    sourceConfig: {
      kind: "reddit",
      urls: result.urls,
      limit: result.limit,
      allowNsfw: true,
      ...(result.hiddenItemIdHashes.length
        ? { hiddenItemIdHashes: result.hiddenItemIdHashes }
        : {}),
    },
    timer,
  };
}

export function applyEditedUrlSourceToSession(
  session: FeedSession,
  result: EditedUrlSourceState,
): FeedSession {
  const timer = timerForEditedItems(session, result.items.length);

  return {
    ...session,
    title: result.title,
    items: result.items,
    allItems: result.allItems,
    urlResolution: result.urlResolution,
    localFiles: undefined,
    isRuntimeLoading: false,
    sourceConfig: result.sourceConfig,
    timer,
  };
}

function timerForEditedItems(session: FeedSession, itemCount: number) {
  const timer = createTimerState({
    durationSeconds: session.timer.durationSeconds,
    itemCount,
  });

  return {
    ...timer,
    isPaused: session.timer.isPaused,
  };
}
