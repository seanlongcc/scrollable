import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { LocalFileReference } from "@/lib/local-uploads/file-cache";
import { normalizeRedditLimit } from "./helpers";
import { getUploadableFiles } from "./local-sources";
import {
  fetchEditedRedditSource,
  fetchEditedUrlSource,
} from "./runtime-sources";
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
};

export type PreparedRedditSourceEdit = {
  status: "ready";
  urls: string[];
  limit: number;
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
    }
  | SourceEditActionError;

export function prepareRedditSourceEditAction({
  urls,
  limit,
}: {
  urls: string[];
  limit: number;
}): PreparedRedditSourceEdit | SourceEditValidationError {
  if (!urls.length) {
    return {
      status: "validation-error",
      error: "Keep at least one Reddit source",
    };
  }

  return {
    status: "ready",
    urls,
    limit: normalizeRedditLimit(limit),
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
    return {
      status: "error",
      error: errorMessage(error, "Reddit fetch failed"),
    };
  }
}

export async function editUrlSourceAction({
  currentSource,
  url,
  title,
}: {
  currentSource?: FeedSession;
  url: string;
  title?: string;
}): Promise<UrlSourceEditActionResult> {
  try {
    return {
      status: "ready",
      result: await fetchEditedUrlSource({
        currentSource,
        url,
        title,
      }),
    };
  } catch (error) {
    return {
      status: "error",
      error: errorMessage(error, "URL source failed"),
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
}: {
  fileReferences: LocalFileReference[];
  createRuntimeItems: (files: File[]) => RuntimeFeedItem[];
  cacheFiles: (
    fileReferences: LocalFileReference[],
  ) => Promise<string | undefined>;
}): Promise<LocalSourceEditActionResult> {
  const files = fileReferences.map((reference) =>
    reference instanceof File ? reference : reference.file,
  );

  try {
    return {
      status: "ready",
      items: createRuntimeItems(files),
      cacheSetId: await cacheFiles(fileReferences),
      files,
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
