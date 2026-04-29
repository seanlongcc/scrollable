import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearLocalFileCache,
  estimateLocalFileCacheStorage,
  formatLocalFileCacheStorageStatus,
  isLocalFileCacheCancelled,
  isLocalFileCacheStorageFull,
  loadLocalFiles,
  prepareLocalFileByteCacheWrite,
  pruneLocalFileCacheSets,
  saveLocalFiles,
} from "./file-cache";

const MIB = 1024 * 1024;
const GIB = 1024 * MIB;
const ORIGINAL_USER_AGENT = window.navigator.userAgent;

describe("saveLocalFiles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window.navigator, "storage", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window.navigator, "userAgent", {
      value: ORIGINAL_USER_AGENT,
      configurable: true,
    });
  });

  it("stores the File blob directly without reading the whole file into an ArrayBuffer", async () => {
    const storedRecords: unknown[] = [];
    const db = fakeDb({
      put: (record: unknown) => {
        storedRecords.push(record);
        return successfulRequest<unknown>(undefined);
      },
    });
    stubIndexedDb(db);

    const file = new File(["video"], "large.mp4", { type: "video/mp4" });
    const arrayBuffer = vi.fn(async () => {
      throw new DOMException(
        "File exceeds browser 2GB limit",
        "QuotaExceededError",
      );
    });
    Object.defineProperty(file, "arrayBuffer", { value: arrayBuffer });

    await saveLocalFiles("cache-1", [file]);

    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(storedRecords).toEqual([
      {
        id: "cache-1",
        files: [
          {
            name: "large.mp4",
            type: "video/mp4",
            size: file.size,
            lastModified: file.lastModified,
            blob: file,
          },
        ],
      },
    ]);
  });

  it("stores file handles first when every file has a handle", async () => {
    const storedRecords: unknown[] = [];
    const confirmLargeByteCache = vi.fn(async () => true);
    const db = fakeDb({
      put: (record: unknown) => {
        storedRecords.push(record);
        return successfulRequest<unknown>(undefined);
      },
    });

    stubIndexedDb(db);

    const file = new File(["video"], "large.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 1288490189 });
    const handle = {
      kind: "file",
      name: "large.mp4",
      getFile: vi.fn(async () => file),
    } as unknown as FileSystemFileHandle;

    await saveLocalFiles("cache-1", [{ file, handle }], {
      confirmLargeByteCache,
    });

    expect(storedRecords).toEqual([
      {
        id: "cache-1",
        files: [
          {
            name: "large.mp4",
            type: "video/mp4",
            size: 1288490189,
            lastModified: file.lastModified,
            handle,
          },
        ],
      },
    ]);
    expect(confirmLargeByteCache).not.toHaveBeenCalled();
  });

  it("falls back to separate byte records when handle storage aborts after request success", async () => {
    const storedRecords: unknown[] = [];
    const db = fakeDbWithWriteTransactionOutcomes({
      outcomes: [
        {
          status: "abort",
          error: new DOMException("Quota exceeded", "QuotaExceededError"),
        },
        { status: "complete" },
      ],
      onCommittedRecord: (record) => storedRecords.push(record),
    });

    stubIndexedDb(db);

    const file = new File(["video"], "large.mp4", { type: "video/mp4" });
    const handle = {
      kind: "file",
      name: "large.mp4",
      getFile: vi.fn(async () => file),
    } as unknown as FileSystemFileHandle;

    await saveLocalFiles("cache-1", [{ file, handle }]);

    expect(storedRecords).toEqual([
      {
        id: "cache-1:file:0",
        blob: file,
      },
      {
        id: "cache-1",
        files: [
          {
            name: "large.mp4",
            type: "video/mp4",
            size: file.size,
            lastModified: file.lastModified,
            blobRecordId: "cache-1:file:0",
          },
        ],
      },
    ]);
  });

  it("falls back to separate byte records for image batches without file handles", async () => {
    const storedRecords: unknown[] = [];
    const db = fakeDbWithWriteTransactionOutcomes({
      outcomes: [
        {
          status: "abort",
          error: new DOMException("Quota exceeded", "QuotaExceededError"),
        },
        { status: "complete" },
        { status: "complete" },
        { status: "complete" },
      ],
      onCommittedRecord: (record) => storedRecords.push(record),
    });

    stubIndexedDb(db);

    const first = new File(["first"], "one.jpg", { type: "image/jpeg" });
    const second = new File(["second"], "two.jpg", { type: "image/jpeg" });

    await saveLocalFiles("cache-1", [first, second]);

    expect(storedRecords).toEqual([
      {
        id: "cache-1:file:0",
        blob: first,
      },
      {
        id: "cache-1:file:1",
        blob: second,
      },
      {
        id: "cache-1",
        files: [
          {
            name: "one.jpg",
            type: "image/jpeg",
            size: first.size,
            lastModified: first.lastModified,
            blobRecordId: "cache-1:file:0",
          },
          {
            name: "two.jpg",
            type: "image/jpeg",
            size: second.size,
            lastModified: second.lastModified,
            blobRecordId: "cache-1:file:1",
          },
        ],
      },
    ]);
  });

  it("does not write bytes when storage estimate says quota is already full", async () => {
    const storedRecords: unknown[] = [];
    const db = fakeDb({
      put: (record: unknown) => {
        storedRecords.push(record);
        return successfulRequest<unknown>(undefined);
      },
    });
    stubIndexedDb(db);
    stubStorageEstimate({ usage: 9.9 * GIB, quota: 10 * GIB });

    const file = new File(["tiny"], "tiny.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 50 * 1024 });

    await expect(saveLocalFiles("cache-1", [file])).rejects.toSatisfy(
      isLocalFileCacheStorageFull,
    );
    expect(storedRecords).toEqual([]);
  });

  it("loads separate byte records from saved metadata", async () => {
    const db = fakeDbFromRecords([
      {
        id: "cache-1",
        files: [
          {
            name: "one.jpg",
            type: "image/jpeg",
            size: 5,
            lastModified: 1,
            blobRecordId: "cache-1:file:0",
          },
          {
            name: "two.jpg",
            type: "image/jpeg",
            size: 6,
            lastModified: 2,
            blobRecordId: "cache-1:file:1",
          },
        ],
      },
      { id: "cache-1:file:0", blob: new Blob(["first"]) },
      { id: "cache-1:file:1", blob: new Blob(["second"]) },
    ]);

    stubIndexedDb(db);

    const result = await loadLocalFiles("cache-1");

    expect(result.status).toBe("loaded");
    if (result.status !== "loaded") return;
    expect(result.files.map((file) => file.name)).toEqual([
      "one.jpg",
      "two.jpg",
    ]);
    await expect(result.files[0].text()).resolves.toBe("first");
    await expect(result.files[1].text()).resolves.toBe("second");
  });

  it("falls back to separate byte records for a 50 MB video without confirmation", async () => {
    const storedRecords: unknown[] = [];
    const confirmLargeByteCache = vi.fn(async () => true);
    const db = fakeDbWithWriteTransactionOutcomes({
      outcomes: [
        {
          status: "abort",
          error: new DOMException("Quota exceeded", "QuotaExceededError"),
        },
        { status: "complete" },
        { status: "complete" },
      ],
      onCommittedRecord: (record) => storedRecords.push(record),
    });

    stubIndexedDb(db);

    const file = new File(["video"], "small.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 50 * 1024 * 1024 });

    await saveLocalFiles("cache-1", [file], { confirmLargeByteCache });

    expect(storedRecords).toEqual([
      {
        id: "cache-1:file:0",
        blob: file,
      },
      {
        id: "cache-1",
        files: [
          {
            name: "small.mp4",
            type: "video/mp4",
            size: 50 * 1024 * 1024,
            lastModified: file.lastModified,
            blobRecordId: "cache-1:file:0",
          },
        ],
      },
    ]);
    expect(confirmLargeByteCache).not.toHaveBeenCalled();
  });

  it("requests confirmation before large separate byte records are written", async () => {
    const storedRecords: unknown[] = [];
    const events: string[] = [];
    const confirmLargeByteCache = vi.fn(async () => {
      events.push("confirm");
      return true;
    });
    const db = fakeDbWithWriteTransactionOutcomes({
      outcomes: [
        {
          status: "abort",
          error: new DOMException("Quota exceeded", "QuotaExceededError"),
        },
        { status: "complete" },
        { status: "complete" },
      ],
      onCommittedRecord: (record) => {
        events.push("write");
        storedRecords.push(record);
      },
    });

    stubIndexedDb(db);
    stubStorageEstimate({ usage: 1 * GIB, quota: 10 * GIB });

    const file = new File(["video"], "large.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 1288490189 });

    await saveLocalFiles("cache-1", [file], { confirmLargeByteCache });

    expect(confirmLargeByteCache).toHaveBeenCalledWith({
      totalBytes: 1288490189,
      fileCount: 1,
      storageStatus: expect.objectContaining({
        label: "Local cache: 1.0 GB / 10 GB used",
        freeLabel: "9.0 GB free",
      }),
    });
    expect(events).toEqual(["confirm", "write", "write"]);
    expect(storedRecords).toEqual([
      {
        id: "cache-1:file:0",
        blob: file,
      },
      {
        id: "cache-1",
        files: [
          {
            name: "large.mp4",
            type: "video/mp4",
            size: 1288490189,
            lastModified: file.lastModified,
            blobRecordId: "cache-1:file:0",
          },
        ],
      },
    ]);
  });

  it("prepares one large byte-cache confirmation for a selected file batch", async () => {
    stubStorageEstimate({ usage: GIB, quota: 10 * GIB });
    const confirmLargeByteCache = vi.fn(async () => true);
    const first = new File(["first"], "first.png", { type: "image/png" });
    const second = new File(["second"], "second.png", { type: "image/png" });
    Object.defineProperty(first, "size", { value: 300 * MIB });
    Object.defineProperty(second, "size", { value: 300 * MIB });

    await prepareLocalFileByteCacheWrite([first, second], {
      confirmLargeByteCache,
    });

    expect(confirmLargeByteCache).toHaveBeenCalledWith({
      totalBytes: 600 * MIB,
      fileCount: 2,
      storageStatus: {
        label: "Local cache: 1.0 GB / 10 GB used",
        freeLabel: "9.0 GB free",
      },
    });
  });

  it("skips repeated large confirmation after a selected byte batch is prepared", async () => {
    const storedRecords: unknown[] = [];
    const confirmLargeByteCache = vi.fn(async () => false);
    const db = fakeDb({
      put: (record: unknown) => {
        storedRecords.push(record);
        return successfulRequest<unknown>(undefined);
      },
    });
    stubIndexedDb(db);

    const file = new File(["video"], "large.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 600 * MIB });

    await saveLocalFiles("cache-1", [file], {
      confirmLargeByteCache,
      skipByteCachePreparation: true,
    });

    expect(confirmLargeByteCache).not.toHaveBeenCalled();
    expect(storedRecords).toEqual([
      {
        id: "cache-1",
        files: [
          {
            name: "large.mp4",
            type: "video/mp4",
            size: 600 * MIB,
            lastModified: file.lastModified,
            blob: file,
          },
        ],
      },
    ]);
  });

  it("falls back to separate byte records without a hard file size cap", async () => {
    const storedRecords: unknown[] = [];
    const db = fakeDbWithWriteTransactionOutcomes({
      outcomes: [
        {
          status: "abort",
          error: new DOMException("Quota exceeded", "QuotaExceededError"),
        },
        { status: "complete" },
        { status: "complete" },
      ],
      onCommittedRecord: (record) => storedRecords.push(record),
    });

    stubIndexedDb(db);

    const file = new File(["video"], "huge.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 5400143787 });

    await saveLocalFiles("cache-1", [file], {
      confirmLargeByteCache: vi.fn(async () => true),
    });

    expect(storedRecords).toEqual([
      {
        id: "cache-1:file:0",
        blob: file,
      },
      {
        id: "cache-1",
        files: [
          {
            name: "huge.mp4",
            type: "video/mp4",
            size: 5400143787,
            lastModified: file.lastModified,
            blobRecordId: "cache-1:file:0",
          },
        ],
      },
    ]);
  });

  it("does not write separate byte records when large cache confirmation is cancelled", async () => {
    const storedRecords: unknown[] = [];
    const db = fakeDbWithWriteTransactionOutcomes({
      outcomes: [
        {
          status: "abort",
          error: new DOMException("Quota exceeded", "QuotaExceededError"),
        },
      ],
      onCommittedRecord: (record) => storedRecords.push(record),
    });

    stubIndexedDb(db);

    const file = new File(["video"], "large.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 1288490189 });

    await expect(
      saveLocalFiles("cache-1", [file], {
        confirmLargeByteCache: vi.fn(async () => false),
      }),
    ).rejects.toSatisfy(isLocalFileCacheCancelled);
    expect(storedRecords).toEqual([]);
  });

  it("auto-loads a saved handle after refresh when the browser still allows file reads", async () => {
    const handle = {
      kind: "file",
      name: "large.mp4",
      queryPermission: vi.fn(async () => "prompt"),
      requestPermission: vi.fn(async () => "granted"),
      getFile: vi.fn(
        async () => new File(["video"], "large.mp4", { type: "video/mp4" }),
      ),
    };
    const db = fakeDb({
      get: vi.fn(
        () =>
          successfulRequest({
            id: "cache-1",
            files: [
              {
                name: "large.mp4",
                type: "video/mp4",
                size: 5,
                lastModified: 1,
                handle: handle as unknown as FileSystemFileHandle,
              },
            ],
          }) as IDBRequest<unknown>,
      ),
    });

    stubIndexedDb(db);

    await expect(loadLocalFiles("cache-1")).resolves.toMatchObject({
      status: "loaded",
      files: [expect.objectContaining({ name: "large.mp4" })],
    });
    expect(handle.getFile).toHaveBeenCalled();
    expect(handle.requestPermission).not.toHaveBeenCalled();
  });

  it("returns permission-needed when a saved handle requires a user gesture", async () => {
    const file = new File(["video"], "large.mp4", { type: "video/mp4" });
    const handle = {
      kind: "file",
      name: "large.mp4",
      queryPermission: vi
        .fn()
        .mockResolvedValueOnce("prompt")
        .mockResolvedValueOnce("prompt"),
      requestPermission: vi.fn(async () => "granted"),
      getFile: vi
        .fn()
        .mockRejectedValueOnce(
          new DOMException("Permission required", "NotAllowedError"),
        )
        .mockResolvedValueOnce(file),
    };
    const db = fakeDb({
      get: vi.fn(
        () =>
          successfulRequest({
            id: "cache-1",
            files: [
              {
                name: "large.mp4",
                type: "video/mp4",
                size: 5,
                lastModified: 1,
                handle: handle as unknown as FileSystemFileHandle,
              },
            ],
          }) as IDBRequest<unknown>,
      ),
    });

    stubIndexedDb(db);

    await expect(loadLocalFiles("cache-1")).resolves.toEqual({
      status: "permission-needed",
      files: [],
    });

    await expect(
      loadLocalFiles("cache-1", { requestPermission: true }),
    ).resolves.toMatchObject({
      status: "loaded",
      files: [expect.objectContaining({ name: "large.mp4" })],
    });
  });

  it("formats Firefox best-effort storage as local cache out of 10 GB", async () => {
    stubStorageEstimate({ usage: 9.5 * GIB, quota: 50 * GIB });
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 Firefox/125.0",
      configurable: true,
    });

    const status = await estimateLocalFileCacheStorage();

    expect(formatLocalFileCacheStorageStatus(status)).toEqual({
      label: "Local cache: 9.5 GB / 10 GB used",
      freeLabel: "0.5 GB free",
    });
  });

  it("clears the local file cache database", async () => {
    const deleteDatabase = vi.fn(() => successfulOpenRequest(undefined));
    stubIndexedDb(fakeDb({}), { deleteDatabase });

    await clearLocalFileCache();

    expect(deleteDatabase).toHaveBeenCalledWith("scrollable-local-file-cache");
  });

  it("prunes cache sets and per-file blob records not referenced by saved layouts", async () => {
    const deletedKeys: IDBValidKey[] = [];
    const db = fakeDb({
      getAllKeys: () =>
        successfulRequest<IDBValidKey[]>([
          "keep",
          "keep:file:0",
          "drop",
          "drop:file:0",
          "drop:file:1",
        ]),
      deleteRecord: (key) => {
        deletedKeys.push(key);
        return successfulRequest<unknown>(undefined);
      },
    });
    stubIndexedDb(db);

    await pruneLocalFileCacheSets(new Set(["keep"]));

    expect(deletedKeys).toEqual(["drop", "drop:file:0", "drop:file:1"]);
  });
});

function fakeDb({
  put = vi.fn(() => successfulRequest<unknown>(undefined)),
  get = vi.fn(() => successfulRequest<unknown>(undefined)),
  getAllKeys = vi.fn(() => successfulRequest<IDBValidKey[]>([])),
  deleteRecord = vi.fn(() => successfulRequest<unknown>(undefined)),
}: {
  put?: (record: unknown) => IDBRequest<unknown>;
  get?: (key: string) => IDBRequest<unknown>;
  getAllKeys?: () => IDBRequest<IDBValidKey[]>;
  deleteRecord?: (key: IDBValidKey) => IDBRequest<unknown>;
}) {
  return {
    objectStoreNames: { contains: () => true },
    createObjectStore: vi.fn(),
    transaction: vi.fn(() => {
      const transaction = {
        error: null as DOMException | null,
        objectStore: () => ({
          put: (record: unknown) =>
            completeTransactionAfterRequest(put(record), transaction),
          get: (key: string) =>
            completeTransactionAfterRequest(get(key), transaction),
          getAllKeys: () =>
            completeTransactionAfterRequest(getAllKeys(), transaction),
          delete: (key: IDBValidKey) =>
            completeTransactionAfterRequest(deleteRecord(key), transaction),
        }),
        onabort: undefined as ((event: Event) => void) | undefined,
        oncomplete: undefined as ((event: Event) => void) | undefined,
        onerror: undefined as ((event: Event) => void) | undefined,
      };

      return transaction;
    }),
    close: vi.fn(),
  };
}

function stubIndexedDb(
  db: unknown,
  {
    deleteDatabase = vi.fn(() => successfulOpenRequest(undefined)),
  }: { deleteDatabase?: (name: string) => IDBOpenDBRequest } = {},
) {
  const openRequest = { result: db } as unknown as IDBOpenDBRequest;
  vi.stubGlobal("indexedDB", {
    open: vi.fn(() => {
      setTimeout(() => openRequest.onsuccess?.(new Event("success")));
      return openRequest;
    }),
    deleteDatabase,
  });
}

function stubStorageEstimate({
  usage,
  quota,
}: {
  usage?: number;
  quota?: number;
}) {
  Object.defineProperty(window.navigator, "storage", {
    value: {
      estimate: vi.fn(async () => ({ usage, quota })),
      persisted: vi.fn(async () => false),
    },
    configurable: true,
  });
}

function fakeDbWithWriteTransactionOutcomes({
  outcomes,
  onCommittedRecord,
}: {
  outcomes: Array<
    { status: "complete" } | { status: "abort"; error: DOMException }
  >;
  onCommittedRecord: (record: unknown) => void;
}) {
  let transactionIndex = 0;

  return {
    objectStoreNames: { contains: () => true },
    createObjectStore: vi.fn(),
    transaction: vi.fn(() => {
      const outcome = outcomes[transactionIndex++] ?? { status: "complete" };
      let pendingRecord: unknown;
      const transaction = {
        error: outcome.status === "abort" ? outcome.error : null,
        objectStore: () => ({
          put: (record: unknown) => {
            pendingRecord = record;
            const request = successfulRequest<unknown>(undefined);
            setTimeout(() => {
              if (outcome.status === "abort") {
                transaction.onabort?.(new Event("abort"));
                return;
              }

              onCommittedRecord(pendingRecord);
              transaction.oncomplete?.(new Event("complete"));
            });
            return request;
          },
        }),
        onabort: undefined as ((event: Event) => void) | undefined,
        oncomplete: undefined as ((event: Event) => void) | undefined,
        onerror: undefined as ((event: Event) => void) | undefined,
      };

      return transaction;
    }),
    close: vi.fn(),
  };
}

function fakeDbFromRecords(
  records: Array<{ id: string } & Record<string, unknown>>,
) {
  const recordsById = new Map(records.map((record) => [record.id, record]));

  return fakeDb({
    get: (key: string) => successfulRequest<unknown>(recordsById.get(key)),
  });
}

function successfulRequest<T>(result: T) {
  const request = { result } as IDBRequest<T>;
  setTimeout(() => request.onsuccess?.(new Event("success")));
  return request;
}

function successfulOpenRequest(result: unknown) {
  const request = {
    result,
    onblocked: undefined,
    onupgradeneeded: undefined,
  } as unknown as IDBOpenDBRequest;
  setTimeout(() => request.onsuccess?.(new Event("success")));
  return request;
}

function completeTransactionAfterRequest<T>(
  request: IDBRequest<T>,
  transaction: {
    error: DOMException | null;
    oncomplete?: (event: Event) => void;
    onerror?: (event: Event) => void;
  },
) {
  setTimeout(() => {
    if (request.error) {
      transaction.error = request.error;
      transaction.onerror?.(new Event("error"));
      return;
    }

    transaction.oncomplete?.(new Event("complete"));
  });

  return request;
}
