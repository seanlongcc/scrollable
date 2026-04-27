import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  FeedWorkbench,
  installFeedWorkbenchTestHooks,
  isLocalFileCacheSupported,
  loadLocalFiles,
  openSavedLayouts,
  savedLocalUploadWorkspace,
  saveLocalFiles,
  selectSourceGrouping,
  stubObjectUrls,
  stubRandomUuids,
  WORKSPACE_STORAGE_KEY,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench local uploads", () => {
  installFeedWorkbenchTestHooks();

  it("reopens saved local uploads with in-session runtime media", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "session-1", "workspace-2"]);

    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
    ]);
    expect(await screen.findByAltText("a.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "New layout" }));

    expect(screen.queryByAltText("a.png")).not.toBeInTheDocument();

    await openSavedLayouts(user, ["Untitled layout"]);

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
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
    ]);
    expect(await screen.findByAltText("a.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "New layout" }));
    await user.click(screen.getByRole("button", { name: "Close Layout 1" }));

    await openSavedLayouts(user, ["Untitled layout"]);

    expect(await screen.findByAltText("a.png")).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
    expect(screen.getByText(/1\/1/)).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("reloads saved local upload sources after page refresh when files are selected again", async () => {
    stubObjectUrls();
    stubRandomUuids(["blank-workspace", "local-1"]);
    vi.stubGlobal("showOpenFilePicker", vi.fn());
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [savedLocalUploadWorkspace()],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openSavedLayouts(user, ["Saved local"]);
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

  it("explains Firefox local file restore limits when persistent handles are unavailable", async () => {
    stubObjectUrls();
    stubRandomUuids(["blank-workspace", "local-1"]);
    const originalUserAgent = window.navigator.userAgent;
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 Firefox/125.0",
      configurable: true,
    });

    try {
      window.localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify({
          activeWorkspaceId: "saved-local",
          workspaces: [savedLocalUploadWorkspace()],
        }),
      );

      const user = userEvent.setup();
      render(<FeedWorkbench />);

      await openSavedLayouts(user, ["Saved local"]);

      expect(
        screen.getByText(
          "Firefox cannot auto-restore large local files. Use Chromium for proper support.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Local files need reload"),
      ).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window.navigator, "userAgent", {
        value: originalUserAgent,
        configurable: true,
      });
    }
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

    await openSavedLayouts(user, ["Saved local"]);

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

    await openSavedLayouts(user, ["Saved local"]);
    expect(
      await screen.findByText("Cached files unavailable"),
    ).toBeInTheDocument();

    await user.upload(
      screen.getByLabelText("Reload files for Local upload"),
      new File(["a"], "reuploaded.png", { type: "image/png" }),
    );

    expect(await screen.findByAltText("reuploaded.png")).toBeInTheDocument();
    expect(saveLocalFiles).toHaveBeenCalledWith(
      "cache-2",
      [
        expect.objectContaining({
          file: expect.objectContaining({ name: "reuploaded.png" }),
        }),
      ],
      expect.objectContaining({ confirmLargeByteCache: expect.any(Function) }),
    );
    expect(
      screen.queryByText("Cached files unavailable"),
    ).not.toBeInTheDocument();
  });

  it("asks for local file access and restores cached file handles", async () => {
    stubObjectUrls();
    stubRandomUuids(["blank-workspace", "local-1"]);
    vi.mocked(loadLocalFiles)
      .mockResolvedValueOnce({
        status: "permission-needed",
        files: [],
      })
      .mockResolvedValueOnce({
        status: "loaded",
        files: [new File(["video"], "large.mp4", { type: "video/mp4" })],
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

    await openSavedLayouts(user, ["Saved local"]);
    expect(
      await screen.findByText("Local file access needed"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Allow access" }));

    expect(await screen.findByLabelText("large.mp4")).toBeInTheDocument();
    expect(loadLocalFiles).toHaveBeenLastCalledWith("cache-1", {
      requestPermission: true,
    });
    expect(
      screen.queryByText("Local file access needed"),
    ).not.toBeInTheDocument();
  });

  it("stores local file bytes as saved layout metadata without blob URLs", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "cache-1", "session-1"]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["a"], "cached.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("cached.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));

    const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "";
    expect(saveLocalFiles).toHaveBeenCalledWith(
      "local-1",
      [
        expect.objectContaining({
          file: expect.objectContaining({ name: "cached.png" }),
        }),
      ],
      expect.objectContaining({ confirmLargeByteCache: expect.any(Function) }),
    );
    expect(saved).toContain('"cacheSetId":"local-1"');
    expect(saved).not.toContain("blob:upload");
  });

  it("keeps large local videos playable when browser cache rejects the file", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "session-1"]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);
    vi.mocked(saveLocalFiles).mockRejectedValue(
      new DOMException("File exceeds browser 2GB limit", "QuotaExceededError"),
    );

    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["video"], "large.mp4", { type: "video/mp4" }),
    );

    await screen.findByText("Local upload");

    expect(container.querySelector("video")).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ name: "large.mp4" }),
    );
    expect(
      window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "",
    ).not.toContain("cacheSetId");
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
    await user.click(screen.getByRole("button", { name: "Local" }));
    await selectSourceGrouping(user, "Separate sources");
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.mp4", { type: "video/mp4" }),
    ]);

    expect(await screen.findByAltText("a.png")).toBeInTheDocument();
    expect(screen.getAllByText("a.png").length).toBeGreaterThan(0);
    expect(screen.getAllByText("b.mp4").length).toBeGreaterThan(0);
  });

  it("edits a local source by removing one file and caching the remaining file", async () => {
    stubObjectUrls();
    stubRandomUuids([
      "item-a",
      "item-b",
      "cache-1",
      "session-1",
      "item-c",
      "cache-2",
    ]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.png", { type: "image/png" }),
    ]);
    expect(await screen.findByAltText("a.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Local upload" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit source" });
    expect(
      within(editDialog).getByAltText("Preview a.png"),
    ).toBeInTheDocument();
    expect(
      within(editDialog).getByAltText("Preview b.png"),
    ).toBeInTheDocument();
    await user.click(
      within(editDialog).getByRole("button", { name: "Remove a.png" }),
    );
    await user.click(
      within(editDialog).getByRole("button", { name: "Save source" }),
    );

    expect(await screen.findByAltText("b.png")).toBeInTheDocument();
    expect(screen.queryByAltText("a.png")).not.toBeInTheDocument();
    expect(screen.getByText("1 source")).toBeInTheDocument();
    expect(screen.getByText("1 file")).toBeInTheDocument();
    expect(saveLocalFiles).toHaveBeenLastCalledWith(
      "cache-2",
      [
        expect.objectContaining({
          file: expect.objectContaining({ name: "b.png" }),
        }),
      ],
      expect.objectContaining({ confirmLargeByteCache: expect.any(Function) }),
    );
  });

  it("uploads audio files into the current layer as local runtime media", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
    expect(screen.getByLabelText("Image/video files")).toHaveAttribute(
      "accept",
      "image/*,video/*,audio/*",
    );
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["sound"], "ambient.mp3", { type: "audio/mpeg" }),
    );

    expect(await screen.findByLabelText("ambient.mp3")).toBeInTheDocument();
    expect(screen.getByText("1 source")).toBeInTheDocument();
    expect(screen.getByText("1 file")).toBeInTheDocument();
  });

  it("shows a blocking loading state while local files are cached", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "cache-1", "session-1"]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);
    let resolveSave = () => {};
    vi.mocked(saveLocalFiles).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
    const dialog = screen.getByRole("dialog", { name: "Add source" });
    fireEvent.change(within(dialog).getByLabelText("Image/video files"), {
      target: {
        files: [new File(["video"], "large.mp4", { type: "video/mp4" })],
      },
    });

    expect(await within(dialog).findByRole("status")).toHaveTextContent(
      "Preparing source",
    );
    expect(
      within(dialog).getByRole("button", {
        name: "Add sources as one stacked source",
      }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Local" }),
    ).toBeDisabled();
    expect(within(dialog).getByLabelText("Image/video files")).toBeDisabled();

    resolveSave();
    expect(await screen.findByLabelText("large.mp4")).toBeInTheDocument();
  });

  it("offers local folder upload with directory selection attributes", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));

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
    await user.click(screen.getByRole("button", { name: "Local" }));
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

    expect(await screen.findByAltText("dropped-file.png")).toBeInTheDocument();
  });

  it("adds files dropped on the folder upload zone", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
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
      await screen.findByAltText("dropped-folder-file.png"),
    ).toBeInTheDocument();
  });

  it("adds a selected local folder as one stacked source", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "local-2", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(screen.getByLabelText("Image/video folder"), [
      new File(["a"], "folder-a.png", { type: "image/png" }),
      new File(["b"], "folder-b.mp4", { type: "video/mp4" }),
    ]);

    expect(screen.getByText(/1\/2/)).toBeInTheDocument();
    expect(await screen.findByAltText("folder-a.png")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getAllByText("folder-b.mp4").length).toBeGreaterThan(0);
  });

  it("limits separate local uploads to visible fixed slots", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "local-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    fireEvent.change(screen.getByLabelText("Columns"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Rows"), {
      target: { value: "1" },
    });
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
    await selectSourceGrouping(user, "Separate sources");
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.mp4", { type: "video/mp4" }),
    ]);

    expect(screen.queryByText("a.png")).not.toBeInTheDocument();
    expect(screen.queryByText("b.mp4")).not.toBeInTheDocument();
  });
});
