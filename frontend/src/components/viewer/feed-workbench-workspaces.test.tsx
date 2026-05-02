import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  addDefaultSubredditSource,
  FeedWorkbench,
  installFeedWorkbenchTestHooks,
  openSavedLayouts,
  redditListingFromRuntimeItems,
  savedLayeredWorkspace,
  savedLocalUploadWorkspace,
  stubObjectUrls,
  stubRandomUuids,
  stubRuntimeFetch,
  WORKSPACE_SESSION_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench workspaces", () => {
  installFeedWorkbenchTestHooks();

  it("closes workspace layout tabs", async () => {
    stubRandomUuids(["workspace-1", "workspace-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "New layout" }));
    expect(
      screen.getByRole("button", { name: "Untitled layout" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close Layout 1" }));

    expect(
      screen.queryByRole("button", { name: "Layout 1" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Untitled layout" }),
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

    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Maximize r/pics" });

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    expect(
      await screen.findByRole("dialog", { name: "Save layout as" }),
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
    await user.click(
      screen.getByRole("button", { name: "Close Untitled layout" }),
    );

    await user.click(screen.getByRole("button", { name: "Library" }));
    expect(
      screen.getByRole("checkbox", { name: "Select Untitled layout" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "More actions for Untitled layout" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(
      screen.queryByRole("checkbox", { name: "Select Untitled layout" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the Library sheet focused on saved layouts only", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [savedLocalUploadWorkspace()],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "New layout" }));
    await user.click(screen.getByRole("button", { name: "Library" }));

    const dialog = await screen.findByRole("dialog", { name: "Library" });

    expect(
      within(dialog).getAllByRole("button", { name: "Import JSON" }),
    ).toHaveLength(1);
    expect(
      within(dialog).queryByRole("button", { name: "Delete selected layouts" }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: "Local" })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(
      within(dialog).getByRole("tab", { name: "Layouts" }),
    ).toHaveAttribute("data-state", "active");
    expect(
      within(dialog).getByRole("searchbox", { name: "Search saved items" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Save layout" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "New blank" }),
    ).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Open layouts")).not.toBeInTheDocument();
  });

  it("opens a separate Workspace sheet for open layout management", async () => {
    stubRandomUuids(["workspace-1", "workspace-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "New layout" }));
    await user.click(screen.getByRole("button", { name: "Workspace" }));

    const dialog = await screen.findByRole("dialog", { name: "Workspace" });

    expect(
      within(dialog).getByRole("button", { name: "Save layout" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Import JSON" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "New blank" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Close all" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Select all" }),
    ).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Close Untitled layout" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", {
        name: /More actions for Untitled layout/,
      }),
    ).not.toBeInTheDocument();
  });

  it("imports Workspace JSON into the current layout without saving it to the Library", async () => {
    const imported = savedLocalUploadWorkspace(undefined, "Imported current");
    const file = new File(
      [JSON.stringify({ type: "scrollable.layout.v1", item: imported })],
      "imported-current.json",
      { type: "application/json" },
    );
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName, options) =>
        originalCreateElement(tagName, options),
      );
    let fileInput: HTMLInputElement | null = null;
    createElement.mockImplementation((tagName, options) => {
      const element = originalCreateElement(tagName, options);
      if (tagName === "input") fileInput = element as HTMLInputElement;
      return element;
    });

    const user = userEvent.setup();
    try {
      render(<FeedWorkbench />);

      await user.click(screen.getByRole("button", { name: "Workspace" }));
      const workspaceDialog = await screen.findByRole("dialog", {
        name: "Workspace",
      });
      await user.click(
        within(workspaceDialog).getByRole("button", { name: "Import JSON" }),
      );
      expect(fileInput).not.toBeNull();
      await user.upload(fileInput!, file);

      expect(
        await within(workspaceDialog).findByRole("button", {
          name: "Close Imported current",
        }),
      ).toBeInTheDocument();
      expect(
        window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "",
      ).not.toContain("Imported current");

      await user.click(
        within(workspaceDialog).getByRole("button", { name: "Close dialog" }),
      );
      await user.click(screen.getByRole("button", { name: "Library" }));
      const libraryDialog = await screen.findByRole("dialog", {
        name: "Library",
      });

      expect(
        within(libraryDialog).queryByRole("checkbox", {
          name: "Select Imported current",
        }),
      ).not.toBeInTheDocument();
    } finally {
      createElement.mockRestore();
    }
  });

  it("keeps Workspace rows unselectable and uses Close all", async () => {
    stubRandomUuids(["workspace-1", "workspace-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Workspace" }));

    const dialog = await screen.findByRole("dialog", { name: "Workspace" });
    await user.click(within(dialog).getByRole("button", { name: "New blank" }));

    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Close all" }));

    expect(
      within(dialog).queryByRole("button", { name: "Close Untitled layout" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getAllByRole("button", {
        name: /^Close (Untitled layout|Layout \d+)$/,
      }),
    ).toHaveLength(1);
  });

  it("closes all open layouts from the Workspace sheet", async () => {
    stubRandomUuids(["workspace-1", "workspace-2", "workspace-3"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Workspace" }));

    const dialog = await screen.findByRole("dialog", { name: "Workspace" });
    await user.click(within(dialog).getByRole("button", { name: "New blank" }));
    await user.click(within(dialog).getByRole("button", { name: "New blank" }));

    await user.click(within(dialog).getByRole("button", { name: "Close all" }));

    expect(
      within(dialog).queryByRole("button", { name: "Close Untitled layout" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Close Layout 2" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Close Layout 1" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByRole("button", {
        name: /^Close (Untitled layout|Layout \d+)$/,
      }),
    ).toHaveLength(1);
  });

  it("shows local file counts in saved layouts", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "local-2", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(await screen.findByRole("button", { name: "Local" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.mp4", { type: "video/mp4" }),
    ]);
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "Library" }));

    const dialog = await screen.findByRole("dialog", { name: "Library" });
    expect(
      within(dialog).getByText("fixed · 1 src · 2 files"),
    ).toBeInTheDocument();
  });

  it("shows compact layer totals in saved layouts", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "layered-layout",
        workspaces: [savedLayeredWorkspace()],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Library" }));

    const dialog = await screen.findByRole("dialog", { name: "Library" });
    expect(
      within(dialog).getByText("fixed · 2 src · 5 files"),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText("Layer 1: 1 source / 4 files"),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByText("Layer 2: 1 source / 1 file"),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByText("Layer 3: 0 sources / 0 files"),
    ).not.toBeInTheDocument();
  });

  it("lets the Library dialog own scrolling for long saved layout lists", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-layout-1",
        workspaces: Array.from({ length: 8 }, (_, index) => ({
          ...savedLocalUploadWorkspace(undefined, `Saved layout ${index + 1}`),
          id: `saved-layout-${index + 1}`,
          updatedAt: `2026-04-24T00:00:0${index}.000Z`,
        })),
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Library" }));

    const dialog = await screen.findByRole("dialog", { name: "Library" });
    const layoutList = within(dialog).getByRole("group", {
      name: "Saved layouts list",
    });

    expect(dialog).toHaveClass("overflow-y-auto");
    expect(layoutList).not.toHaveClass("overflow-y-auto");
    expect(layoutList.className).not.toContain("max-h-[");
    expect(within(layoutList).getAllByRole("checkbox")).toHaveLength(8);
  });

  it("keeps saved layouts closed when they load from local storage", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [savedLocalUploadWorkspace()],
      }),
    );

    render(<FeedWorkbench />);

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Saved local" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
  });

  it("keeps saved layout tabs open across refreshes in the same browser session", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [savedLocalUploadWorkspace()],
      }),
    );
    window.sessionStorage.setItem(
      WORKSPACE_SESSION_STORAGE_KEY,
      JSON.stringify({
        openWorkspaceIds: ["saved-local"],
        activeWorkspaceId: "saved-local",
      }),
    );

    render(<FeedWorkbench />);

    expect(
      await screen.findByRole("button", { name: "Saved local" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Layout 1" }),
    ).not.toBeInTheDocument();
  });

  it("restores saved layout tabs on layer one without selecting a source", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "layered-layout",
        workspaces: [
          {
            ...savedLayeredWorkspace(),
            activeLayerId: "layer-2",
          },
        ],
      }),
    );
    window.sessionStorage.setItem(
      WORKSPACE_SESSION_STORAGE_KEY,
      JSON.stringify({
        openWorkspaceIds: ["layered-layout"],
        activeWorkspaceId: "layered-layout",
      }),
    );

    render(<FeedWorkbench />);

    expect(
      await screen.findByRole("button", { name: "Layered layout" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select Layer 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Select Layer 2" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("button", { name: "Clone selected source" }),
    ).not.toBeInTheDocument();
  });

  it("opens multiple selected saved layouts from the compact layout popup", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [
          savedLocalUploadWorkspace(undefined, "Saved local"),
          {
            ...savedLocalUploadWorkspace(undefined, "Movie wall"),
            id: "movie-wall",
          },
        ],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Library" }));

    const dialog = await screen.findByRole("dialog", { name: "Library" });
    expect(
      within(dialog).queryByRole("button", { name: "Open Saved local" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("checkbox", { name: "Select Saved local" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("checkbox", { name: "Select Movie wall" }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("checkbox", { name: "Select Saved local" }),
    );
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Select Movie wall" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Open selected layouts" }),
    );

    expect(
      await screen.findByRole("button", { name: "Saved local" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Movie wall" }),
    ).toBeInTheDocument();
  });

  it("hydrates shared Cloud Reddit layouts with browser Reddit JSON requests", async () => {
    window.history.pushState({}, "", "/?openLayout=reddit-wall");
    stubRandomUuids(["blank-workspace", "shared-copy"]);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = String(input);

      if (requestUrl === "/api/share/layout/reddit-wall") {
        return {
          ok: true,
          json: async () => ({
            status: "ok",
            workspace: {
              id: "cloud-layout",
              name: "Cloud reddit",
              layers: [{ id: "layer-1", name: "Layer 1" }],
              activeLayerId: "layer-1",
              layoutMode: "fixed",
              fixedGrid: { columns: 2, rows: 1 },
              globalTimerSeconds: 10,
              sessions: [
                {
                  id: "session-1",
                  title: "r/pics",
                  layerId: "layer-1",
                  timerMode: "global",
                  timerSeconds: 10,
                  fixedSlot: 0,
                  freeRect: {
                    column: 1,
                    row: 1,
                    columnSpan: 4,
                    rowSpan: 4,
                  },
                  sourceConfig: {
                    kind: "reddit",
                    urls: ["https://www.reddit.com/r/pics/top/?t=week"],
                    limit: 24,
                    allowNsfw: true,
                  },
                },
              ],
              updatedAt: "2026-04-24T00:00:00.000Z",
            },
          }),
        };
      }

      if (
        requestUrl ===
        "https://www.reddit.com/r/pics/top/.json?raw_json=1&t=week&limit=200"
      ) {
        return {
          ok: true,
          json: async () =>
            redditListingFromRuntimeItems(
              [
                {
                  id: "reddit:shared",
                  source: "reddit",
                  title: "Shared runtime image",
                  subreddit: "pics",
                  isNsfw: true,
                  createdAt: "2026-04-24T00:00:00.000Z",
                  media: [
                    {
                      type: "image",
                      url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
                    },
                  ],
                },
              ],
              requestUrl,
            ),
        };
      }

      throw new Error(`Unexpected fetch: ${requestUrl}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedWorkbench />);

    expect(
      await screen.findByAltText("Shared runtime image"),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/share/layout/reddit-wall");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.reddit.com/r/pics/top/.json?raw_json=1&t=week&limit=200",
      { cache: "no-store" },
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/reddit/listing"),
      ),
    ).toBe(false);
  });

  it("opens saved layouts on layer one without selecting a source", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "layered-layout",
        workspaces: [
          {
            ...savedLayeredWorkspace(),
            activeLayerId: "layer-2",
          },
        ],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openSavedLayouts(user, ["Layered layout"]);

    expect(
      screen.getByRole("button", { name: "Select Layer 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Select Layer 2" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("button", { name: "Clone selected source" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Fill empty spaces with selected source",
      }),
    ).not.toBeInTheDocument();
  });

  it("clears saved layout selections after opening selected layouts", async () => {
    stubRandomUuids(["blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "saved-local",
        workspaces: [
          savedLocalUploadWorkspace(undefined, "Saved local"),
          {
            ...savedLocalUploadWorkspace(undefined, "Movie wall"),
            id: "movie-wall",
          },
        ],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Library" }));
    const firstDialog = await screen.findByRole("dialog", { name: "Library" });
    await user.click(
      within(firstDialog).getByRole("checkbox", { name: "Select Saved local" }),
    );
    await user.click(
      within(firstDialog).getByRole("button", {
        name: "Open selected layouts",
      }),
    );
    expect(
      await screen.findByRole("button", { name: "Saved local" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Library" }));
    const reopenedDialog = await screen.findByRole("dialog", {
      name: "Library",
    });

    expect(
      within(reopenedDialog).getByRole("checkbox", {
        name: "Select Saved local",
      }),
    ).not.toBeChecked();
    expect(
      within(reopenedDialog).getByRole("button", {
        name: "Open selected layouts",
      }),
    ).toBeDisabled();
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
      screen.queryByRole("button", { name: "Layout 1" }),
    ).not.toBeInTheDocument();
  });

  it("renames layout tabs on double click", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.dblClick(
      screen.getByRole("button", { name: "Untitled layout" }),
    );
    const renameInput = screen.getByLabelText("Rename Untitled layout");
    await user.clear(renameInput);
    await user.type(renameInput, "Movie Wall{Enter}");

    expect(
      screen.getByRole("button", { name: "Movie Wall" }),
    ).toBeInTheDocument();
  });

  it("limits saved layout names to 32 characters", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    const nameInput = screen.getByLabelText("Layout name");
    await user.clear(nameInput);
    await user.type(nameInput, "a".repeat(80));

    expect(nameInput).toHaveValue("a".repeat(32));
  });

  it("does not rename the saved layout snapshot when renaming an open tab", async () => {
    stubRandomUuids(["workspace-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.dblClick(
      screen.getByRole("button", { name: "Untitled layout" }),
    );
    const renameInput = screen.getByLabelText("Rename Untitled layout");
    await user.clear(renameInput);
    await user.type(renameInput, "Movie Wall{Enter}");
    await user.click(screen.getByRole("button", { name: "Library" }));

    expect(
      screen.getByRole("checkbox", { name: "Select Untitled layout" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Select Movie Wall" }),
    ).not.toBeInTheDocument();
  });

  it("keeps global timer seconds per layout and saves them", async () => {
    stubRandomUuids(["workspace-1", "workspace-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    fireEvent.change(screen.getByLabelText("Global timer seconds"), {
      target: { value: "17" },
    });
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));

    await user.click(screen.getByRole("button", { name: "New layout" }));
    expect(screen.getByLabelText("Global timer seconds")).toHaveValue("10");

    await user.click(screen.getByRole("button", { name: "Untitled layout" }));
    expect(screen.getByLabelText("Global timer seconds")).toHaveValue("17");

    const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "";
    expect(saved).toContain('"globalTimerSeconds":17');
  });

  it("updates the global timer control when opening a saved layout", async () => {
    stubRandomUuids(["workspace-1", "workspace-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    fireEvent.change(screen.getByLabelText("Global timer seconds"), {
      target: { value: "17" },
    });
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "New layout" }));
    fireEvent.change(screen.getByLabelText("Global timer seconds"), {
      target: { value: "5" },
    });

    await openSavedLayouts(user, ["Untitled layout"]);

    expect(screen.getByLabelText("Global timer seconds")).toHaveValue("17");
  });

  it("derives the global timer from legacy saved global sessions", async () => {
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: "workspace-1",
        workspaces: [
          {
            id: "workspace-1",
            name: "Legacy saved",
            layoutMode: "fixed",
            fixedGrid: { columns: 2, rows: 1 },
            updatedAt: "2026-04-24T00:00:00.000Z",
            sessions: [
              {
                id: "session-1",
                title: "r/pics",
                timerMode: "global",
                timerSeconds: 17,
                fixedSlot: 0,
                freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
                sourceConfig: {
                  kind: "reddit",
                  urls: [
                    "https://www.reddit.com/r/pics/comments/abc123/runtime_image/",
                  ],
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

    await openSavedLayouts(user, ["Legacy saved"]);

    expect(screen.getByLabelText("Global timer seconds")).toHaveValue("17");
  });

  it("rejects duplicate save-as layout names", async () => {
    stubRandomUuids(["workspace-1", "workspace-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    const firstNameInput = screen.getByLabelText("Layout name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Layout 1");
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "New layout" }));
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    const nameInput = screen.getByLabelText("Layout name");
    await user.clear(nameInput);
    await user.type(nameInput, "Layout 1");
    await user.click(screen.getByRole("button", { name: "Save as layout" }));

    expect(screen.getByText("Layout names must be unique")).toBeInTheDocument();
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

    await addDefaultSubredditSource(user);
    await screen.findByAltText("Runtime image");

    await user.click(screen.getByRole("button", { name: "New layout" }));
    expect(screen.queryByAltText("Runtime image")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Untitled layout" }));

    expect(await screen.findByAltText("Runtime image")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });
});
