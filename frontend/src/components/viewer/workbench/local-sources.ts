import type { RuntimeFeedItem } from "@/lib/feed/types";
import type {
  LocalFileByteCacheConfirmation,
  LocalFileCacheStorageStatus,
  LocalFileReference,
} from "@/lib/local-uploads/file-cache";
import {
  estimateLocalFileCacheStorage,
  formatLocalFileCacheStorageStatus,
  isLocalFileCacheCancelled,
  isLocalFileCacheStorageFull,
  prepareLocalFileByteCacheWrite,
  saveLocalFiles,
} from "@/lib/local-uploads/file-cache";
import { LocalObjectUrlRegistry } from "@/lib/local-uploads/object-urls";
import { createTimerState } from "@/lib/viewer/timer";
import type {
  DataTransferItemWithEntry,
  FeedSession,
  FileSystemDirectoryEntryLike,
  FileSystemEntryLike,
  FileSystemFileEntryLike,
  PersistedSourceConfig,
  SourceGroupingMode,
} from "./types";
import { separateSourceSlotError } from "./source-add-state";
import { randomizeRuntimeItems } from "./source-order-state";

export type LocalSessionSource = {
  title: string;
  items: RuntimeFeedItem[];
  allItems?: RuntimeFeedItem[];
  isOrderRandomized?: boolean;
  localFiles: File[];
  sourceConfig: PersistedSourceConfig;
};

export type LocalCacheFilesOptions = {
  skipByteCachePreparation?: boolean;
};

export type LocalByteCacheBatchPreparation =
  | "prepared"
  | "skip-cache"
  | "not-needed";

export type LocalAddFilesPreparation =
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

type LocalCacheFailureHandlers = {
  onCacheRejected: () => void;
  onStorageFull?: (status: LocalFileCacheStorageStatus) => void;
};

type WindowWithLocalFilePickers = Window & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
  }) => Promise<FileSystemFileHandle[]>;
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
};

type IterableFileSystemDirectoryHandle = FileSystemDirectoryHandle & {
  values?: () => AsyncIterable<FileSystemHandle>;
};

export function getUploadableFiles(files: File[]) {
  return files.filter(isUploadableFile);
}

export function isUploadableFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/")
  );
}

export async function filesFromDataTransfer(dataTransfer: DataTransfer) {
  const entries: FileSystemEntryLike[] = [];
  for (const item of Array.from(dataTransfer.items ?? [])) {
    const entry = (item as DataTransferItemWithEntry).webkitGetAsEntry?.() as
      | FileSystemEntryLike
      | null
      | undefined;
    if (entry) entries.push(entry);
  }

  if (entries.length) {
    return (await Promise.all(entries.map(filesFromFileSystemEntry))).flat();
  }

  return Array.from(dataTransfer.files ?? []);
}

export function localFileReferencesFromFiles(
  files: File[],
): LocalFileReference[] {
  return files.map((file) => ({ file }));
}

export function filesFromLocalFileReferences(references: LocalFileReference[]) {
  return references.map((reference) =>
    reference instanceof File ? reference : reference.file,
  );
}

export function canSelectLocalFilesWithHandles() {
  return (
    typeof window !== "undefined" &&
    typeof (window as WindowWithLocalFilePickers).showOpenFilePicker ===
      "function"
  );
}

export function canSelectLocalFoldersWithHandles() {
  return (
    typeof window !== "undefined" &&
    typeof (window as WindowWithLocalFilePickers).showDirectoryPicker ===
      "function"
  );
}

export async function localFileReferencesFromPicker() {
  const picker = (window as WindowWithLocalFilePickers).showOpenFilePicker;
  if (!picker) return [];

  const handles = await picker({ multiple: true });

  return Promise.all(
    handles.map(async (handle) => ({
      file: await handle.getFile(),
      handle,
    })),
  );
}

export async function localFileReferencesFromDirectoryPicker() {
  const picker = (window as WindowWithLocalFilePickers).showDirectoryPicker;
  if (!picker) return [];

  return localFileReferencesFromDirectoryHandle(await picker());
}

