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

export type LocalFileCacheSet = {
  id: string;
  files: Array<CachedLocalFile | CachedLocalFileHandle>;
};

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
) {
  if (!isLocalFileCacheSupported()) return;

  const references = normalizeLocalFileReferences(fileReferences);
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
  } catch (error) {
    if (references.some((reference) => !reference.handle)) {
      throw error;
    }

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
  let record: LocalFileCacheSet | undefined;
  try {
    record = await requestFromTransaction<LocalFileCacheSet | undefined>(
      db,
      "readonly",
      (store) => store.get(id),
    );
  } finally {
    db.close();
  }

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
}

function normalizeLocalFileReferences(fileReferences: LocalFileReference[]) {
  return fileReferences.map((reference) =>
    reference instanceof File ? { file: reference } : reference,
  );
}

async function writeLocalFileCacheSet(record: LocalFileCacheSet) {
  const db = await openDb();
  try {
    await requestFromTransaction(db, "readwrite", (store) => store.put(record));
  } finally {
    db.close();
  }
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
