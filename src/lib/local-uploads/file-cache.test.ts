import { afterEach, describe, expect, it, vi } from "vitest";

import { saveLocalFiles } from "./file-cache";

describe("saveLocalFiles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores the File blob directly without reading the whole file into an ArrayBuffer", async () => {
    const storedRecords: unknown[] = [];
    const db = {
      objectStoreNames: { contains: () => true },
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => ({
        objectStore: () => ({
          put: (record: unknown) => {
            storedRecords.push(record);
            const putRequest = {} as IDBRequest<unknown>;
            setTimeout(() => putRequest.onsuccess?.(new Event("success")));
            return putRequest;
          },
        }),
      })),
      close: vi.fn(),
    };
    const openRequest = { result: db } as unknown as IDBOpenDBRequest;
    vi.stubGlobal("indexedDB", {
      open: vi.fn(() => {
        setTimeout(() => openRequest.onsuccess?.(new Event("success")));
        return openRequest;
      }),
    });

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
});
