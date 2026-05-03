import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { LocalFileReference } from "@/lib/local-uploads/file-cache";
import type { SessionPlacementSourceInput } from "./session-placement";
import {
  buildUrlAddSourceConfig,
  buildUrlAddSourceConfigs,
  createRedditSessionSources,
  createUrlSessionSource,
  createUrlSessionSources,
} from "./runtime-sources";
import {
  createLocalSessionSources,
  type LocalByteCacheBatchPreparation,
  type LocalCacheFilesOptions,
  prepareLocalAddFiles,
} from "./local-sources";
import type { SourceAddFormState } from "./source-add-state";
import {
  resolveRedditAddInput,
  separateSourceSlotError,
  splitUrlValues,
} from "./source-add-state";
import type { SourceGroupingMode } from "./types";

type SourceAddActionError = {
  status: "error";
  error: string;
};

type SourceAddSlotError = {
  status: "slot-error";
  error: string;
};

export type RedditSourceAddActionResult =
  | {
      status: "ready";
      sources: SessionPlacementSourceInput[];
    }
  | SourceAddSlotError
  | SourceAddActionError;

export type UrlSourceAddActionResult =
  | {
      status: "ready";
      sources: SessionPlacementSourceInput[];
    }
  | SourceAddSlotError
  | SourceAddActionError;

export type LocalSourceAddPreparation =
  | {
      status: "slot-error";
      error: string;
      uploadableFiles: File[];
      items: RuntimeFeedItem[];
    }
  | {
      status: "empty" | "ready";
      uploadableFiles: File[];
      items: RuntimeFeedItem[];
    };

export type LocalSourceAddActionResult =
  | {
      status: "ready";
      sources: SessionPlacementSourceInput[];
    }
  | SourceAddActionError;

export async function addRedditSourceAction({
  sourceGroupingMode,
  availableSeparateSourceSlots,
  ...form
}: Pick<
  SourceAddFormState,
  | "redditInputMode"
  | "subredditName"
  | "redditSort"
  | "redditTimeRange"
  | "redditUrls"
  | "redditLimit"
> & {
  sourceGroupingMode: SourceGroupingMode;
  availableSeparateSourceSlots: number;
}): Promise<RedditSourceAddActionResult> {
  try {
    const { urls, limit } = resolveRedditAddInput(form);
    const slotError = separateSourceSlotError({
      sourceGroupingMode,
      requestedCount: urls.length,
      availableSeparateSourceSlots,
    });

    if (slotError) {
      return { status: "slot-error", error: slotError };
    }

    return {
      status: "ready",
      sources: await createRedditSessionSources({
        urls,
        limit,
        sourceGroupingMode,
      }),
    };
  } catch (error) {
    return {
      status: "error",
      error: errorMessage(error, "Reddit fetch failed"),
    };
  }
}

export async function addUrlSourceAction({
  urlValue,
  urlTitle,
  availableSeparateSourceSlots,
}: {
  urlValue: string;
  urlTitle: string;
  availableSeparateSourceSlots: number;
}): Promise<UrlSourceAddActionResult> {
  try {
    const urls = splitUrlValues(urlValue);
    const slotError = separateSourceSlotError({
      sourceGroupingMode: "separate",
      requestedCount: urls.length,
      availableSeparateSourceSlots,
    });

    if (slotError) {
      return { status: "slot-error", error: slotError };
    }

    return {
      status: "ready",
      sources:
        urls.length === 1
          ? [
              await createUrlSessionSource(
                buildUrlAddSourceConfig({ urlValue: urls[0]!, urlTitle }),
              ),
            ]
          : await createUrlSessionSources(
              buildUrlAddSourceConfigs({ urls, urlTitle }),
            ),
    };
  } catch (error) {
    return {
      status: "error",
      error: errorMessage(error, "URL source failed"),
    };
  }
}

export function prepareLocalSourceAddAction({
  files,
  sourceGroupingMode,
  availableSeparateSourceSlots,
  createRuntimeItems,
}: {
  files: File[];
  sourceGroupingMode: SourceGroupingMode;
  availableSeparateSourceSlots: number;
  createRuntimeItems: (files: File[]) => RuntimeFeedItem[];
}): LocalSourceAddPreparation {
  return prepareLocalAddFiles({
    files,
    sourceGroupingMode,
    availableSeparateSourceSlots,
    createRuntimeItems,
  });
}

export async function addPreparedLocalSourceAction({
  fileReferences,
  items,
  sourceGroupingMode,
  cacheFiles,
  prepareSeparateByteCacheBatch,
}: {
  fileReferences: LocalFileReference[];
  items: RuntimeFeedItem[];
  sourceGroupingMode: SourceGroupingMode;
  cacheFiles: (
    fileReferences: LocalFileReference[],
    options?: LocalCacheFilesOptions,
  ) => Promise<string | undefined>;
  prepareSeparateByteCacheBatch?: (
    fileReferences: LocalFileReference[],
  ) => Promise<LocalByteCacheBatchPreparation>;
}): Promise<LocalSourceAddActionResult> {
  try {
    return {
      status: "ready",
      sources: await createLocalSessionSources({
        fileReferences,
        items,
        sourceGroupingMode,
        cacheFiles,
        prepareSeparateByteCacheBatch,
      }),
    };
  } catch (error) {
    return {
      status: "error",
      error: errorMessage(error, "Local file cache failed"),
    };
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
