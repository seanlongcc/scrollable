import type { RuntimeFeedItem } from "@/lib/feed/types";
import type {
  UrlResolverHint,
  UrlRuntimeResolution,
  UrlSourceRow,
  UrlSourceConfig,
} from "@/lib/url-source/types";
import { isRedditUrl } from "@/lib/url-source/resolver-routing";
import {
  fetchRedditRuntimePostItems,
  type RedditRuntimePostCache,
} from "./reddit-runtime-cache";
import { redditLinksTitle, urlHostLabel } from "./helpers";
import { flattenRuntimeMediaItems } from "./runtime-media-items";

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

export function buildStackedUrlAddSourceConfig({
  urls,
  urlTitle,
}: {
  urls: string[];
  urlTitle: string;
}): UrlSourceConfig {
  const title = urlTitle.trim();
  const sourceUrls = urls.map((url) => url.trim()).filter(Boolean);
  const firstUrl = sourceUrls[0] ?? "";

  return {
    kind: "url",
    url: firstUrl,
    ...(sourceUrls.length > 1 ? { urls: sourceUrls } : {}),
    ...(title ? { title } : {}),
  };
}

export function buildUrlAddSourceConfigs({
  urls,
  urlTitle,
}: {
  urls: string[];
  urlTitle: string;
}): UrlSourceConfig[] {
  const title = urlTitle.trim();

  return urls.map((url) => ({
    kind: "url",
    url,
    ...(title && urls.length === 1 ? { title } : {}),
  }));
}

export async function createUrlSessionSource(sourceConfig: UrlSourceConfig) {
  const result = await fetchUrlRuntimeItemsForSource(sourceConfig);

  return {
    title: result.title,
    sourceConfig: result.sourceConfig,
    items: result.items,
    allItems: result.allItems,
    urlResolution: result.urlResolution,
  };
}

export function createUrlSessionSources(sourceConfigs: UrlSourceConfig[]) {
  return Promise.all(sourceConfigs.map(createUrlSessionSource));
}

export async function fetchUrlRuntimeItemsForSource(
  sourceConfig: UrlSourceConfig,
  redditCache?: RedditRuntimePostCache,
) {
  const sourceRows = urlSourceRows(sourceConfig);
  if (sourceConfig.urlRows?.length || sourceRows.length > 1) {
    return fetchStackedUrlRuntimeItemsForSource(
      sourceConfig,
      sourceRows,
      redditCache,
    );
  }

  return fetchSingleUrlRuntimeItemsForSource(sourceConfig, redditCache);
}

async function fetchStackedUrlRuntimeItemsForSource(
  sourceConfig: UrlSourceConfig,
  rows: UrlSourceRow[],
  redditCache?: RedditRuntimePostCache,
) {
  const results = await Promise.all(
    rows.map(async (row) => {
      const result = await fetchSingleUrlRuntimeItemsForSource(
        {
          kind: "url",
          url: row.url,
          ...(rows.length === 1 && sourceConfig.resolverHint
            ? { resolverHint: sourceConfig.resolverHint }
            : {}),
        },
        redditCache,
      );

      return {
        ...result,
        items: applyUrlRowRuntimeMetadata(result.items, row),
        allItems: applyUrlRowRuntimeMetadata(
          result.allItems ?? result.items,
          row,
        ),
      };
    }),
  );
  const items = results.flatMap((result) => result.items);
  const urls = rows.map((row) => row.url);
  const title =
    sourceConfig.title ??
    (urls.length === 1 ? results[0]?.title : `${urls.length} URL sources`) ??
    urlHostLabel(sourceConfig.url);

  return {
    title,
    items,
    allItems: items,
    urlResolution:
      rows.length === 1
        ? results[0]?.urlResolution
        : (undefined as UrlRuntimeResolution | undefined),
    sourceConfig: {
      kind: "url",
      url: urls[0]!,
      urls,
      ...(sourceConfig.urlRows?.length ? { urlRows: rows } : {}),
      ...(sourceConfig.title ? { title: sourceConfig.title } : {}),
      ...(rows.length === 1 && results[0]?.sourceConfig.resolverHint
        ? { resolverHint: results[0].sourceConfig.resolverHint }
        : {}),
    } satisfies UrlSourceConfig,
  };
}

async function fetchSingleUrlRuntimeItemsForSource(
  sourceConfig: UrlSourceConfig,
  redditCache?: RedditRuntimePostCache,
) {
  if (isBrowserResolvedRedditUrl(sourceConfig.url)) {
    return fetchRedditUrlRuntimeItemsForSource(sourceConfig, redditCache);
  }

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

async function fetchRedditUrlRuntimeItems(
  sourceConfig: UrlSourceConfig,
  redditCache?: RedditRuntimePostCache,
) {
  return fetchRedditRuntimePostItems({
    urls: [sourceConfig.url],
    allowNsfw: true,
    cache: redditCache,
  });
}

async function fetchRedditUrlRuntimeItemsForSource(
  sourceConfig: UrlSourceConfig,
  redditCache?: RedditRuntimePostCache,
) {
  const items = flattenRuntimeMediaItems(
    await fetchRedditUrlRuntimeItems(sourceConfig, redditCache),
  );
  const title =
    sourceConfig.title ?? redditLinksTitle([sourceConfig.url], items);
  const urlResolution = {
    status: "resolved",
    mode: "provider",
    hint: "provider:reddit",
    provider: "reddit",
    title,
    externalUrl: sourceConfig.url,
    items,
  } satisfies UrlRuntimeResolution;

  return {
    title,
    items,
    allItems: items,
    urlResolution,
    sourceConfig: {
      ...sourceConfig,
      resolverHint: "provider:reddit",
    } satisfies UrlSourceConfig,
  };
}

function urlSourceUrls(sourceConfig: UrlSourceConfig) {
  return sourceConfig.urls?.length ? sourceConfig.urls : [sourceConfig.url];
}

function urlSourceRows(sourceConfig: UrlSourceConfig): UrlSourceRow[] {
  if (sourceConfig.urlRows?.length) return sourceConfig.urlRows;

  return urlSourceUrls(sourceConfig).map((url, index) => ({
    id: `legacy-${index + 1}`,
    url,
  }));
}

function applyUrlRowRuntimeMetadata(
  items: RuntimeFeedItem[],
  row: UrlSourceRow,
): RuntimeFeedItem[] {
  return items.map((item) => ({
    ...item,
    id: `url-row:${row.id}:${item.id}`,
    media: item.media.map((media) =>
      media.type === "video" && row.videoTimeRange
        ? { ...media, videoTimeRange: row.videoTimeRange }
        : media,
    ),
  }));
}

function isBrowserResolvedRedditUrl(value: string) {
  try {
    return isRedditUrl(value);
  } catch {
    return false;
  }
}
