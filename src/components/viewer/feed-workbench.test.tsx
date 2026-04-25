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
const WORKSPACE_SESSION_STORAGE_KEY = "scrollable.workspace-session.v1";

describe("FeedWorkbench", () => {
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
    window.sessionStorage.clear();
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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

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

  it("uses one shared old-style grouping control in the add-source dialog", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    const dialog = screen.getByRole("dialog", { name: "Add source" });

    expect(
      within(dialog).queryByText("Source grouping"),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("group", { name: "Source mode" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", {
        name: "Add sources as one stacked source",
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", {
        name: "Add sources as separate sources",
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", {
        name: "Add local files as separate sources",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", {
        name: "Add Reddit links as separate sources",
      }),
    ).not.toBeInTheDocument();
  });

  it("sends pasted Reddit post links to the runtime endpoint", async () => {
    const fetchMock = stubRuntimeFetch();

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      [
        "https://www.reddit.com/r/pics/comments/abc123/runtime_image/",
        "https://www.reddit.com/r/aww/comments/def456/runtime_image/",
      ].join("\n"),
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/pics" });
    const requestUrl = String(
      (
        fetchMock.mock.calls as unknown as Array<
          [RequestInfo | URL, RequestInit?]
        >
      )[0]?.[0],
    );
    expect(requestUrl).toContain(
      "urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Fpics",
    );
    expect(requestUrl).toContain("urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Faww");
    expect(requestUrl).toContain("allowNsfw=true");
  });

  it("sends subreddit listing URLs with a custom media count", async () => {
    const fetchMock = stubRuntimeFetch([
      {
        id: "runtime-kpop",
        source: "reddit",
        title: "Runtime kpop",
        subreddit: "kpop",
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

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.clear(screen.getByLabelText("Reddit media count"));
    await user.type(screen.getByLabelText("Reddit media count"), "24");
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      "https://www.reddit.com/r/kpop/top/?t=week",
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/kpop" });
    const requestUrl = String(
      (
        fetchMock.mock.calls as unknown as Array<
          [RequestInfo | URL, RequestInit?]
        >
      )[0]?.[0],
    );
    expect(requestUrl).toContain(
      "urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Fkpop%2Ftop%2F%3Ft%3Dweek",
    );
    expect(requestUrl).toContain("limit=24");
  });

  it("accepts a bare subreddit name with listing controls", async () => {
    const fetchMock = stubRuntimeFetch([
      {
        id: "runtime-kpop",
        source: "reddit",
        title: "Runtime kpop",
        subreddit: "kpop",
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

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    const dialog = screen.getByRole("dialog", { name: "Add source" });
    expect(
      within(dialog).getByRole("button", { name: "Use subreddit name" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.clear(within(dialog).getByLabelText("Subreddit name"));
    await user.type(within(dialog).getByLabelText("Subreddit name"), "kpop");
    await user.click(within(dialog).getByRole("combobox", { name: "Sort" }));
    await user.click(screen.getByRole("option", { name: "Top" }));
    await user.click(
      within(dialog).getByRole("combobox", { name: "Time range" }),
    );
    await user.click(screen.getByRole("option", { name: "Week" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/kpop" });
    const requestUrl = String(
      (
        fetchMock.mock.calls as unknown as Array<
          [RequestInfo | URL, RequestInit?]
        >
      )[0]?.[0],
    );
    expect(requestUrl).toContain(
      "urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Fkpop%2Ftop%2F%3Ft%3Dweek",
    );
  });

  it("keeps bare subreddit examples out of the Reddit links placeholder", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));

    const placeholder = screen
      .getByLabelText("Paste Reddit post or subreddit links, one per line")
      .getAttribute("placeholder");
    expect(placeholder).toContain("Specific post link");
    expect(placeholder).toContain("Sorted subreddit link");
    expect(placeholder).not.toContain("Subreddit name");
    expect(placeholder).not.toContain("\nkpop");
  });

  it("can add Reddit post links as separate sources", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = new URL(String(input), "http://localhost");
      const sourceUrl = requestUrl.searchParams.get("urls") ?? "";
      const subreddit = sourceUrl.includes("/r/aww/") ? "aww" : "pics";

      return {
        ok: true,
        json: async () => ({
          items: [
            {
              id: `runtime-${subreddit}`,
              source: "reddit",
              title: `Runtime ${subreddit}`,
              subreddit,
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
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await selectSourceGrouping(user, "Separate sources");
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      [
        "https://www.reddit.com/r/pics/comments/abc123/runtime_image/",
        "https://www.reddit.com/r/aww/comments/def456/runtime_image/",
      ].join("\n"),
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByRole("button", { name: "Remove r/pics" });
    await screen.findByRole("button", { name: "Remove r/aww" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Fpics",
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain(
      "urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Faww",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Faww",
    );
  });

  it("edits a Reddit source by removing a link and refetching remaining media", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = new URL(String(input), "http://localhost");
      const sourceUrls = requestUrl.searchParams.getAll("urls");
      const subreddit = sourceUrls.some((url) => url.includes("/r/aww/"))
        ? "aww"
        : "pics";

      return {
        ok: true,
        json: async () => ({
          items: [
            {
              id: `runtime-${subreddit}-${fetchMock.mock.calls.length}`,
              source: "reddit",
              title: `Runtime ${subreddit}`,
              subreddit,
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
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      [
        "https://www.reddit.com/r/pics/comments/abc123/runtime_image/",
        "https://www.reddit.com/r/aww/comments/def456/runtime_image/",
      ].join("\n"),
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
    await screen.findByRole("button", { name: "Edit r/pics" });

    await user.click(screen.getByRole("button", { name: "Edit r/pics" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit source" });
    await user.click(
      within(editDialog).getByRole("button", { name: "Remove r/pics link" }),
    );
    await user.click(
      within(editDialog).getByRole("button", { name: "Save source" }),
    );

    await screen.findByRole("button", { name: "Edit r/aww" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const refetchUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(refetchUrl).toContain("urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Faww");
    expect(refetchUrl).not.toContain(
      "urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Fpics",
    );
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
    await user.click(screen.getByRole("button", { name: "Use Reddit links" }));
    await user.type(
      screen.getByLabelText(
        "Paste Reddit post or subreddit links, one per line",
      ),
      "https://www.reddit.com/r/pics/comments/abc123/runtime_gallery/",
    );
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

    await screen.findByLabelText("r/pics timer progress");
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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));

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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
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
      screen.getByRole("checkbox", { name: "Select Layout 1" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Layout 1" }));

    expect(
      screen.queryByRole("checkbox", { name: "Select Layout 1" }),
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

    await user.click(screen.getByRole("button", { name: "Open layouts" }));

    const dialog = screen.getByRole("dialog", { name: "Saved layouts" });
    expect(
      within(dialog).getByText("fixed · 3 layers · 2 sources · 5 files"),
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

    await openSavedLayouts(user, ["Layout 1"]);

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

    await openSavedLayouts(user, ["Layout 1"]);

    expect(await screen.findByAltText("a.png")).toBeInTheDocument();
    expect(screen.queryByText("No runtime media")).not.toBeInTheDocument();
    expect(screen.getByText(/1\/1/)).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
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
    expect(
      screen.getByRole("button", { name: "Layout 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("0 sources active · Fixed layout"),
    ).toBeInTheDocument();
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
    expect(screen.getByText(/1 source active/)).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Open layouts" }));

    const dialog = screen.getByRole("dialog", { name: "Saved layouts" });
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
    expect(saveLocalFiles).toHaveBeenCalledWith("cache-2", [
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
    expect(saveLocalFiles).toHaveBeenCalledWith("local-1", [
      expect.objectContaining({ name: "cached.png" }),
    ]);
    expect(saved).toContain('"cacheSetId":"local-1"');
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
    await selectSourceGrouping(user, "Separate sources");
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
    expect(screen.getByText("Layer 1: 1 source / 1 file")).toBeInTheDocument();
    expect(saveLocalFiles).toHaveBeenLastCalledWith("cache-2", [
      expect.objectContaining({ name: "b.png" }),
    ]);
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

  it("uploads audio files into the current layer as local runtime media", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1", "local-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    expect(screen.getByLabelText("Image/video files")).toHaveAttribute(
      "accept",
      "image/*,video/*,audio/*",
    );
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["sound"], "ambient.mp3", { type: "audio/mpeg" }),
    );

    expect(await screen.findByLabelText("ambient.mp3")).toBeInTheDocument();
    expect(screen.getByText("Layer 1: 1 source / 1 file")).toBeInTheDocument();
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
    await user.dblClick(screen.getByRole("button", { name: "Layout 1" }));
    const renameInput = screen.getByLabelText("Rename Layout 1");
    await user.clear(renameInput);
    await user.type(renameInput, "Movie Wall{Enter}");
    await user.click(screen.getByRole("button", { name: "Open layouts" }));

    expect(
      screen.getByRole("checkbox", { name: "Select Layout 1" }),
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
    expect(screen.getByLabelText("Global timer seconds")).toHaveValue(10);

    await user.click(screen.getByRole("button", { name: "Layout 1" }));
    expect(screen.getByLabelText("Global timer seconds")).toHaveValue(17);

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

    await openSavedLayouts(user, ["Layout 1"]);

    expect(screen.getByLabelText("Global timer seconds")).toHaveValue(17);
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

    expect(screen.getByLabelText("Global timer seconds")).toHaveValue(17);
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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
    await screen.findByRole("button", { name: "Maximize r/pics" });
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "New layout" }));

    await openSavedLayouts(user, ["Layout 1"]);

    expect(screen.getAllByText("r/pics").length).toBeGreaterThan(0);
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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
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
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
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
    await selectSourceGrouping(user, "Separate sources");
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
    await user.click(screen.getByRole("button", { name: "Open Reddit links" }));
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
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ items }),
  }));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
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

async function openSavedLayouts(
  user: ReturnType<typeof userEvent.setup>,
  names: string[],
) {
  await user.click(screen.getByRole("button", { name: "Open layouts" }));
  const dialog = screen.getByRole("dialog", { name: "Saved layouts" });

  for (const name of names) {
    await user.click(
      within(dialog).getByRole("checkbox", { name: `Select ${name}` }),
    );
  }

  await user.click(
    within(dialog).getByRole("button", { name: "Open selected layouts" }),
  );
}

async function selectSourceGrouping(
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

function savedLayeredWorkspace() {
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
