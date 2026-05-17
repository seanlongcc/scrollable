import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  clearLocalFileCache,
  estimateLocalFileCacheStorage,
  FeedWorkbench,
  formatLocalFileCacheStorageStatus,
  installFeedWorkbenchTestHooks,
  isLocalFileCacheSupported,
  loadLocalFiles,
  prepareLocalFileByteCacheWrite,
  saveLocalFiles,
  selectSourceGrouping,
  stubObjectUrls,
  stubRandomUuids,
  WORKSPACE_STORAGE_KEY,
} from "./feed-workbench-test-utils";

const MIB = 1024 * 1024;

describe("FeedWorkbench local cache storage", () => {
  installFeedWorkbenchTestHooks();

  it("shows local cache usage when saving a layout with local uploads", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "cache-1", "session-1"]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);
    vi.mocked(estimateLocalFileCacheStorage).mockResolvedValue({
      status: "available",
      usageBytes: 1_073_741_824,
      quotaBytes: 10_737_418_240,
      displayQuotaBytes: 10_737_418_240,
      persisted: false,
    });
    vi.mocked(formatLocalFileCacheStorageStatus).mockReturnValue({
      label: "Local cache: 1.0 GB / 10 GB used",
      freeLabel: "9.0 GB free",
    });

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Local" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["a"], "cached.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("cached.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save layout" }));

    expect(
      await screen.findByText("Local cache: 1.0 GB / 10 GB used"),
    ).toBeInTheDocument();
    expect(screen.getByText("9.0 GB free")).toBeInTheDocument();
  });

  it("preflights separate local uploads as one selected byte-copy batch", async () => {
    stubObjectUrls();
    stubRandomUuids([
      "workspace-1",
      "item-a",
      "item-b",
      "cache-a",
      "session-a",
      "cache-b",
      "session-b",
    ]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);
    vi.mocked(prepareLocalFileByteCacheWrite).mockResolvedValue(true);

    const first = new File(["a"], "a.png", { type: "image/png" });
    const second = new File(["b"], "b.png", { type: "image/png" });
    Object.defineProperty(first, "size", { value: 300 * MIB });
    Object.defineProperty(second, "size", { value: 300 * MIB });

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Local" }));
    await selectSourceGrouping(user, "Separate sources");
    await user.upload(screen.getByLabelText("Image/video files"), [
      first,
      second,
    ]);

    expect(prepareLocalFileByteCacheWrite).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          file: expect.objectContaining({ name: "a.png" }),
        }),
        expect.objectContaining({
          file: expect.objectContaining({ name: "b.png" }),
        }),
      ],
      expect.objectContaining({ confirmLargeByteCache: expect.any(Function) }),
    );
    const cacheWrites = vi.mocked(saveLocalFiles).mock.calls;
    expect(
      cacheWrites.map(
        ([, references]) =>
          (references[0] as { file: File } | undefined)?.file.name,
      ),
    ).toEqual(["a.png", "b.png"]);
    expect(
      cacheWrites.every(
        ([, , options]) => options?.skipByteCachePreparation === true,
      ),
    ).toBe(true);
  });

  it("warns before copying large Firefox local bytes and restores after confirm", async () => {
    stubObjectUrls();
    stubRandomUuids(["item-1", "cache-1", "session-1"]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);
    vi.mocked(saveLocalFiles).mockImplementation(
      async (_id, _fileReferences, options) => {
        const allowed = await options?.confirmLargeByteCache?.({
          totalBytes: 1288490189,
          fileCount: 1,
          storageStatus: {
            label: "Local cache: 1.0 GB / 10 GB used",
            freeLabel: "9.0 GB free",
          },
        });
        if (!allowed) {
          const error = new Error("Local file byte cache cancelled");
          error.name = "LocalFileCacheCancelledError";
          throw error;
        }
      },
    );

    const user = userEvent.setup();
    const { unmount } = render(<FeedWorkbench />);
    const file = new File(["video"], "large.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 1288490189 });

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Local" }));
    await user.upload(screen.getByLabelText("Image/video files"), file);

    expect(
      await screen.findByText(
        "This will copy about 1.2 GB into browser storage for auto-restore. Continue?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Local cache: 1.0 GB / 10 GB used"),
    ).toBeInTheDocument();
    expect(screen.getByText("9.0 GB free")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy and continue" }));

    expect(await screen.findByLabelText("large.mp4")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "").toContain(
      '"cacheSetId":"cache-1"',
    );

    unmount();
    vi.mocked(loadLocalFiles).mockResolvedValue({
      status: "loaded",
      files: [new File(["video"], "large.mp4", { type: "video/mp4" })],
    });
    render(<FeedWorkbench />);

    expect(await screen.findByLabelText("large.mp4")).toBeInTheDocument();
    expect(loadLocalFiles).toHaveBeenCalledWith("cache-1");
  });

  it("leaves manual reload behavior when large Firefox byte-cache warning is cancelled", async () => {
    stubObjectUrls();
    stubRandomUuids(["item-1", "cache-1", "session-1"]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);
    vi.mocked(saveLocalFiles).mockImplementation(
      async (_id, _fileReferences, options) => {
        const allowed = await options?.confirmLargeByteCache?.({
          totalBytes: 1288490189,
          fileCount: 1,
        });
        if (!allowed) {
          const error = new Error("Local file byte cache cancelled");
          error.name = "LocalFileCacheCancelledError";
          throw error;
        }
      },
    );

    const user = userEvent.setup();
    const file = new File(["video"], "large.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 1288490189 });
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Local" }));
    await user.upload(screen.getByLabelText("Image/video files"), file);

    expect(
      await screen.findByText(
        "This will copy about 1.2 GB into browser storage for auto-restore. Continue?",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip" }));

    expect(await screen.findByLabelText("large.mp4")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));

    expect(
      window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "",
    ).not.toContain("cacheSetId");
  });

  it("shows storage-full cache controls and saves after clearing cache", async () => {
    stubObjectUrls();
    stubRandomUuids([
      "item-1",
      "cache-full",
      "session-1",
      "item-2",
      "cache-ok",
      "session-2",
    ]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);
    vi.mocked(saveLocalFiles)
      .mockRejectedValueOnce(
        Object.assign(new Error("Local file cache storage is full"), {
          name: "LocalFileCacheStorageFullError",
          storageStatus: {
            label: "Local cache: 10 GB / 10 GB used",
            freeLabel: "0.0 GB free",
          },
          requiredBytes: 134_217_728,
        }),
      )
      .mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Local" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["a"], "full.png", { type: "image/png" }),
    );

    expect(await screen.findByAltText("full.png")).toBeInTheDocument();
    expect(
      await screen.findByText("Local file cache full"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Local cache: 10 GB / 10 GB used"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Clear local media cache" }),
    );
    expect(clearLocalFileCache).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Local" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["b"], "after-clear.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("after-clear.png")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));

    expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "").toContain(
      '"cacheSetId":"cache-ok"',
    );
  });
});
