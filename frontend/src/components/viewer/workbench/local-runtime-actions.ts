import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { LocalFileReference } from "@/lib/local-uploads/file-cache";
import type { VideoTimeRange } from "@/lib/viewer/video-time-range";
import {
  canSelectLocalFilesWithHandles,
  canSelectLocalFoldersWithHandles,
  localFileReferencesFromDirectoryPicker,
  localFileReferencesFromPicker,
} from "./local-sources";
import {
  applyRuntimeHydrationResults,
  fetchLocalRuntimeItemsForSource,
} from "./runtime-sources";
import type { FeedSession } from "./types";

export type LocalPickerActionResult =
  | { status: "unsupported" | "cancelled"; fileReferences: [] }
  | { status: "ready"; fileReferences: LocalFileReference[] }
  | { status: "error"; fileReferences: []; error: unknown };

export async function pickLocalFilesWithHandles(): Promise<LocalPickerActionResult> {
  if (!canSelectLocalFilesWithHandles()) {
    return { status: "unsupported", fileReferences: [] };
  }

  try {
    return {
      status: "ready",
      fileReferences: await localFileReferencesFromPicker(),
    };
  } catch (error) {
    return pickerErrorResult(error);
  }
}

export async function pickLocalFolderWithHandles(): Promise<LocalPickerActionResult> {
  if (!canSelectLocalFoldersWithHandles()) {
    return { status: "unsupported", fileReferences: [] };
  }

  try {
    return {
      status: "ready",
      fileReferences: await localFileReferencesFromDirectoryPicker(),
    };
  } catch (error) {
    return pickerErrorResult(error);
  }
}

export async function selectLocalFilesWithHandlesAction({
  addFileReferences,
  onError,
}: {
  addFileReferences: (fileReferences: LocalFileReference[]) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  return applyLocalPickerAction({
    result: await pickLocalFilesWithHandles(),
    addFileReferences,
    onError,
  });
}

export async function selectLocalFolderWithHandlesAction({
  addFileReferences,
  onError,
}: {
  addFileReferences: (fileReferences: LocalFileReference[]) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  return applyLocalPickerAction({
    result: await pickLocalFolderWithHandles(),
    addFileReferences,
    onError,
  });
}

export async function applyLocalPickerAction({
  result,
  addFileReferences,
  onError,
}: {
  result: LocalPickerActionResult;
  addFileReferences: (fileReferences: LocalFileReference[]) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  if (result.status === "unsupported") return false;
  if (result.status === "ready") {
    await addFileReferences(result.fileReferences);
  }
  if (result.status === "error") onError(result.error);

  return true;
}

export async function requestLocalCacheAccessAction({
  id,
  sessions,
  updateSession,
  createLocalRuntimeItems,
  onError,
}: {
  id: string;
  sessions: FeedSession[];
  updateSession: (
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) => void;
  createLocalRuntimeItems: (
    files: File[],
    videoTimeRanges?: Record<string, VideoTimeRange>,
  ) => RuntimeFeedItem[];
  onError: (error: unknown) => void;
}) {
  const session = sessions.find((candidate) => candidate.id === id);
  if (
    !session ||
    session.sourceConfig.kind !== "local" ||
    !session.sourceConfig.cacheSetId
  ) {
    return;
  }

  updateSession(id, (current) => ({
    ...current,
    isRuntimeLoading: true,
    localRestoreStatus: undefined,
  }));

  try {
    const result = await fetchLocalRuntimeItemsForSource({
      sourceConfig: session.sourceConfig,
      createLocalRuntimeItems,
      requestPermission: true,
    });

    updateSession(
      id,
      (current) =>
        applyRuntimeHydrationResults(current ? [current] : [], [
          { id, ...result },
        ])[0] ?? current,
    );
  } catch (error) {
    updateSession(id, (current) => ({
      ...current,
      isRuntimeLoading: false,
      localRestoreStatus: "unavailable",
    }));
    onError(error);
  }
}

function pickerErrorResult(error: unknown): LocalPickerActionResult {
  if (error instanceof DOMException && error.name === "AbortError") {
    return { status: "cancelled", fileReferences: [] };
  }

  return { status: "error", fileReferences: [], error };
}
