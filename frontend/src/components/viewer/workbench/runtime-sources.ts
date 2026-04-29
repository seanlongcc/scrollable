import type { RuntimeFeedItem } from "@/lib/feed/types";
import { loadLocalFiles } from "@/lib/local-uploads/file-cache";
import type {
  UrlResolverHint,
  UrlRuntimeResolution,
  UrlSourceConfig,
} from "@/lib/url-source/types";
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
  urlHostLabel,
} from "./helpers";
import { getUploadableFiles } from "./local-sources";
import {
  buildEditedUrlSourceConfig,
  resolveEditedRedditHiddenItemHashes,
  type EditedRedditSourceState,
  type EditedUrlSourceState,
} from "./source-edit-state";

export type RuntimeSessionSource = {
  title: string;
  items: RuntimeFeedItem[];
  allItems?: RuntimeFeedItem[];
  urlResolution?: UrlRuntimeResolution;
  localFiles?: File[];
  sourceConfig: PersistedSourceConfig;
};

export type RuntimeHydrationResult = {
  id: string;
  title?: string;
  items: RuntimeFeedItem[];
  allItems?: RuntimeFeedItem[];
  urlResolution?: UrlRuntimeResolution;
  localFiles?: File[];
  localRestoreStatus?: LocalRestoreStatus;
  sourceConfig?: PersistedSourceConfig;
};

export function buildUrlAddSourceConfig({
  urlValue,
  urlTitle,
}: {
  urlValue: string;
  urlTitle: string;
}): UrlSourceConfig {
  return {
    kind: "url",
    url: urlValue.trim(),
    ...(urlTitle.trim() ? { title: urlTitle.trim() } : {}),
  };
}

export async function createUrlSessionSource(
  sourceConfig: UrlSourceConfig,
): Promise<RuntimeSessionSource> {
  const result = await fetchUrlRuntimeItemsForSource(sourceConfig);

  return {
    title: result.title,
    sourceConfig: result.sourceConfig,
    items: result.items,
    allItems: result.allItems,
    urlResolution: result.urlResolution,
  };
}

export async function createRedditSessionSources({
  urls,
  limit,
  sourceGroupingMode,
}: {
  urls: string[];
  limit: number;
  sourceGroupingMode: SourceGroupingMode;
}): Promise<RuntimeSessionSource[]> {
  if (sourceGroupingMode === "separate") {
    return Promise.all(
      urls.map(async (url) => {
        const items = await fetchRedditRuntimeItems([url], limit);

        return {
          title: redditLinksTitle([url], items),
          sourceConfig: {
            kind: "reddit",
            urls: [url],
            limit,
            allowNsfw: true,
          },
          items,
          allItems: items,
        };
      }),
    );
  }

  const items = await fetchRedditRuntimeItems(urls, limit);

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
      allItems: items,
    },
  ];
}

export async function fetchRedditRuntimeItems(
  urls: string[],
  limit = DEFAULT_REDDIT_MEDIA_LIMIT,
) {
  const params = new URLSearchParams({
    allowNsfw: "true",
    limit: String(limit),
  });
  for (const url of urls) {
    params.append("urls", url);
  }
  const response = await fetch(`/api/reddit/listing?${params}`, {
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "reddit_error");
  }

  return flattenRuntimeMediaItems(payload.items as RuntimeFeedItem[]);
}

export function flattenRuntimeMediaItems(items: RuntimeFeedItem[]) {
  return items.flatMap((item) => {
    if (item.media.length <= 1) return [item];

    return item.media.map((media, index) => ({
      ...item,
      id: `${item.id}:media:${index}`,
      media: [media],
    }));
  });
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
  const allItems = await fetchRedditRuntimeItems(urls, limit);
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
  url,
  title,
}: {
  currentSource?: FeedSession;
  url: string;
  title?: string;
}): Promise<EditedUrlSourceState> {
  return fetchUrlRuntimeItemsForSource(
    buildEditedUrlSourceConfig({
      currentSource,
      url,
      title,
    }),
  );
}

export async function fetchRuntimeItemsForSource(
  sourceConfig: PersistedSourceConfig,
) {
  if (sourceConfig.kind !== "reddit") {
    return { items: [], allItems: undefined };
  }

  const params = new URLSearchParams({
    allowNsfw: String(sourceConfig.allowNsfw),
    limit: String(sourceConfig.limit ?? DEFAULT_REDDIT_MEDIA_LIMIT),
  });
  for (const url of sourceConfig.urls) {
    params.append("urls", url);
  }
  const response = await fetch(`/api/reddit/listing?${params}`, {
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "reddit_error");
  }

  const allItems = flattenRuntimeMediaItems(payload.items as RuntimeFeedItem[]);

  return {
    items: await filterHiddenRedditItems(
      allItems,
      redditHiddenItemHashes(sourceConfig),
    ),
    allItems,
  };
}

export async function fetchUrlRuntimeItemsForSource(
  sourceConfig: UrlSourceConfig,
) {
  const params = new URLSearchParams({ url: sourceConfig.url });
  if (sourceConfig.resolverHint) {
    params.set("hint", sourceConfig.resolverHint);
  }

  const response = await fetch(`/api/url/resolve?${params}`, {
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "url_source_error");
  }

  const resolution = payload.resolution as UrlRuntimeResolution;
  const nextResolverHint = payload.nextResolverHint as
    | UrlResolverHint
    | undefined;
  const items =
    resolution.status === "resolved" && "items" in resolution
      ? flattenRuntimeMediaItems(resolution.items as RuntimeFeedItem[])
      : [];
  const title =
    sourceConfig.title ??
    ("title" in resolution ? resolution.title : undefined) ??
    urlHostLabel(sourceConfig.url);

  return {
    title,
    items,
    allItems: items,
    urlResolution: resolution,
    sourceConfig: {
      ...sourceConfig,
      url: sourceConfig.url,
      title: sourceConfig.title,
      ...(nextResolverHint ? { resolverHint: nextResolverHint } : {}),
    } satisfies UrlSourceConfig,
  };
}

export async function fetchLocalRuntimeItemsForSource({
  sourceConfig,
  createLocalRuntimeItems,
  requestPermission = false,
}: {
  sourceConfig: PersistedSourceConfig;
  createLocalRuntimeItems: (files: File[]) => RuntimeFeedItem[];
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
    items: createLocalRuntimeItems(localFiles),
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
  createLocalRuntimeItems: (files: File[]) => RuntimeFeedItem[];
  onError: (session: FeedSession, error: unknown) => void;
}): Promise<RuntimeHydrationResult[]> {
  return Promise.all(
    sessions.map(async (session) => {
      try {
        const result =
          session.sourceConfig.kind === "reddit"
            ? {
                ...(await fetchRuntimeItemsForSource(session.sourceConfig)),
                localFiles: undefined,
              }
            : session.sourceConfig.kind === "url"
              ? {
                  ...(await fetchUrlRuntimeItemsForSource(
                    session.sourceConfig,
                  )),
                  localFiles: undefined,
                }
              : await fetchLocalRuntimeItemsForSource({
                  sourceConfig: session.sourceConfig,
                  createLocalRuntimeItems,
                });
        return { id: session.id, ...result };
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
    const { items, allItems, localFiles, urlResolution, localRestoreStatus } =
      hydratedSession;
    const { sourceConfig, title } = hydratedSession;

    return {
      ...session,
      title: title ?? session.title,
      items,
      allItems,
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
