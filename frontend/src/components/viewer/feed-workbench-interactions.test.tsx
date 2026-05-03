import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  addDefaultSubredditSource,
  FeedWorkbench,
  installFeedWorkbenchTestHooks,
  openSavedTemplates,
  savedWorkspaceTemplate,
  stubRandomUuids,
  stubRuntimeFetch,
  WORKSPACE_TEMPLATE_STORAGE_KEY,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench interactions", () => {
  installFeedWorkbenchTestHooks();

  it("collapses the desktop workbench panel and expands the stage", async () => {
    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    const workbenchButton = screen.getByRole("button", {
      name: "Collapse workbench",
    });
    expect(workbenchButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Layout mode")).toBeInTheDocument();

    const stage = container.querySelector(
      '[data-testid="workbench-stage-shell"]',
    );
    expect(stage).toHaveClass("md:pl-[20.5rem]");

    await user.click(workbenchButton);

    expect(
      screen.getByRole("button", { name: "Open workbench" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Layout mode")).not.toBeInTheDocument();
    expect(stage).toHaveClass("md:pl-[5rem]");

    await user.click(screen.getByRole("button", { name: "Open workbench" }));

    expect(
      screen.getByRole("button", { name: "Collapse workbench" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Layout mode")).toBeInTheDocument();
    expect(stage).toHaveClass("md:pl-[20.5rem]");
  });

  it("locks layout mode after sources or template boxes are present", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1", "blank-workspace"]);
    window.localStorage.setItem(
      WORKSPACE_TEMPLATE_STORAGE_KEY,
      JSON.stringify({ templates: [savedWorkspaceTemplate()] }),
    );

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    expect(
      screen.getByRole("button", { name: "Free layout mode" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    expect(
      screen.getByRole("button", { name: "Free layout mode" }),
    ).toHaveAttribute("aria-label", "Free layout mode");
    await user.click(screen.getByRole("button", { name: "Fixed layout mode" }));
    expect(
      screen.getByRole("button", { name: "Fixed layout mode" }),
    ).toHaveAttribute("aria-label", "Fixed layout mode");

    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Remove r/pics" });

    expect(
      screen.getByRole("button", { name: "Free layout mode" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "New layout" }));
    await openSavedTemplates(user, ["Poster wall"]);

    expect(
      screen.getAllByRole("button", { name: "Add source to template box" })
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Fixed layout mode" }),
    ).toBeDisabled();
  });

  it("uses 4x4 as the default free-layout source size", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    await addDefaultSubredditSource(user);

    await screen.findByRole("button", { name: "Remove r/pics" });
    expect(screen.getByLabelText("Free column")).toHaveValue("1");
    expect(screen.getByLabelText("Free row")).toHaveValue("1");
    expect(screen.getByLabelText("Column span")).toHaveValue("4");
    expect(screen.getByLabelText("Row span")).toHaveValue("4");
  });

  it("defaults global timer to 10 seconds and omits per-source timer controls", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    expect(screen.getByLabelText("Global timer seconds")).toHaveValue("10");
    expect(screen.getByLabelText("Global timer seconds")).toHaveAttribute(
      "min",
      "1",
    );

    await user.click(screen.getByRole("button", { name: "Add source" }));

    expect(
      screen.queryByLabelText("View timer seconds"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Show NSFW Reddit posts"),
    ).not.toBeInTheDocument();
  });

  it("maximizes a runtime feed into focus plus satellite mode", async () => {
    stubRuntimeFetch([
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
    ]);
    vi.stubGlobal("crypto", { randomUUID: () => "session-1" });

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await addDefaultSubredditSource(user);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Maximize r/pics" }),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Maximize r/pics" }));

    expect(screen.queryByText("Focus view")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Exit satellite" }),
    ).toBeInTheDocument();
  });

  it("defaults sources to global timers and uses the selected-source panel for local mode", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await addDefaultSubredditSource(user);

    expect(
      await screen.findByRole("button", { name: "Local timer" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Local timer seconds")).toHaveValue("10");

    await user.click(screen.getByRole("button", { name: "Local timer" }));

    expect(screen.getByRole("button", { name: "Local timer" })).toHaveAttribute(
      "data-variant",
      "default",
    );
    expect(screen.getByLabelText("Local timer seconds")).toHaveAttribute(
      "min",
      "1",
    );
  });

  it("omits per-source timer controls from compact free-layout sources", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    await addDefaultSubredditSource(user);

    expect(
      screen.queryByRole("button", { name: "r/pics uses global timer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("r/pics local timer seconds"),
    ).not.toBeInTheDocument();
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

    await addDefaultSubredditSource(user);
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

    await addDefaultSubredditSource(user);

    expect(
      await screen.findByAltText("Runtime image 1", undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByAltText("Runtime image 2")).toBeInTheDocument();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByAltText("Runtime image 1")).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByAltText("Runtime image 2")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByAltText("Runtime image 1")).toBeInTheDocument();
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

    await addDefaultSubredditSource(user);

    const activeMedia = await screen.findByAltText(
      "Runtime image 1",
      undefined,
      { timeout: 3000 },
    );
    const pane = activeMedia.closest("article");
    expect(pane).not.toBeNull();

    fireEvent.wheel(pane!, { deltaY: 100 });
    expect(screen.getByAltText("Runtime image 2")).toBeInTheDocument();

    fireEvent.wheel(pane!, { deltaY: -100 });
    expect(screen.getByAltText("Runtime image 1")).toBeInTheDocument();
  });

  it("selects a video source from the media surface", async () => {
    stubRuntimeFetch([
      {
        id: "runtime-video",
        source: "reddit",
        title: "Runtime video",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "video", url: "https://cdn.test/video.mp4" }],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Clone selected source" });

    fireEvent.click(screen.getByTestId("fixed-cell-0"));
    expect(
      screen.queryByRole("button", { name: "Clone selected source" }),
    ).not.toBeInTheDocument();

    fireEvent.pointerDown(screen.getByLabelText("Runtime video"));

    expect(
      screen.getByRole("button", { name: "Clone selected source" }),
    ).toBeInTheDocument();
  });

  it("selects a source from the explicit select handle", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Clone selected source" });

    await user.click(screen.getByTestId("fixed-cell-0"));
    expect(
      screen.queryByRole("button", { name: "Clone selected source" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Select r/pics" }));
    expect(
      screen.getByRole("button", { name: "Clone selected source" }),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("fixed-cell-0"));
    expect(
      screen.queryByRole("button", { name: "Clone selected source" }),
    ).not.toBeInTheDocument();
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

    await addDefaultSubredditSource(user);
    await screen.findByAltText("Runtime image 1", undefined, {
      timeout: 3000,
    });
    await user.click(screen.getByRole("button", { name: "Global next" }));
    expect(screen.getByAltText("Runtime image 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    await user.click(screen.getByRole("button", { name: "Fixed layout mode" }));

    expect(screen.getByAltText("Runtime image 2")).toBeInTheDocument();
  });

  it("clears the current layout only after confirmation", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await addDefaultSubredditSource(user);
    await screen.findByAltText("Runtime image");

    await user.click(screen.getByRole("button", { name: "Clear layout" }));
    expect(screen.getByAltText("Runtime image")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Confirm clear layout" }),
    );

    expect(screen.queryByAltText("Runtime image")).not.toBeInTheDocument();
  });
});