async function localFileReferencesFromDirectoryHandle(
  directory: FileSystemDirectoryHandle,
): Promise<LocalFileReference[]> {
  const iterableDirectory = directory as IterableFileSystemDirectoryHandle;
  const values = iterableDirectory.values?.();
  if (!values) return [];

  const references: LocalFileReference[] = [];
  for await (const handle of values) {
    if (handle.kind === "file") {
      const fileHandle = handle as FileSystemFileHandle;
      references.push({ file: await fileHandle.getFile(), handle: fileHandle });
      continue;
    }

    references.push(
      ...(await localFileReferencesFromDirectoryHandle(
        handle as FileSystemDirectoryHandle,
      )),
    );
  }

  return references;
}

export async function filesFromFileSystemEntry(
  entry: FileSystemEntryLike,
): Promise<File[]> {
  if (entry.isFile) {
    return [await fileFromFileSystemEntry(entry as FileSystemFileEntryLike)];
  }

  if (entry.isDirectory) {
    const children = await entriesFromDirectoryEntry(
      entry as FileSystemDirectoryEntryLike,
    );
    return (await Promise.all(children.map(filesFromFileSystemEntry))).flat();
  }

  return [];
}

export function fileFromFileSystemEntry(entry: FileSystemFileEntryLike) {
  return new Promise<File>((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

export async function entriesFromDirectoryEntry(
  entry: FileSystemDirectoryEntryLike,
) {
  const reader = entry.createReader();
  const entries: FileSystemEntryLike[] = [];

  while (true) {
    const batch = await new Promise<FileSystemEntryLike[]>(
      (resolve, reject) => {
        reader.readEntries(resolve, reject);
      },
    );

    if (!batch.length) return entries;
    entries.push(...batch);
  }
}

export async function cacheLocalFiles({
  fileReferences,
  canCacheLocalFiles,
  createCacheSetId,
  confirmLargeByteCache,
  skipByteCachePreparation = false,
  onCacheSaved,
  onCacheRejected,
  onStorageFull,
}: {
  fileReferences: LocalFileReference[];
  canCacheLocalFiles: boolean;
  createCacheSetId: () => string;
  confirmLargeByteCache?: (
    confirmation: LocalFileByteCacheConfirmation,
  ) => Promise<boolean> | boolean;
  skipByteCachePreparation?: boolean;
  onCacheSaved?: (status: LocalFileCacheStorageStatus) => void;
  onCacheRejected: () => void;
  onStorageFull?: (status: LocalFileCacheStorageStatus) => void;
}) {
  const files = filesFromLocalFileReferences(fileReferences);
  if (!canCacheLocalFiles || !files.length) return undefined;

  const cacheSetId = createCacheSetId();
  try {
    await saveLocalFiles(cacheSetId, fileReferences, {
      confirmLargeByteCache,
      skipByteCachePreparation,
    });
    onCacheSaved?.(
      formatLocalFileCacheStorageStatus(await estimateLocalFileCacheStorage()),
    );
    return cacheSetId;
  } catch (error) {
    handleLocalCacheFailure(error, { onCacheRejected, onStorageFull });
    return undefined;
  }
}

export async function prepareLocalByteCacheBatch({
  fileReferences,
  canCacheLocalFiles,
  confirmLargeByteCache,
  onCacheRejected,
  onStorageFull,
}: {
  fileReferences: LocalFileReference[];
  canCacheLocalFiles: boolean;
  confirmLargeByteCache?: (
    confirmation: LocalFileByteCacheConfirmation,
  ) => Promise<boolean> | boolean;
  onCacheRejected: () => void;
  onStorageFull?: (status: LocalFileCacheStorageStatus) => void;
}): Promise<LocalByteCacheBatchPreparation> {
  const files = filesFromLocalFileReferences(fileReferences);
  if (!canCacheLocalFiles || !files.length) return "skip-cache";

  try {
    const prepared = await prepareLocalFileByteCacheWrite(fileReferences, {
      confirmLargeByteCache,
    });
    return prepared ? "prepared" : "not-needed";
  } catch (error) {
    handleLocalCacheFailure(error, { onCacheRejected, onStorageFull });
    return "skip-cache";
  }
}

function handleLocalCacheFailure(
  error: unknown,
  { onCacheRejected, onStorageFull }: LocalCacheFailureHandlers,
) {
  if (isLocalFileCacheCancelled(error)) return;
  if (isLocalFileCacheStorageFull(error)) {
    onStorageFull?.(localCacheStorageFullStatus(error));
    return;
  }

  onCacheRejected();
}

function localCacheStorageFullStatus(
  error: unknown,
): LocalFileCacheStorageStatus {
  if (error instanceof Error && "storageStatus" in error) {
    return error.storageStatus as LocalFileCacheStorageStatus;
  }

  return { label: "Local cache: storage full" };
}

export function createLocalRuntimeItems(
  files: File[],
  registryRef: { current: LocalObjectUrlRegistry | null },
) {
  if (!files.length) return [];
  if (registryRef.current === null) {
    registryRef.current = new LocalObjectUrlRegistry();
  }

  return files.map((file) => registryRef.current!.add(file));
}

export function prepareLocalAddFiles({
  files,
  sourceGroupingMode,
  availableSeparateSourceSlots,
  createRuntimeItems,
}: {
  files: File[];
  sourceGroupingMode: SourceGroupingMode;
  availableSeparateSourceSlots: number;
  createRuntimeItems: (files: File[]) => RuntimeFeedItem[];
}): LocalAddFilesPreparation {
  const uploadableFiles = getUploadableFiles(files);
  const slotError = separateSourceSlotError({
    sourceGroupingMode,
    requestedCount: uploadableFiles.length,
    availableSeparateSourceSlots,
  });

  if (slotError) {
    return {
      status: "slot-error",
      error: slotError,
      uploadableFiles,
      items: [],
    };
  }

  const items = createRuntimeItems(uploadableFiles);

  return {
    status: items.length ? "ready" : "empty",
    uploadableFiles,
    items,
  };
}

export async function createLocalSessionSources({
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
}): Promise<LocalSessionSource[]> {
  const files = filesFromLocalFileReferences(fileReferences);

  if (sourceGroupingMode === "separate") {
    const batchPreparation = prepareSeparateByteCacheBatch
      ? await prepareSeparateByteCacheBatch(fileReferences)
      : "not-needed";

    return Promise.all(
      files.map(async (file, index) => {
        const fileReference = fileReferences[index] ?? file;
        const cacheSetId =
          batchPreparation === "skip-cache"
            ? undefined
            : await cacheFiles([fileReference], {
                skipByteCachePreparation: batchPreparation === "prepared",
              });
        const item = items[index];

        return {
          title: item.title,
          localFiles: [file],
          sourceConfig: {
            kind: "local",
            fileCount: 1,
            ...(cacheSetId ? { cacheSetId } : {}),
          },
          items: [item],
          allItems: [item],
        };
      }),
    );
  }

  const cacheSetId = await cacheFiles(fileReferences);
  const randomizedItems = randomizeRuntimeItems(items);

  return [
    {
      title: "Local upload",
      sourceConfig: {
        kind: "local",
        fileCount: randomizedItems.length,
        ...(cacheSetId ? { cacheSetId } : {}),
      },
      items: randomizedItems,
      allItems: items,
      isOrderRandomized: true,
      localFiles: files,
    },
  ];
}

export function applyLocalRuntimeItemsToSession({
  session,
  items,
  cacheSetId,
  files,
}: {
  session: FeedSession;
  items: RuntimeFeedItem[];
  cacheSetId?: string;
  files?: File[];
}): FeedSession {
  if (!items.length) {
    return { ...session, isRuntimeLoading: false };
  }

  const isOrderRandomized = session.isOrderRandomized !== false;
  const nextItems = isOrderRandomized ? randomizeRuntimeItems(items) : items;
  const timer = createTimerState({
    durationSeconds: session.timer.durationSeconds,
    itemCount: nextItems.length,
  });

  return {
    ...session,
    title:
      session.sourceConfig.kind === "local" &&
      session.sourceConfig.fileCount === 1 &&
      nextItems.length === 1
        ? nextItems[0].title
        : session.title,
    items: nextItems,
    allItems: items,
    isOrderRandomized,
    localFiles: files,
    localRestoreStatus: undefined,
    isRuntimeLoading: false,
    sourceConfig: {
      kind: "local",
      fileCount: nextItems.length,
      ...(cacheSetId ? { cacheSetId } : {}),
    },
    timer: {
      ...timer,
      isPaused: session.timer.isPaused,
    },
  };
}
