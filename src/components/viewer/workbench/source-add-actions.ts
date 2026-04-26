import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { SessionPlacementSourceInput } from "./session-placement";
import {
  buildUrlAddSourceConfig,
  createRedditSessionSources,
  createUrlSessionSource,
} from "./runtime-sources";
import {
  createLocalSessionSources,
  prepareLocalAddFiles,
} from "./local-sources";
import type { SourceAddFormState } from "./source-add-state";
import {
  resolveRedditAddInput,
  separateSourceSlotError,
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
      source: SessionPlacementSourceInput;
    }
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
}: {
  urlValue: string;
  urlTitle: string;
}): Promise<UrlSourceAddActionResult> {
  try {
    return {
      status: "ready",
      source: await createUrlSessionSource(
        buildUrlAddSourceConfig({ urlValue, urlTitle }),
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
  uploadableFiles,
  items,
  sourceGroupingMode,
  cacheFiles,
}: {
  uploadableFiles: File[];
  items: RuntimeFeedItem[];
  sourceGroupingMode: SourceGroupingMode;
  cacheFiles: (files: File[]) => Promise<string | undefined>;
}): Promise<LocalSourceAddActionResult> {
  try {
    return {
      status: "ready",
      sources: await createLocalSessionSources({
        files: uploadableFiles,
        items,
        sourceGroupingMode,
        cacheFiles,
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
