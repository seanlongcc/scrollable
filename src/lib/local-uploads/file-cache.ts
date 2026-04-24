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

export type LocalFileCacheSet = {
  id: string;
  files: CachedLocalFile[];
};

export type LocalFileCacheLoadResult =
  | { status: "loaded"; files: File[] }
  | { status: "missing" | "unavailable"; files: [] };

export function isLocalFileCacheSupported() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

export async function saveLocalFiles(id: string, files: File[]) {
  if (!isLocalFileCacheSupported()) return;

  const cachedFiles = await Promise.all(
    files.map(async (file) => {
      const bytes = await file.arrayBuffer();

      return {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        blob: new Blob([bytes], { type: file.type }),
      } satisfies CachedLocalFile;
    }),
  );

  const db = await openDb();
  await requestFromTransaction(db, "readwrite", (store) =>
    store.put({ id, files: cachedFiles } satisfies LocalFileCacheSet),
  );
  db.close();
}

export async function loadLocalFiles(
  id: string | undefined,
): Promise<LocalFileCacheLoadResult> {
  if (!id || !isLocalFileCacheSupported()) {
    return { status: "unavailable", files: [] };
  }

  const db = await openDb();
  const record = await requestFromTransaction<LocalFileCacheSet | undefined>(
    db,
    "readonly",
    (store) => store.get(id),
  );
  db.close();

  if (!record?.files.length) return { status: "missing", files: [] };

  return {
    status: "loaded",
    files: record.files.map(
      (file) =>
        new File([file.blob], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        }),
    ),
  };
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

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
