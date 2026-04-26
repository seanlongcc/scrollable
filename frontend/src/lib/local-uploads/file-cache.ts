import type {
  LocalFileByteCacheConfirmation,
  LocalFileCacheSaveOptions,
} from "./file-cache-storage";
import { prepareLocalByteCacheWrite } from "./file-cache-storage";

export {
  FIREFOX_BEST_EFFORT_CACHE_QUOTA_BYTES,
  LARGE_LOCAL_BYTE_CACHE_WARNING_BYTES,
  LOCAL_FILE_CACHE_STORAGE_RESERVE_BYTES,
  LocalFileCacheCancelledError,
  LocalFileCacheStorageFullError,
  estimateLocalFileCacheStorage,
  formatLocalFileCacheStorageStatus,
  isLocalFileCacheCancelled,
  isLocalFileCacheStorageFull,
} from "./file-cache-storage";
export type {
  LocalFileByteCacheConfirmation,
  LocalFileCacheSaveOptions,
  LocalFileCacheStorageEstimate,
  LocalFileCacheStorageStatus,
} from "./file-cache-storage";

const DB_NAME = "scrollable-local-file-cache";
const DB_VERSION = 1;
const STORE_NAME = "file-sets";

export type CachedLocalFile = {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  blob: Blob;
};

export type CachedLocalFileHandle = {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  handle: FileSystemFileHandle;
};

export type CachedLocalFileBlobReference = {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  blobRecordId: string;
};

export type LocalFileCacheSet = {
  id: string;
  files: Array<
    CachedLocalFile | CachedLocalFileHandle | CachedLocalFileBlobReference
  >;
};

type LocalFileBlobRecord = {
  id: string;
  blob: Blob;
};

type LocalFileCacheRecord = LocalFileCacheSet | LocalFileBlobRecord;

export type LocalFileReference =
  | File
  | { file: File; handle?: FileSystemFileHandle };

export type LocalFileCacheLoadResult =
  | { status: "loaded"; files: File[] }
  | { status: "missing" | "unavailable" | "permission-needed"; files: [] };

export type LocalFileCacheLoadOptions = {
  requestPermission?: boolean;
};

type FileSystemHandlePermissionDescriptor = { mode?: "read" | "readwrite" };

type PermissionAwareFileSystemFileHandle = FileSystemFileHandle & {
  queryPermission?: (
    descriptor?: FileSystemHandlePermissionDescriptor,
  ) => Promise<PermissionState>;
  requestPermission?: (
    descriptor?: FileSystemHandlePermissionDescriptor,
  ) => Promise<PermissionState>;
};

export function isLocalFileCacheSupported() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

export async function saveLocalFiles(
  id: string,
  fileReferences: LocalFileReference[],
  options: LocalFileCacheSaveOptions = {},
) {
  if (!isLocalFileCacheSupported()) return;

  const references = normalizeLocalFileReferences(fileReferences);
  const confirmation = localFileByteCacheConfirmation(references);

  if (references.every((reference) => reference.handle)) {
    try {
      await writeLocalFileCacheSet({
        id,
        files: references.map(({ file, handle }) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          handle: handle!,
        })),
      } satisfies LocalFileCacheSet);
      return;
    } catch {
      if (!options.skipByteCachePreparation) {
        await prepareLocalByteCacheWrite(confirmation, options);
      }
      await writeSeparateBlobLocalFileCacheSet(id, references);
      return;
    }
  }

  if (!options.skipByteCachePreparation) {
    await prepareLocalByteCacheWrite(confirmation, options);
  }
  const cachedFiles = references.map(
    ({ file }) =>
      ({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        blob: file,
      }) satisfies CachedLocalFile,
  );

  try {
    await writeLocalFileCacheSet({
      id,
      files: cachedFiles,
    } satisfies LocalFileCacheSet);
  } catch {
    await writeSeparateBlobLocalFileCacheSet(id, references);
  }
}

export async function prepareLocalFileByteCacheWrite(
  fileReferences: LocalFileReference[],
  options: LocalFileCacheSaveOptions = {},
) {
  const references = normalizeLocalFileReferences(fileReferences);
  if (!references.length || references.every((reference) => reference.handle)) {
    return false;
  }

  await prepareLocalByteCacheWrite(localFileByteCacheConfirmation(references), {
    confirmLargeByteCache: options.confirmLargeByteCache,
  });
  return true;
}

export async function clearLocalFileCache() {
  if (!isLocalFileCacheSupported() || !indexedDB.deleteDatabase) return;

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new DOMException("Local file cache database is blocked"));
  });
}

export async function pruneLocalFileCacheSets(cacheSetIds: Iterable<string>) {
  if (!isLocalFileCacheSupported()) return;

  const referencedIds = new Set(cacheSetIds);
  const db = await openDb();
  try {
    const keys = await requestFromTransaction<IDBValidKey[]>(
      db,
      "readonly",
      (store) => store.getAllKeys(),
    );
    const staleKeys = keys.filter((key) => {
      if (typeof key !== "string") return false;
      const cacheSetId = cacheSetIdFromRecordId(key);
      return Boolean(cacheSetId) && !referencedIds.has(cacheSetId);
    });
    if (staleKeys.length) {
      await deleteLocalFileCacheRecords(db, staleKeys);
    }
  } finally {
    db.close();
  }
}

