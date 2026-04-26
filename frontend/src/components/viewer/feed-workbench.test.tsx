import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  addDefaultSubredditSource,
  FeedWorkbench,
  installFeedWorkbenchTestHooks,
  openSavedTemplates,
  savedWorkspaceTemplate,
  stubObjectUrls,
  stubRandomUuids,
  stubRuntimeFetch,
  WORKSPACE_TEMPLATE_STORAGE_KEY,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench", () => {
  installFeedWorkbenchTestHooks();

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

  it("keeps the clear button enabled in server markup until hydration completes", () => {
    const html = renderToString(<FeedWorkbench />);
    const clearButtonHtml =
      html.match(/<button(?=[^>]*aria-label="Clear layout")[^>]*>/)?.[0] ?? "";

    expect(clearButtonHtml).not.toBe("");
    expect(clearButtonHtml).not.toMatch(/\sdisabled(?:=|>|$)/);
  });

  it("disables the clear button after hydration when the layout is empty", async () => {
    render(<FeedWorkbench />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Clear layout" }),
      ).toBeDisabled(),
    );
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
      screen.getByText("0 sources active · Free layout"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fixed layout mode" }));
    expect(
      screen.getByText("0 sources active · Fixed layout"),
    ).toBeInTheDocument();

    await addDefaultSubredditSource(user);
    await screen.findByText("1 source active · Fixed layout");

    expect(
      screen.getByRole("button", { name: "Free layout mode" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "New layout" }));
    await openSavedTemplates(user, ["Poster wall"]);

    expect(
      screen.getByText("0 sources active · Free layout"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fixed layout mode" }),
    ).toBeDisabled();
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
    await addDefaultSubredditSource(user);

    await screen.findByRole("button", { name: "Remove r/pics" });
    expect(screen.getByLabelText("Free column")).toHaveValue(1);
    expect(screen.getByLabelText("Free row")).toHaveValue(1);
    expect(screen.getByLabelText("Column span")).toHaveValue(4);
    expect(screen.getByLabelText("Row span")).toHaveValue(4);
  });

  it("defaults global timer to 10 seconds and omits duplicate source timer controls", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    expect(screen.getByLabelText("Global timer seconds")).toHaveValue(10);
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

    await addDefaultSubredditSource(user);
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

    await addDefaultSubredditSource(user);

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
    await addDefaultSubredditSource(user);
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

    await addDefaultSubredditSource(user);

    const activeTitle = await screen.findByText("Runtime image 1");
    const pane = activeTitle.closest("article");
    expect(pane).not.toBeNull();

    fireEvent.wheel(pane!, { deltaY: 100 });
    expect(screen.getByText("Runtime image 2")).toBeInTheDocument();

    fireEvent.wheel(pane!, { deltaY: -100 });
    expect(screen.getByText("Runtime image 1")).toBeInTheDocument();
  });

  it("adds and deletes layers while reporting source and file counts per layer", async () => {
    stubObjectUrls();
    stubRandomUuids([
      "workspace-1",
      "local-1",
      "session-1",
      "layer-2",
      "local-2",
      "local-3",
      "session-2",
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    expect(
      screen.getByRole("button", { name: "Select Layer 1" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["a"], "foreground.png", { type: "image/png" }),
    );

    expect(
      await screen.findByText("Layer 1: 1 source / 1 file"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add layer" }));
    await user.click(screen.getByRole("button", { name: "Select Layer 2" }));
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["b"], "background.mp4", { type: "video/mp4" }),
      new File(["c"], "background.mp3", { type: "audio/mpeg" }),
    ]);

    expect(
      await screen.findByText("2 sources active · Fixed layout"),
    ).toBeInTheDocument();
    expect(screen.getByText("Layer 2: 1 source / 2 files")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Delete active layer" }),
    );

    expect(
      screen.getByText("1 source active · Fixed layout"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Select Layer 2" }),
    ).not.toBeInTheDocument();
  });

  it("renumbers layers after deleting a middle layer", async () => {
    stubObjectUrls();
    stubRandomUuids([
      "workspace-1",
      "layer-2",
      "layer-3",
      "local-1",
      "session-1",
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add layer" }));
    await user.click(screen.getByRole("button", { name: "Add layer" }));
    await user.click(screen.getByRole("button", { name: "Select Layer 3" }));
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["c"], "third-layer.png", { type: "image/png" }),
    );

    expect(await screen.findByAltText("third-layer.png")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Select Layer 2" }));
    await user.click(
      screen.getByRole("button", { name: "Delete active layer" }),
    );

    expect(
      screen.queryByRole("button", { name: "Select Layer 3" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select Layer 2" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByAltText("third-layer.png")).toBeVisible();
    expect(screen.getByText("Layer 2: 1 source / 1 file")).toBeInTheDocument();
  });

  it("keeps inactive layer grids mounted but visually hidden", async () => {
    stubObjectUrls();
    stubRandomUuids([
      "workspace-1",
      "local-1",
      "session-1",
      "layer-2",
      "local-2",
      "session-2",
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["a"], "foreground.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("foreground.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add layer" }));
    await user.click(screen.getByRole("button", { name: "Select Layer 2" }));
    expect(screen.getByAltText("foreground.png")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["b"], "background.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("background.png")).toBeInTheDocument();
    expect(screen.getByAltText("foreground.png")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Select Layer 1" }));

    expect(await screen.findByAltText("foreground.png")).toBeInTheDocument();
    expect(screen.getByAltText("background.png")).not.toBeVisible();
  });

  it("does not auto-select a source when switching layers", async () => {
    stubObjectUrls();
    stubRandomUuids([
      "workspace-1",
      "local-1",
      "session-1",
      "layer-2",
      "local-2",
      "session-2",
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["a"], "foreground.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("foreground.png")).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Selected free layout controls" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add layer" }));
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["b"], "background.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("background.png")).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Selected free layout controls" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Select Layer 1" }));

    expect(screen.getByAltText("foreground.png")).toBeVisible();
    expect(
      screen.queryByRole("group", { name: "Selected free layout controls" }),
    ).not.toBeInTheDocument();
  });

  it("continues advancing inactive layer timers while another layer is active", async () => {
    stubObjectUrls();
    stubRandomUuids([
      "workspace-1",
      "local-1",
      "local-2",
      "session-1",
      "layer-2",
      "local-3",
      "session-2",
    ]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    fireEvent.change(screen.getByLabelText("Global timer seconds"), {
      target: { value: "1" },
    });
    expect(screen.getByLabelText("Global timer seconds")).toHaveValue(1);
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "foreground-a.png", { type: "image/png" }),
      new File(["b"], "foreground-b.png", { type: "image/png" }),
    ]);
    expect(await screen.findByText(/1\/2/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add layer" }));
    await user.click(screen.getByRole("button", { name: "Select Layer 2" }));
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["c"], "background.png", { type: "image/png" }),
    );

    await waitFor(
      () => {
        expect(screen.getByAltText("foreground-b.png")).not.toBeVisible();
      },
      { timeout: 2500 },
    );
    await user.click(screen.getByRole("button", { name: "Select Layer 1" }));

    expect(screen.getByAltText("foreground-b.png")).toBeVisible();
    expect(screen.getByText(/2\/2/)).toBeVisible();
  });

  it("keeps fixed-grid content in its assigned cell after another cell is removed", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1", "session-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Remove r/pics" });

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.clear(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
    );
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      "https://www.reddit.com/r/aww/comments/abc123/runtime_image/",
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
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
    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Remove r/pics" });

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.clear(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
    );
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      "https://www.reddit.com/r/aww/comments/abc123/runtime_image/",
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    expect(screen.getByText("1 hidden source")).toBeInTheDocument();
    expect(screen.queryByText("r/aww")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Fixed columns"), {
      target: { value: "2" },
    });

    expect(
      await within(screen.getByTestId("fixed-cell-1")).findByText("r/aww"),
    ).toBeInTheDocument();
  });

  it("fills empty visible fixed cells by duplicating the selected source", async () => {
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
    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Remove r/pics" });
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
    await screen.findByText(/1\/2/);
    await user.click(
      screen.getByRole("button", { name: "Next item for r/pics" }),
    );
    expect(screen.getByText(/2\/2/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    await user.click(screen.getByRole("button", { name: "Fixed layout mode" }));

    expect(screen.getByText(/2\/2/)).toBeInTheDocument();
  });

  it("clears the current layout only after confirmation", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await addDefaultSubredditSource(user);
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
