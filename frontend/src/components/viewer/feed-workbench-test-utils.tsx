import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";

import type { RuntimeFeedItem } from "@/lib/feed/types";

vi.mock("@/lib/local-uploads/file-cache", () => ({
  clearLocalFileCache: vi.fn(async () => undefined),
  estimateLocalFileCacheStorage: vi.fn(async () => ({
    status: "unavailable",
  })),
  formatLocalFileCacheStorageStatus: vi.fn(() => ({
    label: "Local cache: storage usage unavailable",
  })),
  isLocalFileCacheSupported: vi.fn(() => false),
  isLocalFileCacheCancelled: vi.fn(
    (error: unknown) =>
      error instanceof Error && error.name === "LocalFileCacheCancelledError",
  ),
  isLocalFileCacheStorageFull: vi.fn(
    (error: unknown) =>
      error instanceof Error && error.name === "LocalFileCacheStorageFullError",
  ),
  loadLocalFiles: vi.fn(async () => ({
    status: "unavailable",
    files: [],
  })),
  prepareLocalFileByteCacheWrite: vi.fn(async () => false),
  pruneLocalFileCacheSets: vi.fn(async () => undefined),
  saveLocalFiles: vi.fn(async () => undefined),
}));

const fileCache = await import("@/lib/local-uploads/file-cache");
const feedWorkbench = await import("./feed-workbench");

export const { FeedWorkbench } = feedWorkbench;
export const {
  clearLocalFileCache,
  estimateLocalFileCacheStorage,
  formatLocalFileCacheStorageStatus,
  isLocalFileCacheSupported,
  loadLocalFiles,
  prepareLocalFileByteCacheWrite,
  saveLocalFiles,
} = fileCache;

export const WORKSPACE_STORAGE_KEY = "scrollable.workspaces.v1";
export const WORKSPACE_TEMPLATE_STORAGE_KEY =
  "scrollable.workspace-templates.v1";
export const WORKSPACE_SESSION_STORAGE_KEY = "scrollable.workspace-session.v1";

export function installFeedWorkbenchTestHooks() {
  beforeEach(() => {
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = vi.fn();
    }
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn();
    }
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(false);
    vi.mocked(estimateLocalFileCacheStorage).mockResolvedValue({
      status: "unavailable",
    });
    vi.mocked(formatLocalFileCacheStorageStatus).mockReturnValue({
      label: "Local cache: storage usage unavailable",
    });
    vi.mocked(clearLocalFileCache).mockResolvedValue(undefined);
    vi.mocked(loadLocalFiles).mockResolvedValue({
      status: "unavailable",
      files: [],
    });
    vi.mocked(prepareLocalFileByteCacheWrite).mockResolvedValue(false);
    vi.mocked(saveLocalFiles).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

export async function addDefaultSubredditSource(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(screen.getByRole("button", { name: "Add source" }));
  const dialog = screen.getByRole("dialog", { name: "Add source" });
  await user.click(within(dialog).getByRole("button", { name: "Reddit" }));
  await user.type(within(dialog).getByLabelText("Subreddit name"), "pics");
  await user.click(
    within(dialog).getByRole("button", { name: "Open Reddit links" }),
  );
}

export function stubRuntimeFetch(
  items: RuntimeFeedItem[] = [
    {
      id: "runtime-1",
      source: "reddit" as const,
      title: "Runtime image",
      subreddit: "pics",
      isNsfw: false,
      createdAt: "2026-04-24T00:00:00.000Z",
      media: [
        {
          type: "image" as const,
          url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        },
      ],
    },
  ],
) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ items }),
  }));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

export function stubUrlResolveFetch(
  payload: Record<string, unknown> | ((url: string) => Record<string, unknown>),
) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const requestUrl = new URL(String(input), "http://localhost");
    const sourceUrl = requestUrl.searchParams.get("url") ?? "";
    const body = typeof payload === "function" ? payload(sourceUrl) : payload;

    return {
      ok: true,
      json: async () => body,
    };
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

export function deferredFetch(items: Parameters<typeof stubRuntimeFetch>[0]) {
  let resolveResponse: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    resolveResponse = resolve;
  });

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      await wait;

      return {
        ok: true,
        json: async () => ({ items }),
      };
    }),
  );

  return { resolve: resolveResponse };
}

export function stubRandomUuids(ids: string[]) {
  let index = 0;
  const originalCrypto = globalThis.crypto;
  vi.stubGlobal("crypto", {
    ...originalCrypto,
    subtle: originalCrypto.subtle,
    getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
    randomUUID: () => ids[index++] ?? `uuid-${index}`,
  });
}

