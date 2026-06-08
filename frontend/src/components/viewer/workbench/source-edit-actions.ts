import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { LocalFileReference } from "@/lib/local-uploads/file-cache";
import type { UrlSourceRow } from "@/lib/url-source/types";
import {
  normalizeVideoTimeRange,
  type VideoTimeRange,
} from "@/lib/viewer/video-time-range";
import { normalizeRedditLimit, splitRedditUrls } from "./helpers";
import { getUploadableFiles } from "./local-sources";
import {
  fetchEditedRedditSource,
  fetchEditedUrlSource,
} from "./runtime-sources";
import {
  runtimeSourceNotice,
  type RuntimeNotice,
} from "./runtime-source-notices";
import { splitUrlValues } from "./source-add-state";
import type {
  EditedRedditSourceState,
  EditedUrlSourceState,
} from "./source-edit-state";
import type { FeedSession } from "./types";

type SourceEditValidationError = {
  status: "validation-error";
  error: string;
};

type SourceEditActionError = {
  status: "error";
  error: string;
  notice: RuntimeNotice;
};

export type PreparedRedditSourceEdit = {
  status: "ready";
  urls: string[];
  limit: number;
};

export type PreparedUrlSourceEdit = {
  status: "ready";
  urls: string[];
};

export type PreparedUrlRowsSourceEdit = {
  status: "ready";
  rows: UrlSourceRow[];
};

export type RedditSourceEditActionResult =
  | {
      status: "ready";
      result: EditedRedditSourceState;
    }
  | SourceEditActionError;

export type UrlSourceEditActionResult =
  | {
      status: "ready";
      result: EditedUrlSourceState;
    }
  | SourceEditActionError;

export type PreparedLocalSourceEdit =
  | {
      status: "ready";
      files: File[];
    }
  | SourceEditValidationError;

export type LocalSourceEditActionResult =
  | {
      status: "ready";
      items: RuntimeFeedItem[];
      cacheSetId?: string;
      files: File[];
      videoTimeRanges?: Record<string, VideoTimeRange>;
    }
  | SourceEditActionError;

export function prepareRedditSourceEditAction({
  urls,
  limit,
}: {
  urls: string[];
  limit: number;
}): PreparedRedditSourceEdit | SourceEditValidationError {
  const parsedUrls = urls.flatMap(splitRedditUrls);
  if (!parsedUrls.length) {
    return {
      status: "validation-error",
      error: "Keep at least one Reddit source",
    };
  }

  return {
    status: "ready",
    urls: parsedUrls,
    limit: normalizeRedditLimit(limit),
  };
}

export function prepareUrlSourceEditAction({
  urlValue,
}: {
  urlValue: string;
}): PreparedUrlSourceEdit | SourceEditValidationError {
  try {
    return {
      status: "ready",
      urls: splitUrlValues(urlValue),
    };
  } catch (error) {
    return {
      status: "validation-error",
      error: errorMessage(error, "Enter one or more URLs"),
    };
  }
}

export function prepareUrlRowsSourceEditAction({
  rows,
}: {
  rows: UrlSourceRow[];
}): PreparedUrlRowsSourceEdit | SourceEditValidationError {
  const nextRows: UrlSourceRow[] = [];

  for (const row of rows) {
    const url = row.url.trim();
    if (!url) continue;

    const range = normalizeVideoTimeRange(row.videoTimeRange);
    if (!range.ok) {
      return {
        status: "validation-error",
        error: range.error,
      };
    }

    nextRows.push({
      id: row.id,
      url,
      ...(range.range ? { videoTimeRange: range.range } : {}),
    });
  }

  if (!nextRows.length) {
    return {
      status: "validation-error",
      error: "Enter one or more URLs",
    };
  }

  return {
    status: "ready",
    rows: nextRows,
  };
}

export async function editPreparedRedditSourceAction({
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
}): Promise<RedditSourceEditActionResult> {
  try {
    return {
      status: "ready",
      result: await fetchEditedRedditSource({
        currentSource,
        urls,
        limit,
        hiddenItemIds,
        unhiddenItemHashes,
      }),
    };
  } catch (error) {
    const notice = runtimeSourceNotice(error, {
      fallback: "Reddit fetch failed",
    });
    return {
      status: "error",
      error: notice.message,
      notice,
    };
  }
}

export async function editUrlSourceAction({
  currentSource,
  urls,
  rows,
  title,
}: {
  currentSource?: FeedSession;
  urls?: string[];
  rows?: UrlSourceRow[];
  title?: string;
}): Promise<UrlSourceEditActionResult> {
  try {
    return {
      status: "ready",
      result: await fetchEditedUrlSource({
        currentSource,
        urls: urls ?? rows?.map((row) => row.url) ?? [],
        rows,
        title,
      }),
    };
  } catch (error) {
    const notice = runtimeSourceNotice(error, {
      fallback: "URL source failed",
    });
    return {
      status: "error",
      error: notice.message,
      notice,
    };
  }
}

export function prepareLocalSourceEditAction({
  files,
}: {
  files: File[];
}): PreparedLocalSourceEdit {
  const uploadableFiles = getUploadableFiles(files);

  if (!uploadableFiles.length) {
    return {
      status: "validation-error",
      error: "Keep at least one local file",
    };
  }

  return { status: "ready", files: uploadableFiles };
}

export async function editPreparedLocalSourceAction({
  fileReferences,
  createRuntimeItems,
  cacheFiles,
  videoTimeRanges,
}: {
  fileReferences: LocalFileReference[];
  createRuntimeItems: (
    files: File[],
    videoTimeRanges?: Record<string, VideoTimeRange>,
  ) => RuntimeFeedItem[];
  cacheFiles: (
    fileReferences: LocalFileReference[],
  ) => Promise<string | undefined>;
  videoTimeRanges?: Record<string, VideoTimeRange>;
}): Promise<LocalSourceEditActionResult> {
  const files = fileReferences.map((reference) =>
    reference instanceof File ? reference : reference.file,
  );

  try {
    return {
      status: "ready",
      items: createRuntimeItems(files, videoTimeRanges),
      cacheSetId: await cacheFiles(fileReferences),
      files,
      videoTimeRanges,
    };
  } catch (error) {
    const notice = runtimeSourceNotice(error, {
      fallback: "Local file cache failed",
    });
    return {
      status: "error",
      error: notice.message,
      notice,
    };
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
