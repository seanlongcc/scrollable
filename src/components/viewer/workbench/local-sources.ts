import type { RuntimeFeedItem } from "@/lib/feed/types";
import { saveLocalFiles } from "@/lib/local-uploads/file-cache";
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

export type LocalSessionSource = {
  title: string;
  items: RuntimeFeedItem[];
  localFiles: File[];
  sourceConfig: PersistedSourceConfig;
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
  files,
  canCacheLocalFiles,
  createCacheSetId,
  onCacheRejected,
}: {
  files: File[];
  canCacheLocalFiles: boolean;
  createCacheSetId: () => string;
  onCacheRejected: () => void;
}) {
  if (!canCacheLocalFiles || !files.length) return undefined;

  const cacheSetId = createCacheSetId();
  try {
    await saveLocalFiles(cacheSetId, files);
    return cacheSetId;
  } catch {
    onCacheRejected();
    return undefined;
  }
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

export async function createLocalSessionSources({
  files,
  items,
  sourceGroupingMode,
  cacheFiles,
}: {
  files: File[];
  items: RuntimeFeedItem[];
  sourceGroupingMode: SourceGroupingMode;
  cacheFiles: (files: File[]) => Promise<string | undefined>;
}): Promise<LocalSessionSource[]> {
  if (sourceGroupingMode === "separate") {
    return Promise.all(
      files.map(async (file, index) => {
        const cacheSetId = await cacheFiles([file]);
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
        };
      }),
    );
  }

  const cacheSetId = await cacheFiles(files);

  return [
    {
      title: "Local upload",
      sourceConfig: {
        kind: "local",
        fileCount: items.length,
        ...(cacheSetId ? { cacheSetId } : {}),
      },
      items,
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

  const timer = createTimerState({
    durationSeconds: session.timer.durationSeconds,
    itemCount: items.length,
  });

  return {
    ...session,
    title:
      session.sourceConfig.kind === "local" &&
      session.sourceConfig.fileCount === 1 &&
      items.length === 1
        ? items[0].title
        : session.title,
    items,
    localFiles: files,
    isRuntimeLoading: false,
    sourceConfig: {
      kind: "local",
      fileCount: items.length,
      ...(cacheSetId ? { cacheSetId } : {}),
    },
    timer: {
      ...timer,
      isPaused: session.timer.isPaused,
    },
  };
}
