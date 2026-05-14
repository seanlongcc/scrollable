import type { RuntimeFeedItem } from "@/lib/feed/types";
import { loadLocalFiles } from "@/lib/local-uploads/file-cache";
import type {
  UrlRuntimeResolution,
  UrlSourceRow,
} from "@/lib/url-source/types";
import type { VideoTimeRange } from "@/lib/viewer/video-time-range";
import type {
  FeedSession,
  LocalRestoreStatus,
  PersistedSourceConfig,
  SourceGroupingMode,
} from "./types";
import { DEFAULT_REDDIT_MEDIA_LIMIT } from "./types";
import {
  clamp,
  redditHiddenItemHashes,
  redditHashesForItemId,
  redditLinksTitle,
} from "./helpers";
import { getUploadableFiles } from "./local-sources";
import { flattenRuntimeMediaItems } from "./runtime-media-items";
import {
  createRedditRuntimePostCache,
  fetchRedditRuntimePostItems,
  type RedditRuntimePostCache,
} from "./reddit-runtime-cache";
import {
  buildEditedUrlSourceConfig,
  resolveEditedRedditHiddenItemHashes,
  type EditedRedditSourceState,
  type EditedUrlSourceState,
} from "./source-edit-state";
import { randomizeRuntimeItems } from "./source-order-state";
import { fetchUrlRuntimeItemsForSource } from "./url-runtime-sources";

export { fetchUrlRuntimeItemsForSource } from "./url-runtime-sources";

export type RuntimeSessionSource = {
  title: string;
  items: RuntimeFeedItem[];
  allItems?: RuntimeFeedItem[];
  isOrderRandomized?: boolean;
  urlResolution?: UrlRuntimeResolution;
  localFiles?: File[];
  sourceConfig: PersistedSourceConfig;
};

export type RuntimeHydrationResult = {
  id: string;
  title?: string;
  items: RuntimeFeedItem[];
  allItems?: RuntimeFeedItem[];
  isOrderRandomized?: boolean;
  urlResolution?: UrlRuntimeResolution;
  localFiles?: File[];
  localRestoreStatus?: LocalRestoreStatus;
  sourceConfig?: PersistedSourceConfig;
};

export async function createRedditSessionSources({
  urls,
  limit,
  sourceGroupingMode,
  redditCache = createRedditRuntimePostCache(),
}: {
  urls: string[];
  limit: number;
  sourceGroupingMode: SourceGroupingMode;
  redditCache?: RedditRuntimePostCache;
}): Promise<RuntimeSessionSource[]> {
  if (sourceGroupingMode === "separate") {
    return Promise.all(
      urls.map(async (url) => {
        const allItems = await fetchRedditRuntimeItems([url], limit, {
          redditCache,
        });
        const items = randomizeRuntimeItems(allItems);

        return {
          title: redditLinksTitle([url], items),
          sourceConfig: {
            kind: "reddit",
            urls: [url],
            limit,
            allowNsfw: true,
          },
          items,
          allItems,
          isOrderRandomized: true,
        };
      }),
    );
  }

  const allItems = await fetchRedditRuntimeItems(urls, limit, { redditCache });
  const items = randomizeRuntimeItems(allItems);

  return [
    {
      title: redditLinksTitle(urls, items),
      sourceConfig: {
        kind: "reddit",
        urls,
        limit,
        allowNsfw: true,
      },
      items,
      allItems,
      isOrderRandomized: true,
    },
  ];
}

export async function fetchRedditRuntimeItems(
  urls: string[],
  limit = DEFAULT_REDDIT_MEDIA_LIMIT,
  {
    allowNsfw = true,
    redditCache,
  }: {
    allowNsfw?: boolean;
    redditCache?: RedditRuntimePostCache;
  } = {},
) {
  const items = await fetchRedditRuntimePostItems({
    urls,
    allowNsfw,
    limit,
    cache: redditCache,
  });

  return flattenRuntimeMediaItems(items);
}

export async function filterHiddenRedditItems(
  items: RuntimeFeedItem[],
  hiddenItemIdHashes: string[] = [],
) {
  if (!hiddenItemIdHashes.length) return items;

  const hidden = new Set(hiddenItemIdHashes);
  const hashPairs = await Promise.all(
    items.map(async (item) => {
      return {
        item,
        hashes:
          item.source === "reddit" ? await redditHashesForItemId(item.id) : [],
      };
    }),
  );

  return hashPairs
    .filter(({ hashes }) => hashes.every((hash) => !hidden.has(hash)))
    .map(({ item }) => item);
}

export async function fetchEditedRedditSource({
  currentSource,
  urls,
  limit,
  hiddenItemIds,
  unhiddenItemHashes,
}: {
  currentSource?: FeedSession;
  urls: string[];
  limit: number;
  hiddenItemIds: string[];
  unhiddenItemHashes: string[];
}): Promise<EditedRedditSourceState> {
  const hiddenItemIdHashes = await resolveEditedRedditHiddenItemHashes({
    currentSource,
    hiddenItemIds,
    unhiddenItemHashes,
  });
  const allItems = await fetchRedditRuntimeItems(urls, limit, {
    redditCache: createRedditRuntimePostCache(),
  });
  const items = await filterHiddenRedditItems(allItems, hiddenItemIdHashes);

  return {
    title: redditLinksTitle(urls, allItems),
    urls,
    limit,
    items,
    allItems,
    hiddenItemIdHashes,
  };
}