export async function hashTestRedditItemId(itemId: string) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(itemId),
  );

  return `sha256:${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function stubObjectUrls() {
  let index = 0;
  vi.stubGlobal("URL", {
    ...globalThis.URL,
    createObjectURL: vi.fn(() => `blob:upload-${++index}`),
    revokeObjectURL: vi.fn(),
  });
}

export function stubGridBounds() {
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = vi.fn(
    () =>
      ({
        bottom: 1600,
        height: 1600,
        left: 0,
        right: 1600,
        top: 0,
        width: 1600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect,
  );

  return () => {
    HTMLElement.prototype.getBoundingClientRect = original;
  };
}

export async function openSavedLayouts(
  user: ReturnType<typeof userEvent.setup>,
  names: string[],
) {
  await user.click(screen.getByRole("button", { name: "Library" }));
  const dialog = screen.getByRole("dialog", { name: "Library" });

  for (const name of names) {
    await user.click(
      within(dialog).getByRole("checkbox", { name: `Select ${name}` }),
    );
  }

  await user.click(
    within(dialog).getByRole("button", { name: "Open selected layouts" }),
  );
}

export async function openSavedTemplates(
  user: ReturnType<typeof userEvent.setup>,
  names: string[],
) {
  await user.click(screen.getByRole("button", { name: "Library" }));
  const dialog = screen.getByRole("dialog", { name: "Library" });
  await user.click(within(dialog).getByRole("tab", { name: "Templates" }));

  for (const name of names) {
    await user.click(
      within(dialog).getByRole("checkbox", { name: `Select ${name}` }),
    );
  }

  await user.click(
    within(dialog).getByRole("button", { name: "Open selected templates" }),
  );
}

export async function selectSourceGrouping(
  user: ReturnType<typeof userEvent.setup>,
  option: "One stacked source" | "Separate sources",
) {
  await user.click(
    screen.getByRole("button", {
      name:
        option === "One stacked source"
          ? "Add sources as one stacked source"
          : "Add sources as separate sources",
    }),
  );
}

export function savedLocalUploadWorkspace(
  cacheSetId?: string,
  name = "Saved local",
) {
  return {
    id: "saved-local",
    name,
    layoutMode: "fixed" as const,
    fixedGrid: { columns: 2, rows: 1 },
    updatedAt: "2026-04-24T00:00:00.000Z",
    sessions: [
      {
        id: "session-local",
        title: "Local upload",
        timerMode: "global" as const,
        timerSeconds: 10,
        timerActiveIndex: 0,
        fixedSlot: 0,
        freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
        sourceConfig: {
          kind: "local" as const,
          fileCount: 1,
          ...(cacheSetId ? { cacheSetId } : {}),
        },
      },
    ],
  };
}

export function savedLayeredWorkspace() {
  return {
    id: "layered-layout",
    name: "Layered layout",
    layers: [
      { id: "layer-1", name: "Layer 1" },
      { id: "layer-2", name: "Layer 2" },
      { id: "layer-3", name: "Layer 3" },
    ],
    activeLayerId: "layer-1",
    layoutMode: "fixed" as const,
    fixedGrid: { columns: 2, rows: 1 },
    globalTimerSeconds: 10,
    updatedAt: "2026-04-24T00:00:00.000Z",
    sessions: [
      {
        id: "session-local",
        title: "Local upload",
        layerId: "layer-1",
        timerMode: "global" as const,
        timerSeconds: 10,
        timerActiveIndex: 0,
        fixedSlot: 0,
        freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
        sourceConfig: {
          kind: "local" as const,
          fileCount: 4,
        },
      },
      {
        id: "session-reddit",
        title: "r/pics",
        layerId: "layer-2",
        timerMode: "global" as const,
        timerSeconds: 10,
        timerActiveIndex: 0,
        fixedSlot: 0,
        freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
        sourceConfig: {
          kind: "reddit" as const,
          urls: [
            "https://www.reddit.com/r/pics/comments/abc123/runtime_image/",
          ],
          allowNsfw: true,
        },
      },
    ],
  };
}

export function savedWorkspaceTemplate() {
  return {
    id: "template-1",
    name: "Poster wall",
    layers: [{ id: "layer-1", name: "Layer 1" }],
    activeLayerId: "layer-1",
    globalTimerSeconds: 10,
    slots: [
      {
        id: "slot-1",
        layerId: "layer-1",
        freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
      },
      {
        id: "slot-2",
        layerId: "layer-1",
        freeRect: { column: 5, row: 1, columnSpan: 4, rowSpan: 4 },
      },
    ],
    updatedAt: "2026-04-25T00:00:00.000Z",
  };
}
