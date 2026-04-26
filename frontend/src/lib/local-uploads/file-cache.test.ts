import { afterEach, describe, expect, it, vi } from "vitest";

import { loadLocalFiles, saveLocalFiles } from "./file-cache";

describe("saveLocalFiles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("falls back to file handles when blob storage exceeds browser quota", async () => {
    const storedRecords: unknown[] = [];
    const db = fakeDb({
      put: vi
        .fn()
        .mockImplementationOnce(() =>
          rejectedRequest(
            new DOMException("Quota exceeded", "QuotaExceededError"),
          ),
        )
        .mockImplementationOnce((record: unknown) => {
          storedRecords.push(record);
          return successfulRequest(undefined);
        }),
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
        id: "cache-1",
        files: [
          {
            name: "large.mp4",
            type: "video/mp4",
            size: file.size,
            lastModified: file.lastModified,
            handle,
          },
        ],
      },
    ]);
  });

  it("falls back to file handles when blob storage aborts after request success", async () => {
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
        id: "cache-1",
        files: [
          {
            name: "large.mp4",
            type: "video/mp4",
            size: file.size,
            lastModified: file.lastModified,
            handle,
          },
        ],
      },
    ]);
  });

  it("keeps manual reload fallback when blob storage aborts without file handles", async () => {
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

    await expect(saveLocalFiles("cache-1", [file])).rejects.toThrow(
      "Quota exceeded",
    );
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
});

function fakeDb({
  put = vi.fn(() => successfulRequest(undefined) as IDBRequest<unknown>),
  get = vi.fn(() => successfulRequest(undefined) as IDBRequest<unknown>),
}: {
  put?: (record: unknown) => IDBRequest<unknown>;
  get?: (key: string) => IDBRequest<unknown>;
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

function stubIndexedDb(db: unknown) {
  const openRequest = { result: db } as unknown as IDBOpenDBRequest;
  vi.stubGlobal("indexedDB", {
    open: vi.fn(() => {
      setTimeout(() => openRequest.onsuccess?.(new Event("success")));
      return openRequest;
    }),
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
            const request = successfulRequest(undefined);
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

function successfulRequest<T>(result: T) {
  const request = { result } as IDBRequest<T>;
  setTimeout(() => request.onsuccess?.(new Event("success")));
  return request;
}

function rejectedRequest(error: DOMException) {
  const request = { error } as IDBRequest<unknown>;
  setTimeout(() => request.onerror?.(new Event("error")));
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