export async function loadLocalFiles(
  id: string | undefined,
  options: LocalFileCacheLoadOptions = {},
): Promise<LocalFileCacheLoadResult> {
  if (!id || !isLocalFileCacheSupported()) {
    return { status: "unavailable", files: [] };
  }

  const db = await openDb();
  try {
    const record = await requestFromTransaction<LocalFileCacheSet | undefined>(
      db,
      "readonly",
      (store) => store.get(id),
    );

    if (!record?.files.length) return { status: "missing", files: [] };

    const files: File[] = [];
    for (const file of record.files) {
      if ("blob" in file) {
        files.push(
          new File([file.blob], file.name, {
            type: file.type,
            lastModified: file.lastModified,
          }),
        );
        continue;
      }

      if ("blobRecordId" in file) {
        const result = await fileFromBlobRecord(db, file);
        if (result.status !== "loaded") {
          return { status: result.status, files: [] };
        }
        files.push(result.file);
        continue;
      }

      const result = await fileFromHandle(file.handle, options);
      if (result.status !== "loaded") {
        return { status: result.status, files: [] };
      }
      files.push(result.file);
    }

    return {
      status: "loaded",
      files,
    };
  } finally {
    db.close();
  }
}

function normalizeLocalFileReferences(fileReferences: LocalFileReference[]) {
  return fileReferences.map((reference) =>
    reference instanceof File ? { file: reference } : reference,
  );
}

async function writeLocalFileCacheSet(record: LocalFileCacheSet) {
  await writeLocalFileCacheRecords([record]);
}

async function writeSeparateBlobLocalFileCacheSet(
  id: string,
  references: Array<{ file: File; handle?: FileSystemFileHandle }>,
) {
  const blobRecords: LocalFileBlobRecord[] = references.map(
    ({ file }, index) => ({
      id: localFileBlobRecordId(id, index),
      blob: file,
    }),
  );
  const record = {
    id,
    files: references.map(({ file }, index) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      blobRecordId: localFileBlobRecordId(id, index),
    })),
  } satisfies LocalFileCacheSet;

  const records = [...blobRecords, record];
  try {
    await writeLocalFileCacheRecords(records);
  } catch (error) {
    await deleteLocalFileCacheRecordsByKey(
      records.map((candidate) => candidate.id),
    );
    throw error;
  }
}

async function writeLocalFileCacheRecords(records: LocalFileCacheRecord[]) {
  const db = await openDb();
  try {
    for (const record of records) {
      await requestFromTransaction(db, "readwrite", (store) =>
        store.put(record),
      );
    }
  } finally {
    db.close();
  }
}

async function deleteLocalFileCacheRecords(
  db: IDBDatabase,
  keys: IDBValidKey[],
) {
  for (const key of keys) {
    await requestFromTransaction(db, "readwrite", (store) => store.delete(key));
  }
}

async function deleteLocalFileCacheRecordsByKey(keys: IDBValidKey[]) {
  const db = await openDb();
  try {
    await deleteLocalFileCacheRecords(db, keys);
  } catch {
    // Best-effort cleanup after a failed cache write.
  } finally {
    db.close();
  }
}

async function fileFromBlobRecord(
  db: IDBDatabase,
  file: CachedLocalFileBlobReference,
): Promise<{ status: "loaded"; file: File } | { status: "missing" }> {
  const record = await requestFromTransaction<LocalFileBlobRecord | undefined>(
    db,
    "readonly",
    (store) => store.get(file.blobRecordId),
  );

  if (!record) return { status: "missing" };

  return {
    status: "loaded",
    file: new File([record.blob], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    }),
  };
}

function localFileByteCacheConfirmation(
  references: Array<{ file: File; handle?: FileSystemFileHandle }>,
): LocalFileByteCacheConfirmation {
  return {
    totalBytes: references.reduce((total, { file }) => total + file.size, 0),
    fileCount: references.length,
  };
}

function localFileBlobRecordId(cacheSetId: string, fileIndex: number) {
  return `${cacheSetId}:file:${fileIndex}`;
}

function cacheSetIdFromRecordId(recordId: string) {
  const fileRecordIndex = recordId.indexOf(":file:");
  return fileRecordIndex === -1 ? recordId : recordId.slice(0, fileRecordIndex);
}

async function fileFromHandle(
  handle: FileSystemFileHandle,
  options: LocalFileCacheLoadOptions,
): Promise<
  { status: "loaded"; file: File } | { status: "missing" | "permission-needed" }
> {
  const permission = await ensureHandleReadPermission(handle, options);
  if (permission !== "granted") return { status: "permission-needed" };

  try {
    return { status: "loaded", file: await handle.getFile() };
  } catch (error) {
    if (isPermissionError(error)) return { status: "permission-needed" };
    return { status: "missing" };
  }
}

async function ensureHandleReadPermission(
  handle: FileSystemFileHandle,
  { requestPermission = false }: LocalFileCacheLoadOptions,
) {
  if (!requestPermission) return "granted";

  const permissionAwareHandle = handle as PermissionAwareFileSystemFileHandle;
  const descriptor = {
    mode: "read",
  } satisfies FileSystemHandlePermissionDescriptor;

  try {
    if (permissionAwareHandle.queryPermission) {
      const current = await permissionAwareHandle.queryPermission(descriptor);
      if (current === "granted") return "granted";
    }

    if (permissionAwareHandle.requestPermission) {
      return permissionAwareHandle.requestPermission(descriptor);
    }

    return "granted";
  } catch {
    return requestPermission ? "denied" : "prompt";
  }
}

function isPermissionError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "SecurityError")
  );
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestFromTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = createRequest(transaction.objectStore(STORE_NAME));
    let result: T;
    let settled = false;

    function rejectOnce(error: unknown) {
      if (settled) return;
      settled = true;
      reject(
        error ?? new DOMException("IndexedDB transaction failed", "AbortError"),
      );
    }

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => rejectOnce(request.error);
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    transaction.onabort = () => rejectOnce(transaction.error ?? request.error);
    transaction.onerror = () => rejectOnce(transaction.error ?? request.error);
  });
}
