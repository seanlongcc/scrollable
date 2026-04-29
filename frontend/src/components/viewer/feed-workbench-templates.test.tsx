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
  isLocalFileCacheSupported,
  loadLocalFiles,
  openSavedLayouts,
  openSavedTemplates,
  savedWorkspaceTemplate,
  stubGridBounds,
  stubObjectUrls,
  stubRandomUuids,
  stubRuntimeFetch,
  WORKSPACE_STORAGE_KEY,
  WORKSPACE_TEMPLATE_STORAGE_KEY,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench workspace templates", () => {
  installFeedWorkbenchTestHooks();

  it("keeps template saving out of fixed layouts", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Save layout" }));

    const dialog = screen.getByRole("dialog", { name: "Save layout as" });
    expect(
      within(dialog).getByRole("button", { name: "Save as layout" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Save as template" }),
    ).not.toBeInTheDocument();
  });

  it("saves free layouts as empty templates without source payloads", async () => {
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

    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Maximize r/pics" });
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("tab", { name: "Template" }));
    await user.click(screen.getByRole("button", { name: "Save as template" }));

    const saved =
      window.localStorage.getItem(WORKSPACE_TEMPLATE_STORAGE_KEY) ?? "";
    expect(saved).toContain('"slots"');
    expect(saved).toContain('"columnSpan":4');
    expect(saved).not.toContain("sourceConfig");
    expect(saved).not.toContain("https://cdn.test/runtime-image.jpg");
    expect(saved).not.toContain("runtime-1");
  });

  it("opens saved templates as empty free layout boxes", async () => {
    stubRandomUuids(["blank-workspace", "opened-template"]);
    window.localStorage.setItem(
      WORKSPACE_TEMPLATE_STORAGE_KEY,
      JSON.stringify({ templates: [savedWorkspaceTemplate()] }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openSavedTemplates(user, ["Poster wall"]);

    expect(
      screen.getByRole("button", { name: "Poster wall" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Add source to template box" }),
    ).toHaveLength(2);
  });

  it("opens the source dialog when clicking anywhere in an empty template box", async () => {
    stubRandomUuids(["blank-workspace", "opened-template"]);
    window.localStorage.setItem(
      WORKSPACE_TEMPLATE_STORAGE_KEY,
      JSON.stringify({ templates: [savedWorkspaceTemplate()] }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openSavedTemplates(user, ["Poster wall"]);
    await user.click(
      screen.getByTestId("template-slot-blank-workspace:slot-1"),
    );

    expect(screen.getByRole("dialog", { name: "Add source" })).toBeVisible();
  });

  it("allows clearing template-only layouts", async () => {
    stubRandomUuids(["blank-workspace", "opened-template"]);
    window.localStorage.setItem(
      WORKSPACE_TEMPLATE_STORAGE_KEY,
      JSON.stringify({ templates: [savedWorkspaceTemplate()] }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openSavedTemplates(user, ["Poster wall"]);
    const clearButton = screen.getByRole("button", { name: "Clear layout" });

    expect(clearButton).toBeEnabled();

    await user.click(clearButton);
    await user.click(
      screen.getByRole("button", { name: "Confirm clear layout" }),
    );

    expect(
      screen.queryByRole("button", { name: "Add source to template box" }),
    ).not.toBeInTheDocument();
  });

  it("removes empty source boxes from loaded templates", async () => {
    stubRandomUuids(["blank-workspace", "opened-template"]);
    window.localStorage.setItem(
      WORKSPACE_TEMPLATE_STORAGE_KEY,
      JSON.stringify({ templates: [savedWorkspaceTemplate()] }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openSavedTemplates(user, ["Poster wall"]);
    await user.click(
      screen.getByRole("button", { name: "Remove source box 1" }),
    );

    expect(
      screen.getAllByRole("button", { name: "Add source to template box" }),
    ).toHaveLength(1);
    expect(
      screen.queryByTestId("template-slot-blank-workspace:slot-1"),
    ).not.toBeInTheDocument();
  });

  it("moves and resizes empty source boxes from loaded templates", async () => {
    const restoreBounds = stubGridBounds();
    stubRandomUuids(["blank-workspace", "opened-template"]);
    window.localStorage.setItem(
      WORKSPACE_TEMPLATE_STORAGE_KEY,
      JSON.stringify({ templates: [savedWorkspaceTemplate()] }),
    );

    render(<FeedWorkbench />);

    try {
      await openSavedTemplates(userEvent.setup(), ["Poster wall"]);

      const firstBox = screen.getByTestId(
        "template-slot-blank-workspace:slot-1",
      );
      fireEvent.pointerDown(
        screen.getByRole("button", { name: "Move source box 1" }),
        { clientX: 0, clientY: 0 },
      );
      fireEvent.pointerMove(window, { clientX: 100, clientY: 100 });

      await waitFor(() =>
        expect(firstBox).toHaveStyle({
          gridColumn: "2 / span 4",
          gridRow: "2 / span 4",
        }),
      );

      fireEvent.pointerUp(window);

      const secondBox = screen.getByTestId(
        "template-slot-blank-workspace:slot-2",
      );
      fireEvent.pointerDown(
        screen.getByRole("button", { name: "Resize source box 2" }),
        { clientX: 0, clientY: 0 },
      );
      fireEvent.pointerMove(window, { clientX: 100, clientY: 0 });

      await waitFor(() =>
        expect(secondBox).toHaveStyle({
          gridColumn: "5 / span 5",
          gridRow: "1 / span 4",
        }),
      );

      fireEvent.pointerUp(window);
    } finally {
      restoreBounds();
    }
  });

  it("fills and restores template boxes when sources are added and removed", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["blank-workspace", "opened-template", "session-1"]);
    window.localStorage.setItem(
      WORKSPACE_TEMPLATE_STORAGE_KEY,
      JSON.stringify({ templates: [savedWorkspaceTemplate()] }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openSavedTemplates(user, ["Poster wall"]);
    await user.click(
      screen.getAllByRole("button", { name: "Add source to template box" })[0],
    );
    const dialog = screen.getByRole("dialog", { name: "Add source" });
    await user.click(within(dialog).getByRole("button", { name: "Reddit" }));
    await user.type(within(dialog).getByLabelText("Subreddit name"), "pics");
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/pics" });
    expect(
      screen.getAllByRole("button", { name: "Add source to template box" }),
    ).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Remove r/pics" }));

    expect(
      screen.getAllByRole("button", { name: "Add source to template box" }),
    ).toHaveLength(2);
  });

  it("restores local video handles from saved layouts created with templates", async () => {
    stubObjectUrls();
    stubRandomUuids(["opened-template", "local-item", "cache-1", "session-1"]);
    vi.mocked(isLocalFileCacheSupported).mockReturnValue(true);
    window.localStorage.setItem(
      WORKSPACE_TEMPLATE_STORAGE_KEY,
      JSON.stringify({ templates: [savedWorkspaceTemplate()] }),
    );

    const user = userEvent.setup();
    const { unmount } = render(<FeedWorkbench />);

    await openSavedTemplates(user, ["Poster wall"]);
    await user.click(
      screen.getAllByRole("button", { name: "Add source to template box" })[0],
    );
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["video"], "large.mp4", { type: "video/mp4" }),
    );
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
    await openSavedLayouts(userEvent.setup(), ["Poster wall"]);
    await waitFor(() => expect(loadLocalFiles).toHaveBeenCalled());

    expect(await screen.findByLabelText("large.mp4")).toBeInTheDocument();
    expect(loadLocalFiles).toHaveBeenCalledWith("cache-1");
    expect(
      window.localStorage.getItem(WORKSPACE_TEMPLATE_STORAGE_KEY) ?? "",
    ).not.toContain("sourceConfig");
  });

  it("toolbar-added sources do not consume template boxes", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["blank-workspace", "opened-template", "session-1"]);
    window.localStorage.setItem(
      WORKSPACE_TEMPLATE_STORAGE_KEY,
      JSON.stringify({ templates: [savedWorkspaceTemplate()] }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await openSavedTemplates(user, ["Poster wall"]);
    await addDefaultSubredditSource(user);

    await screen.findByRole("button", { name: "Remove r/pics" });
    expect(
      screen.getAllByRole("button", { name: "Add source to template box" }),
    ).toHaveLength(2);
  });
});
