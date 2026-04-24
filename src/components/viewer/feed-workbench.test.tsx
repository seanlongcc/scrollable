import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isLocalFileCacheSupported,
  loadLocalFiles,
  saveLocalFiles,
} from "@/lib/local-uploads/file-cache";
import { FeedWorkbench } from "./feed-workbench";

vi.mock("@/lib/local-uploads/file-cache", () => ({
  isLocalFileCacheSupported: vi.fn(() => false),
  loadLocalFiles: vi.fn(async () => ({
    status: "unavailable",
    files: [],
  })),
  saveLocalFiles: vi.fn(async () => undefined),
}));

const WORKSPACE_STORAGE_KEY = "scrollable.workspaces.v1";

describe("FeedWorkbench", () => {
  beforeEach(() => {
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(false);
    vi.mocked(loadLocalFiles).mockResolvedValue({
      status: "unavailable",
      files: [],
    });
    vi.mocked(saveLocalFiles).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("does not render saved or shared media previews before runtime feed opens", () => {
    const { container } = render(<FeedWorkbench />);

    expect(container.querySelectorAll("img, video")).toHaveLength(0);
  });

  it("renders fixed 2x1 workspace controls", () => {
    render(<FeedWorkbench />);

    expect(screen.getByLabelText("Fixed columns")).toHaveValue(2);
    expect(screen.getByLabelText("Fixed columns")).toHaveAttribute("max", "16");
    expect(screen.getByLabelText("Fixed rows")).toHaveValue(1);
    expect(screen.getByLabelText("Fixed rows")).toHaveAttribute("max", "16");
    expect(
      screen.getByRole("button", { name: "Global next" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add source" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });

  it("opens sign in and sign up as an overlay", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reddit" }),
    ).not.toBeInTheDocument();
  });

  it("uses 4x4 as the default free-layout source size", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );

    await screen.findByRole("button", { name: "Remove r/pics" });
    expect(screen.getByLabelText("Free column")).toHaveValue(1);
    expect(screen.getByLabelText("Free row")).toHaveValue(1);
    expect(screen.getByLabelText("Column span")).toHaveValue(4);
    expect(screen.getByLabelText("Row span")).toHaveValue(4);
  });

  it("defaults global and source timers to 10 seconds", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    expect(screen.getByLabelText("Global timer seconds")).toHaveValue(10);
    expect(screen.getByLabelText("Global timer seconds")).toHaveAttribute(
      "min",
      "1",
    );

    await user.click(screen.getByRole("button", { name: "Add source" }));

    expect(screen.getByLabelText("View timer seconds")).toHaveValue(10);
    expect(screen.getByLabelText("View timer seconds")).toHaveAttribute(
      "min",
      "1",
    );
  });

  it("closes workspace layout tabs", async () => {
    stubRandomUuids(["workspace-1", "workspace-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "New layout" }));
    expect(
      screen.getByRole("button", { name: "Layout 2" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close Layout 2" }));

    expect(
      screen.queryByRole("button", { name: "Layout 2" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Layout 1" }),
    ).toBeInTheDocument();
  });

  it("maximizes a runtime feed into focus plus satellite mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "runtime-1",
              source: "reddit",
              title: "Runtime image",
              subreddit: "pics",
              isNsfw: false,
              createdAt: "2026-04-24T00:00:00.000Z",
              media: [
                {
                  type: "image",
                  url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
                },
              ],
            },
          ],
        }),
      })),
    );
    vi.stubGlobal("crypto", { randomUUID: () => "session-1" });

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Maximize r/pics" }),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Maximize r/pics" }));

    expect(screen.queryByText("Focus view")).not.toBeInTheDocument();
    const satelliteLabel = screen.getByText("Satellite View");
    expect(satelliteLabel).toBeInTheDocument();
    expect(satelliteLabel.closest("div")).toContainElement(
      screen.getByRole("button", { name: "Restore grid" }),
    );
  });

  it("defaults sources to global timers and hides local timer inputs until local mode", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );

    expect(
      await screen.findByRole("button", { name: "r/pics uses global timer" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("r/pics local timer seconds"),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "r/pics uses global timer" }),
    );

    expect(
      screen.getByRole("button", { name: "r/pics uses local timer" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("r/pics local timer seconds")).toHaveValue(10);
    expect(screen.getByLabelText("r/pics local timer seconds")).toHaveAttribute(
      "min",
      "1",
    );
  });

  it("shows local timer inputs in compact free-layout sources", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "r/pics uses global timer" }),
    );

    expect(
      screen.getByLabelText("r/pics local timer seconds"),
    ).toBeInTheDocument();
  });

  it("hides chrome and progress in content-only mode", async () => {
    stubRuntimeFetch([
      {
        id: "runtime-1",
        source: "reddit",
        title: "Runtime image 1",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          { type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" },
        ],
      },
      {
        id: "runtime-2",
        source: "reddit",
        title: "Runtime image 2",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          { type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" },
        ],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await screen.findByLabelText("r/pics timer progress");

    await user.click(screen.getByRole("button", { name: "Hide UI" }));

    expect(
      screen.queryByRole("button", { name: "Add source" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("r/pics timer progress"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show UI" })).toBeVisible();
  });

  it("auto-hides the fullscreen show-ui button after inactivity", async () => {
    vi.useFakeTimers();
    try {
      render(<FeedWorkbench />);

      fireEvent.click(screen.getByRole("button", { name: "Hide UI" }));

      const showButton = screen.getByRole("button", { name: "Show UI" });
      expect(showButton).not.toHaveClass("opacity-0");

      act(() => {
        vi.advanceTimersByTime(2200);
      });

      expect(showButton).toHaveClass("opacity-0");

      fireEvent.pointerMove(window);
      expect(showButton).not.toHaveClass("opacity-0");
    } finally {
      vi.useRealTimers();
    }
  });

  it("exits content-only mode with Escape", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Hide UI" }));
    await user.keyboard("{Escape}");

    expect(
      screen.getByRole("button", { name: "Add source" }),
    ).toBeInTheDocument();
  });

  it("moves the active feed forward and backward with arrow keys", async () => {
    stubRuntimeFetch([
      {
        id: "runtime-1",
        source: "reddit",
        title: "Runtime image 1",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          { type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" },
        ],
      },
      {
        id: "runtime-2",
        source: "reddit",
        title: "Runtime image 2",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          { type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" },
        ],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );

    expect(await screen.findByText("Runtime image 1")).toBeInTheDocument();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByText("Runtime image 2")).toBeInTheDocument();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByText("Runtime image 1")).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("Runtime image 2")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("Runtime image 1")).toBeInTheDocument();
  });

  it("moves the active feed forward and backward with wheel scrolling", async () => {
    stubRuntimeFetch([
      {
        id: "runtime-1",
        source: "reddit",
        title: "Runtime image 1",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          { type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" },
        ],
      },
      {
        id: "runtime-2",
        source: "reddit",
        title: "Runtime image 2",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          { type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" },
        ],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );

    const activeTitle = await screen.findByText("Runtime image 1");
    const pane = activeTitle.closest("article");
    expect(pane).not.toBeNull();

    fireEvent.wheel(pane!, { deltaY: 100 });
    expect(screen.getByText("Runtime image 2")).toBeInTheDocument();

    fireEvent.wheel(pane!, { deltaY: -100 });
    expect(screen.getByText("Runtime image 1")).toBeInTheDocument();
  });

  it("keeps the add-source dialog available when UI chrome is hidden", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Hide UI" }));
    await user.click(
      screen.getAllByRole("button", { name: "Add source to empty cell" })[0],
    );

    expect(
      screen.getByRole("dialog", { name: "Add source" }),
    ).toBeInTheDocument();
  });

  it("saves layout metadata locally without runtime media payloads", async () => {
    stubRuntimeFetch([
      {
        id: "runtime-1",
        source: "reddit",
        title: "Runtime image",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/runtime-image.jpg" }],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await screen.findByRole("button", { name: "Maximize r/pics" });

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    expect(
      screen.getByRole("dialog", { name: "Save layout as" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save as layout" }));

    const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "";
    expect(saved).toContain("pics");
    expect(saved).not.toContain("https://cdn.test/runtime-image.jpg");
    expect(saved).not.toContain("runtime-1");
  });

  it("keeps saved layouts after their open tab is closed and supports delete", async () => {
    stubRandomUuids(["workspace-1", "workspace-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "Close Layout 1" }));

    await user.click(screen.getByRole("button", { name: "Open layouts" }));
    expect(
      screen.getByRole("button", { name: "Open Layout 1" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Layout 1" }));

    expect(
      screen.queryByRole("button", { name: "Open Layout 1" }),
    ).not.toBeInTheDocument();
  });

  it("shows local file counts in saved layouts", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "local-2", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.mp4", { type: "video/mp4" }),
    ]);
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "Open layouts" }));

    expect(screen.getByText(/1 source · 2 files/)).toBeInTheDocument();
  });

  it("reopens saved local uploads with in-session runtime media", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "session-1", "workspace-2"]);

    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
    ]);
    expect(await screen.findByAltText("a.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "New layout" }));

    expect(screen.queryByAltText("a.png")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open layouts" }));
    await user.click(screen.getByRole("button", { name: "Open Layout 1" }));

    expect(await screen.findByAltText("a.png")).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
    expect(screen.getByText(/1\/1/)).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("keeps saved local upload runtime media after its layout tab is closed", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "session-1", "workspace-2"]);

    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
    ]);
    expect(await screen.findByAltText("a.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "New layout" }));
    await user.click(screen.getByRole("button", { name: "Close Layout 1" }));

    await user.click(screen.getByRole("button", { name: "Open layouts" }));
    await user.click(screen.getByRole("button", { name: "Open Layout 1" }));

    expect(await screen.findByAltText("a.png")).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
    expect(screen.getByText(/1\/1/)).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("keeps a blank layout first when saved layouts load from local storage", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [savedLocalUploadWorkspace()],
      }),
    );

    render(<FeedWorkbench />);

    const savedTab = await screen.findByRole("button", {
      name: "Saved local",
    });
    const blankTab = screen.getByRole("button", { name: "Layout 1" });

    expect(
      blankTab.compareDocumentPosition(savedTab) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByText("0 sources active · Fixed layout"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
  });

  it("gives the automatic blank layout a name that does not collide with saved layouts", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [savedLocalUploadWorkspace(undefined, "Layout 1")],
      }),
    );

    render(<FeedWorkbench />);

    expect(
      await screen.findByRole("button", { name: "Layout 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Layout 1" }),
    ).toBeInTheDocument();
  });

  it("reloads saved local upload sources after page refresh when files are selected again", async () => {
    stubObjectUrls();
    stubRandomUuids(["blank-workspace", "local-1"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [savedLocalUploadWorkspace()],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(
      await screen.findByRole("button", { name: "Saved local" }),
    );
    expect(screen.getByText("Local files need reload")).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();

    await user.upload(
      screen.getByLabelText("Reload files for Local upload"),
      new File(["a"], "a.png", { type: "image/png" }),
    );

    expect(await screen.findByAltText("a.png")).toBeInTheDocument();
    expect(
      screen.queryByText("Local files need reload"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
  });

  it("restores cached local upload files after refresh", async () => {
    stubObjectUrls();
    stubRandomUuids(["blank-workspace", "local-1"]);
    vi.mocked(loadLocalFiles).mockResolvedValue({
      status: "loaded",
      files: [new File(["a"], "cached.png", { type: "image/png" })],
    });
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [savedLocalUploadWorkspace("cache-1")],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(
      await screen.findByRole("button", { name: "Saved local" }),
    );

    expect(await screen.findByAltText("cached.png")).toBeInTheDocument();
    expect(loadLocalFiles).toHaveBeenCalledWith("cache-1");
    expect(
      screen.queryByText("Local files need reload"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
  });

  it("asks for reupload when cached local bytes are missing", async () => {
    stubObjectUrls();
    stubRandomUuids(["blank-workspace", "cache-2", "local-1"]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);
    vi.mocked(loadLocalFiles).mockResolvedValue({
      status: "missing",
      files: [],
    });
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [savedLocalUploadWorkspace("cache-1")],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(
      await screen.findByRole("button", { name: "Saved local" }),
    );
    expect(
      await screen.findByText("Cached files unavailable"),
    ).toBeInTheDocument();

    await user.upload(
      screen.getByLabelText("Reload files for Local upload"),
      new File(["a"], "reuploaded.png", { type: "image/png" }),
    );

    expect(await screen.findByAltText("reuploaded.png")).toBeInTheDocument();
    expect(saveLocalFiles).toHaveBeenCalledWith("local-1", [
      expect.objectContaining({ name: "reuploaded.png" }),
    ]);
    expect(
      screen.queryByText("Cached files unavailable"),
    ).not.toBeInTheDocument();
  });

  it("stores local file bytes as saved layout metadata without blob URLs", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "cache-1", "session-1"]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["a"], "cached.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("cached.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));

    const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "";
    expect(saveLocalFiles).toHaveBeenCalledWith("cache-1", [
      expect.objectContaining({ name: "cached.png" }),
    ]);
    expect(saved).toContain('"cacheSetId":"cache-1"');
    expect(saved).not.toContain("blob:upload");
  });

  it("can add local uploads as separate sources", async () => {
    stubObjectUrls();
    stubRandomUuids([
      "workspace-1",
      "local-1",
      "local-2",
      "session-1",
      "session-2",
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", {
        name: "Add local files as separate sources",
      }),
    );
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.mp4", { type: "video/mp4" }),
    ]);

    expect(
      screen.getByText("2 sources active · Fixed layout"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("a.png").length).toBeGreaterThan(0);
    expect(screen.getAllByText("b.mp4").length).toBeGreaterThan(0);
  });

  it("offers local folder upload with directory selection attributes", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));

    const uploadPicker = screen.getByRole("group", {
      name: "Local upload picker",
    });
    expect(
      within(uploadPicker).getByRole("button", {
        name: "Drop files",
      }),
    ).toBeInTheDocument();
    expect(
      within(uploadPicker).getByRole("button", {
        name: "Drop folder",
      }),
    ).toBeInTheDocument();
    const folderInput = screen.getByLabelText("Image/video folder");
    const fileInput = screen.getByLabelText("Image/video files");
    expect(uploadPicker).toContainElement(fileInput);
    expect(uploadPicker).toContainElement(folderInput);
    expect(folderInput).toHaveAttribute("type", "file");
    expect(folderInput).toHaveAttribute("webkitdirectory");
    expect(folderInput).toHaveAttribute("directory");
    expect(folderInput).toHaveAttribute("multiple");
  });

  it("adds files dropped on the file upload zone", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await act(async () => {
      fireEvent.drop(
        screen.getByRole("button", {
          name: "Drop files",
        }),
        {
          dataTransfer: {
            files: [new File(["a"], "dropped-file.png", { type: "image/png" })],
            items: [],
          },
        },
      );
    });

    expect(
      await screen.findByText("1 source active · Fixed layout"),
    ).toBeInTheDocument();
    expect(await screen.findByAltText("dropped-file.png")).toBeInTheDocument();
  });

  it("adds files dropped on the folder upload zone", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await act(async () => {
      fireEvent.drop(
        screen.getByRole("button", {
          name: "Drop folder",
        }),
        {
          dataTransfer: {
            files: [
              new File(["a"], "dropped-folder-file.png", {
                type: "image/png",
              }),
            ],
            items: [],
          },
        },
      );
    });

    expect(
      await screen.findByText("1 source active · Fixed layout"),
    ).toBeInTheDocument();
    expect(
      await screen.findByAltText("dropped-folder-file.png"),
    ).toBeInTheDocument();
  });

  it("adds a selected local folder as one stacked source", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "local-2", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(screen.getByLabelText("Image/video folder"), [
      new File(["a"], "folder-a.png", { type: "image/png" }),
      new File(["b"], "folder-b.mp4", { type: "video/mp4" }),
    ]);

    expect(
      screen.getByText("1 source active · Fixed layout"),
    ).toBeInTheDocument();
    expect(screen.getByText(/1\/2/)).toBeInTheDocument();
    expect(await screen.findByAltText("folder-a.png")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Next item for Local upload" }),
    );
    expect(screen.getAllByText("folder-b.mp4").length).toBeGreaterThan(0);
  });

  it("renames layout tabs on double click", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.dblClick(screen.getByRole("button", { name: "Layout 1" }));
    const renameInput = screen.getByLabelText("Rename Layout 1");
    await user.clear(renameInput);
    await user.type(renameInput, "Movie Wall{Enter}");

    expect(
      screen.getByRole("button", { name: "Movie Wall" }),
    ).toBeInTheDocument();
  });

  it("rejects duplicate save-as layout names", async () => {
    stubRandomUuids(["workspace-1", "workspace-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "New layout" }));
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    const nameInput = screen.getByLabelText("Layout name");
    await user.clear(nameInput);
    await user.type(nameInput, "Layout 1");
    await user.click(screen.getByRole("button", { name: "Save as layout" }));

    expect(screen.getByText("Layout names must be unique")).toBeInTheDocument();
  });

  it("opens locally saved layouts and refetches Reddit runtime media", async () => {
    stubRuntimeFetch([
      {
        id: "runtime-1",
        source: "reddit",
        title: "Runtime image",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/runtime-image.jpg" }],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1", "workspace-2"]);

    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await screen.findByRole("button", { name: "Maximize r/pics" });
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "New layout" }));

    await user.click(screen.getByRole("button", { name: "Open layouts" }));
    await user.click(screen.getByRole("button", { name: "Open Layout 1" }));

    expect(screen.getAllByText("r/pics").length).toBeGreaterThan(0);
    expect(await screen.findByAltText("Runtime image")).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("refetches Reddit runtime media after a page refresh", async () => {
    stubRuntimeFetch([
      {
        id: "runtime-1",
        source: "reddit",
        title: "Runtime image",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          { type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" },
        ],
      },
    ]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "workspace-1",
        workspaces: [
          {
            id: "workspace-1",
            name: "Saved reddit",
            layoutMode: "fixed",
            fixedGrid: { columns: 2, rows: 1 },
            updatedAt: "2026-04-24T00:00:00.000Z",
            sessions: [
              {
                id: "session-1",
                title: "r/pics",
                timerMode: "global",
                timerSeconds: 10,
                fixedSlot: 0,
                freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
                sourceConfig: {
                  kind: "reddit",
                  subreddit: "pics",
                  sort: "top",
                  timeRange: "day",
                  limit: 20,
                  skip: 0,
                  allowNsfw: true,
                },
              },
            ],
          },
        ],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(
      await screen.findByRole("button", { name: "Saved reddit" }),
    );

    expect(await screen.findByAltText("Runtime image")).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
  });

  it("shows loading instead of no-runtime-media while a saved Reddit source hydrates", async () => {
    const fetchPromise = deferredFetch([
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
    ]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "workspace-1",
        workspaces: [
          {
            id: "workspace-1",
            name: "Saved reddit",
            layoutMode: "fixed",
            fixedGrid: { columns: 2, rows: 1 },
            updatedAt: "2026-04-24T00:00:00.000Z",
            sessions: [
              {
                id: "session-1",
                title: "r/pics",
                timerMode: "global",
                timerSeconds: 10,
                timerActiveIndex: 0,
                fixedSlot: 0,
                freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
                sourceConfig: {
                  kind: "reddit",
                  subreddit: "pics",
                  sort: "top",
                  timeRange: "day",
                  limit: 20,
                  skip: 0,
                  allowNsfw: true,
                },
              },
            ],
          },
        ],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(
      await screen.findByRole("button", { name: "Saved reddit" }),
    );

    expect(
      await screen.findByText("Loading runtime media"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();

    fetchPromise.resolve();

    expect(await screen.findByAltText("Runtime image")).toBeInTheDocument();
  });

  it("keeps runtime feed items in a workspace tab when switching layouts", async () => {
    stubRuntimeFetch([
      {
        id: "runtime-1",
        source: "reddit",
        title: "Runtime image",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          { type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" },
        ],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1", "workspace-2"]);

    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await screen.findByAltText("Runtime image");

    await user.click(screen.getByRole("button", { name: "New layout" }));
    expect(screen.queryByAltText("Runtime image")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Layout 1" }));

    expect(await screen.findByAltText("Runtime image")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("keeps fixed-grid content in its assigned cell after another cell is removed", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1", "session-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await screen.findByRole("button", { name: "Remove r/pics" });

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.clear(screen.getByLabelText("Subreddit"));
    await user.type(screen.getByLabelText("Subreddit"), "aww");
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await screen.findByRole("button", { name: "Remove r/aww" });

    await user.click(screen.getByRole("button", { name: "Remove r/pics" }));

    expect(
      within(screen.getByTestId("fixed-cell-0")).getByText("Add source"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("fixed-cell-1")).getByText("r/aww"),
    ).toBeInTheDocument();
  });

  it("keeps extra top-added sources hidden until the fixed grid grows", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1", "session-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    fireEvent.change(screen.getByLabelText("Fixed columns"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Fixed rows"), {
      target: { value: "1" },
    });
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await screen.findByRole("button", { name: "Remove r/pics" });

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.clear(screen.getByLabelText("Subreddit"));
    await user.type(screen.getByLabelText("Subreddit"), "aww");
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );

    expect(screen.getByText("1 hidden source")).toBeInTheDocument();
    expect(screen.queryByText("r/aww")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Fixed columns"), {
      target: { value: "2" },
    });

    expect(
      await within(screen.getByTestId("fixed-cell-1")).findByText("r/aww"),
    ).toBeInTheDocument();
  });

  it("fills empty visible cells by duplicating the selected source with the selected free size", async () => {
    stubRuntimeFetch([
      {
        id: "runtime-1",
        source: "reddit",
        title: "Runtime image 1",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/one.jpg" }],
      },
      {
        id: "runtime-2",
        source: "reddit",
        title: "Runtime image 2",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/two.jpg" }],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1", "session-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    fireEvent.change(screen.getByLabelText("Fixed columns"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Fixed rows"), {
      target: { value: "1" },
    });
    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await screen.findByRole("button", { name: "Remove r/pics" });
    fireEvent.change(screen.getByLabelText("Column span"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("Row span"), {
      target: { value: "8" },
    });
    await user.click(screen.getByRole("button", { name: "Fixed layout mode" }));
    await screen.findByRole("button", {
      name: "Duplicate selected source into empty cells",
    });

    await user.click(
      screen.getByRole("button", {
        name: "Duplicate selected source into empty cells",
      }),
    );

    expect(
      within(screen.getByTestId("fixed-cell-1")).getAllByText("r/pics")[0],
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("fixed-cell-1")).getByText(/2\/2/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    expect(screen.getByLabelText("Column span")).toHaveValue(8);
    expect(screen.getByLabelText("Row span")).toHaveValue(8);
  });

  it("keeps the active stack item when switching layout modes", async () => {
    stubRuntimeFetch([
      {
        id: "runtime-1",
        source: "reddit",
        title: "Runtime image 1",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          { type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" },
        ],
      },
      {
        id: "runtime-2",
        source: "reddit",
        title: "Runtime image 2",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          { type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" },
        ],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await screen.findByText(/1\/2/);
    await user.click(
      screen.getByRole("button", { name: "Next item for r/pics" }),
    );
    expect(screen.getByText(/2\/2/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    await user.click(screen.getByRole("button", { name: "Fixed layout mode" }));

    expect(screen.getByText(/2\/2/)).toBeInTheDocument();
  });

  it("limits separate local uploads to visible fixed slots", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "local-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    fireEvent.change(screen.getByLabelText("Fixed columns"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Fixed rows"), {
      target: { value: "1" },
    });
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", {
        name: "Add local files as separate sources",
      }),
    );
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.mp4", { type: "video/mp4" }),
    ]);

    expect(
      screen.getByText("0 sources active · Fixed layout"),
    ).toBeInTheDocument();
    expect(screen.queryByText("a.png")).not.toBeInTheDocument();
    expect(screen.queryByText("b.mp4")).not.toBeInTheDocument();
  });

  it("clears the current layout only after confirmation", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(
      screen.getByRole("button", { name: "Open Reddit source" }),
    );
    await screen.findByText("1 source active · Fixed layout");

    await user.click(screen.getByRole("button", { name: "Clear layout" }));
    expect(
      screen.getByText("1 source active · Fixed layout"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Confirm clear layout" }),
    );

    expect(
      screen.getByText("0 sources active · Fixed layout"),
    ).toBeInTheDocument();
  });
});

function stubRuntimeFetch(
  items = [
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ items }),
    })),
  );
}

function deferredFetch(items: Parameters<typeof stubRuntimeFetch>[0]) {
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

function stubRandomUuids(ids: string[]) {
  let index = 0;
  vi.stubGlobal("crypto", {
    ...globalThis.crypto,
    randomUUID: () => ids[index++] ?? `uuid-${index}`,
  });
}

function stubObjectUrls() {
  let index = 0;
  vi.stubGlobal("URL", {
    ...globalThis.URL,
    createObjectURL: vi.fn(() => `blob:upload-${++index}`),
    revokeObjectURL: vi.fn(),
  });
}

function savedLocalUploadWorkspace(cacheSetId?: string, name = "Saved local") {
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
