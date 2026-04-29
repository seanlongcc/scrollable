import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  addDefaultSubredditSource,
  deferredFetch,
  FeedWorkbench,
  hashTestRedditItemId,
  installFeedWorkbenchTestHooks,
  openSavedLayouts,
  stubRandomUuids,
  stubRuntimeFetch,
  WORKSPACE_STORAGE_KEY,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench Reddit source persistence", () => {
  installFeedWorkbenchTestHooks();

  it("saves hidden Reddit listing items as hashes without runtime payloads", async () => {
    stubRuntimeFetch([
      {
        id: "reddit:one",
        source: "reddit",
        title: "Hidden listing item",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/hidden.jpg" }],
      },
      {
        id: "reddit:two",
        source: "reddit",
        title: "Kept listing item",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/kept.jpg" }],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Reddit" }));
    const sourceDialog = screen.getByRole("dialog", { name: "Add source" });
    await user.clear(within(sourceDialog).getByLabelText("Subreddit name"));
    await user.type(
      within(sourceDialog).getByLabelText("Subreddit name"),
      "kpop",
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
    await screen.findByAltText("Hidden listing item");

    await user.click(screen.getByRole("button", { name: "Edit r/kpop" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit source" });
    await user.click(
      within(editDialog).getByRole("button", {
        name: "Hide Hidden listing item from r/kpop",
      }),
    );
    await user.click(
      within(editDialog).getByRole("button", { name: "Save source" }),
    );
    await screen.findByAltText("Kept listing item");
    expect(
      screen.queryByAltText("Hidden listing item"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "";

    expect(saved).toContain("hiddenItemIdHashes");
    expect(saved).not.toContain("reddit:one");
    expect(saved).not.toContain("Hidden listing item");
    expect(saved).not.toContain("https://cdn.test/hidden.jpg");
  });

  it("filters saved hidden Reddit listing items after refetching a layout", async () => {
    const hiddenHash = await hashTestRedditItemId("reddit:one");
    stubRuntimeFetch([
      {
        id: "reddit:one",
        source: "reddit",
        title: "Hidden listing item",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/hidden.jpg" }],
      },
      {
        id: "reddit:two",
        source: "reddit",
        title: "Kept listing item",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/kept.jpg" }],
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
            layers: [{ id: "layer-1", name: "Layer 1" }],
            activeLayerId: "layer-1",
            layoutMode: "fixed",
            fixedGrid: { columns: 2, rows: 1 },
            globalTimerSeconds: 10,
            updatedAt: "2026-04-24T00:00:00.000Z",
            sessions: [
              {
                id: "session-1",
                title: "r/kpop",
                layerId: "layer-1",
                timerMode: "global",
                timerSeconds: 10,
                fixedSlot: 0,
                freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
                sourceConfig: {
                  kind: "reddit",
                  urls: ["https://www.reddit.com/r/kpop/top/?t=week"],
                  limit: 24,
                  allowNsfw: true,
                  hiddenItemIdHashes: [hiddenHash],
                },
              },
            ],
          },
        ],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openSavedLayouts(user, ["Saved reddit"]);

    expect(await screen.findByAltText("Kept listing item")).toBeInTheDocument();
    expect(
      screen.queryByAltText("Hidden listing item"),
    ).not.toBeInTheDocument();
  });

  it("unhides saved Reddit listing items and refetches them", async () => {
    const hiddenHash = await hashTestRedditItemId("reddit:one");
    stubRuntimeFetch([
      {
        id: "reddit:one",
        source: "reddit",
        title: "Hidden listing item",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/hidden.jpg" }],
      },
      {
        id: "reddit:two",
        source: "reddit",
        title: "Kept listing item",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/kept.jpg" }],
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
            layers: [{ id: "layer-1", name: "Layer 1" }],
            activeLayerId: "layer-1",
            layoutMode: "fixed",
            fixedGrid: { columns: 2, rows: 1 },
            globalTimerSeconds: 10,
            updatedAt: "2026-04-24T00:00:00.000Z",
            sessions: [
              {
                id: "session-1",
                title: "r/kpop",
                layerId: "layer-1",
                timerMode: "global",
                timerSeconds: 10,
                fixedSlot: 0,
                freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
                sourceConfig: {
                  kind: "reddit",
                  urls: ["https://www.reddit.com/r/kpop/top/?t=week"],
                  limit: 24,
                  allowNsfw: true,
                  hiddenItemIdHashes: [hiddenHash],
                },
              },
            ],
          },
        ],
      }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openSavedLayouts(user, ["Saved reddit"]);
    expect(await screen.findByAltText("Kept listing item")).toBeInTheDocument();
    expect(
      screen.queryByAltText("Hidden listing item"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit r/kpop" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit source" });
    expect(
      within(editDialog).queryByText("Hidden items"),
    ).not.toBeInTheDocument();
    expect(
      await within(editDialog).findByText("Hidden listing item"),
    ).toBeInTheDocument();
    expect(
      within(editDialog).queryByText("Hidden item 1"),
    ).not.toBeInTheDocument();
    await user.click(
      within(editDialog).getByRole("button", {
        name: "Unhide Hidden listing item from r/kpop",
      }),
    );
    await user.click(
      within(editDialog).getByRole("button", { name: "Save source" }),
    );

    expect(
      await screen.findByAltText("Hidden listing item"),
    ).toBeInTheDocument();
  });

  it("opens Reddit edit with saved hidden item names from runtime cache", async () => {
    const fetchMock = stubRuntimeFetch([
      {
        id: "reddit:one",
        source: "reddit",
        title: "Hidden listing item",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/hidden.jpg" }],
      },
      {
        id: "reddit:two",
        source: "reddit",
        title: "Kept listing item",
        subreddit: "kpop",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/kept.jpg" }],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Reddit" }));
    const sourceDialog = screen.getByRole("dialog", { name: "Add source" });
    await user.clear(within(sourceDialog).getByLabelText("Subreddit name"));
    await user.type(
      within(sourceDialog).getByLabelText("Subreddit name"),
      "kpop",
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
    await screen.findByAltText("Hidden listing item");

    await user.click(screen.getByRole("button", { name: "Edit r/kpop" }));
    let editDialog = screen.getByRole("dialog", { name: "Edit source" });
    await user.click(
      within(editDialog).getByRole("button", {
        name: "Hide Hidden listing item from r/kpop",
      }),
    );
    await user.click(
      within(editDialog).getByRole("button", { name: "Save source" }),
    );
    await screen.findByAltText("Kept listing item");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Edit r/kpop" }));
    editDialog = screen.getByRole("dialog", { name: "Edit source" });

    expect(
      within(editDialog).getByText("Hidden listing item"),
    ).toBeInTheDocument();
    expect(
      within(editDialog).getByRole("button", {
        name: "Unhide Hidden listing item from r/kpop",
      }),
    ).toHaveAttribute("data-variant", "default");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("hides one media item from a specific Reddit post link", async () => {
    stubRuntimeFetch([
      {
        id: "reddit:gallery",
        source: "reddit" as const,
        title: "Gallery post",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          {
            type: "image" as const,
            url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          },
          {
            type: "image" as const,
            url: "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==",
          },
        ],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      "https://www.reddit.com/r/pics/comments/gallery/gallery_post/",
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
    await user.click(screen.getByRole("button", { name: "Source info" }));
    await screen.findByText(/1\/2/);

    await user.click(screen.getByRole("button", { name: "Edit r/pics" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit source" });
    expect(
      within(editDialog).queryByText("Hidden items"),
    ).not.toBeInTheDocument();
    await user.click(
      within(editDialog).getByRole("button", {
        name: "Hide Gallery post item 1 from r/pics",
      }),
    );
    expect(
      within(editDialog).getByRole("button", {
        name: "Unhide Gallery post item 1 from r/pics",
      }),
    ).toBeInTheDocument();
    await user.click(
      within(editDialog).getByRole("button", { name: "Save source" }),
    );

    expect(await screen.findByText(/1\/1/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "";

    expect(saved).toContain("hiddenItemIdHashes");
    expect(saved).not.toContain("reddit:gallery:media:0");
    expect(saved).not.toContain("Gallery post");
  });

  it("treats Reddit gallery media like local feed items for timers and scrolling", async () => {
    stubRuntimeFetch([
      {
        id: "reddit:gallery",
        source: "reddit" as const,
        title: "Runtime gallery",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          {
            type: "image" as const,
            url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          },
          {
            type: "image" as const,
            url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          },
        ],
      },
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Reddit" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      "https://www.reddit.com/r/pics/comments/abc123/runtime_gallery/",
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByLabelText("r/pics timer progress");
    await user.click(screen.getByRole("button", { name: "Source info" }));
    expect(await screen.findByText(/1\/2/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next media for r/pics" }),
    ).not.toBeInTheDocument();

    const activeTitle = screen.getByText("Runtime gallery");
    const pane = activeTitle.closest("article");
    if (!pane) throw new Error("Feed pane not found");
    fireEvent.wheel(pane, { deltaY: 500 });

    expect(await screen.findByText(/2\/2/)).toBeInTheDocument();
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

    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Maximize r/pics" });
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "New layout" }));

    await openSavedLayouts(user, ["Untitled layout"]);

    expect(await screen.findByAltText("Runtime image")).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("refetches Reddit runtime media after a page refresh", async () => {
    const fetchMock = stubRuntimeFetch([
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
                  urls: ["https://www.reddit.com/r/pics/top/?t=week"],
                  limit: 24,
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

    await openSavedLayouts(user, ["Saved reddit"]);

    expect(await screen.findByAltText("Runtime image")).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
    expect(
      String(
        (
          fetchMock.mock.calls as unknown as Array<
            [RequestInfo | URL, RequestInit?]
          >
        )[0]?.[0],
      ),
    ).toContain("limit=24");
  });

  it("refetches saved Reddit galleries as scrollable feed items", async () => {
    stubRuntimeFetch([
      {
        id: "reddit:gallery",
        source: "reddit" as const,
        title: "Runtime gallery",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [
          {
            type: "image" as const,
            url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          },
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
            globalTimerSeconds: 17,
            updatedAt: "2026-04-24T00:00:00.000Z",
            sessions: [
              {
                id: "session-1",
                title: "r/pics",
                timerMode: "global",
                timerSeconds: 17,
                timerActiveIndex: 0,
                fixedSlot: 0,
                freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
                sourceConfig: {
                  kind: "reddit",
                  urls: [
                    "https://www.reddit.com/r/pics/comments/abc123/runtime_gallery/",
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

    await openSavedLayouts(user, ["Saved reddit"]);

    expect(screen.getByLabelText("Global timer seconds")).toHaveValue(17);
    await user.click(screen.getByRole("button", { name: "Source info" }));
    expect(await screen.findByText(/1\/2/)).toBeInTheDocument();
    await screen.findByLabelText("r/pics timer progress");
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

    await openSavedLayouts(user, ["Saved reddit"]);

    expect(
      await screen.findByText("Loading runtime media"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();

    fetchPromise.resolve();

    expect(await screen.findByAltText("Runtime image")).toBeInTheDocument();
  });
});