export async function fetchEditedUrlSource({
  currentSource,
  urls,
  rows,
  title,
}: {
  currentSource?: FeedSession;
  urls: string[];
  rows?: UrlSourceRow[];
  title?: string;
}): Promise<EditedUrlSourceState> {
  return fetchUrlRuntimeItemsForSource(
    buildEditedUrlSourceConfig({
      currentSource,
      urls,
      urlRows: rows,
      title,
    }),
  );
}

export async function fetchRuntimeItemsForSource(
  sourceConfig: PersistedSourceConfig,
  redditCache?: RedditRuntimePostCache,
) {
  if (sourceConfig.kind !== "reddit") {
    return { items: [], allItems: undefined };
  }

  const allItems = await fetchRedditRuntimeItems(
    sourceConfig.urls,
    sourceConfig.limit ?? DEFAULT_REDDIT_MEDIA_LIMIT,
    {
      allowNsfw: sourceConfig.allowNsfw,
      redditCache,
    },
  );
  const items = await filterHiddenRedditItems(
    allItems,
    redditHiddenItemHashes(sourceConfig),
  );

  return {
    items: randomizeRuntimeItems(items),
    allItems,
    isOrderRandomized: true,
  };
}

export async function fetchLocalRuntimeItemsForSource({
  sourceConfig,
  createLocalRuntimeItems,
  requestPermission = false,
}: {
  sourceConfig: PersistedSourceConfig;
  createLocalRuntimeItems: (
    files: File[],
    videoTimeRanges?: Record<string, VideoTimeRange>,
  ) => RuntimeFeedItem[];
  requestPermission?: boolean;
}) {
  if (sourceConfig.kind !== "local" || !sourceConfig.cacheSetId) {
    return {
      items: [],
      allItems: undefined,
      localFiles: undefined,
      localRestoreStatus: "unavailable" as const,
    };
  }

  const result = requestPermission
    ? await loadLocalFiles(sourceConfig.cacheSetId, { requestPermission })
    : await loadLocalFiles(sourceConfig.cacheSetId);
  if (result.status !== "loaded") {
    return {
      items: [],
      allItems: undefined,
      localFiles: undefined,
      localRestoreStatus: result.status,
    };
  }

  const localFiles = getUploadableFiles(result.files);
  return {
    items: createLocalRuntimeItems(localFiles, sourceConfig.videoTimeRanges),
    allItems: undefined,
    localFiles,
    localRestoreStatus: undefined,
  };
}

export async function hydrateRuntimeSources({
  sessions,
  createLocalRuntimeItems,
  onError,
}: {
  sessions: FeedSession[];
  createLocalRuntimeItems: (
    files: File[],
    videoTimeRanges?: Record<string, VideoTimeRange>,
  ) => RuntimeFeedItem[];
  onError: (session: FeedSession, error: unknown) => void;
}): Promise<RuntimeHydrationResult[]> {
  const redditCache = createRedditRuntimePostCache();

  return Promise.all(
    sessions.map(async (session) => {
      try {
        const result =
          session.sourceConfig.kind === "reddit"
            ? {
                ...(await fetchRuntimeItemsForSource(
                  session.sourceConfig,
                  redditCache,
                )),
                localFiles: undefined,
              }
            : session.sourceConfig.kind === "url"
              ? {
                  ...(await fetchUrlRuntimeItemsForSource(
                    session.sourceConfig,
                    redditCache,
                  )),
                  localFiles: undefined,
                }
              : await fetchLocalRuntimeItemsForSource({
                  sourceConfig: session.sourceConfig,
                  createLocalRuntimeItems,
                });
        return {
          id: session.id,
          ...runtimeResultForOrderMode(session, result),
        };
      } catch (error) {
        onError(session, error);
        return {
          id: session.id,
          items: [],
          allItems: undefined,
          urlResolution: undefined,
          localFiles: undefined,
        };
      }
    }),
  );
}

function runtimeResultForOrderMode(
  session: FeedSession,
  result: Omit<RuntimeHydrationResult, "id">,
): Omit<RuntimeHydrationResult, "id"> {
  if (
    session.sourceConfig.kind !== "reddit" &&
    session.sourceConfig.kind !== "local" &&
    session.sourceConfig.kind !== "url"
  ) {
    return result;
  }

  if (session.isOrderRandomized !== false) return result;

  const visibleIds = new Set(result.items.map((item) => item.id));
  const orderedItems =
    result.allItems?.filter((item) => visibleIds.has(item.id)) ?? result.items;

  return {
    ...result,
    items: orderedItems.length ? orderedItems : result.items,
    isOrderRandomized: false,
  };
}

export function applyRuntimeHydrationResults(
  sessions: FeedSession[],
  hydrated: RuntimeHydrationResult[],
) {
  const hydratedBySession = new Map(
    hydrated.map((result) => [result.id, result]),
  );

  return sessions.map((session) => {
    const hydratedSession = hydratedBySession.get(session.id);
    if (!hydratedSession) return session;
    const orderedHydratedSession = runtimeResultForOrderMode(
      session,
      hydratedSession,
    );
    const {
      items,
      allItems,
      isOrderRandomized,
      localFiles,
      urlResolution,
      localRestoreStatus,
    } = orderedHydratedSession;
    const { sourceConfig, title } = orderedHydratedSession;

    return {
      ...session,
      title: title ?? session.title,
      items,
      allItems,
      isOrderRandomized,
      urlResolution,
      localFiles,
      localRestoreStatus,
      isRuntimeLoading: false,
      sourceConfig: sourceConfig ?? session.sourceConfig,
      timer: {
        ...session.timer,
        itemCount: items.length,
        activeIndex:
          items.length > 0
            ? clamp(session.timer.activeIndex, 0, items.length - 1)
            : 0,
      },
    };
  });
}
