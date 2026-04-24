import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeedWorkbench } from "./feed-workbench";

const WORKSPACE_STORAGE_KEY = "scrollable.workspaces.v1";

describe("FeedWorkbench", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("does not render saved or shared media previews before runtime feed opens", () => {
    const { container } = render(<FeedWorkbench />);

    expect(container.querySelectorAll("img, video")).toHaveLength(0);
  });

  it("renders a live multi-view workspace with fixed 2x1 defaults", () => {
    const { container } = render(<FeedWorkbench />);

    expect(screen.getByRole("link", { name: "scrollable.app" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByLabelText("Fixed columns")).toHaveValue(2);
    expect(screen.getByLabelText("Fixed rows")).toHaveValue(1);
    expect(screen.getByRole("button", { name: "Global next" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add source" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add source" })).toHaveAttribute(
      "title",
      "Add source",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(container.querySelectorAll("img, video")).toHaveLength(0);
  });

  it("opens sign in and sign up as an overlay", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reddit" })).not.toBeInTheDocument();
  });

  it("uses obvious pointer affordances on toolbar and layout tabs", () => {
    render(<FeedWorkbench />);

    expect(screen.getByRole("button", { name: "Add source" })).toHaveClass(
      "cursor-pointer",
    );
    expect(screen.getByRole("button", { name: "Layout 1" })).toHaveClass(
      "cursor-pointer",
    );
  });

  it("uses a larger brassy home logo", () => {
    render(<FeedWorkbench />);

    expect(screen.getByRole("link", { name: "scrollable.app" })).toHaveClass(
      "text-lg",
      "text-[#d8b86a]",
    );
  });

  it("defaults global and source timers to 10 seconds", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    expect(screen.getByLabelText("Global timer seconds")).toHaveValue(10);
    expect(screen.getByLabelText("Global timer seconds")).toHaveAttribute("min", "1");

    await user.click(screen.getByRole("button", { name: "Add source" }));

    expect(screen.getByLabelText("View timer seconds")).toHaveValue(10);
    expect(screen.getByLabelText("View timer seconds")).toHaveAttribute("min", "1");
  });

  it("closes workspace layout tabs", async () => {
    stubRandomUuids(["workspace-1", "workspace-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "New layout" }));
    expect(screen.getByRole("button", { name: "Layout 2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close Layout 2" }));

    expect(screen.queryByRole("button", { name: "Layout 2" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Layout 1" })).toBeInTheDocument();
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
              media: [{ type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }],
            },
          ],
        }),
      })),
    );
    vi.stubGlobal("crypto", { randomUUID: () => "session-1" });

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Maximize r/pics" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Maximize r/pics" }));

    expect(screen.getByText("Focus view")).toBeInTheDocument();
    expect(screen.getByText("Satellite views")).toBeInTheDocument();
  });

  it("defaults sources to global timers and hides local timer inputs until local mode", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));

    expect(
      await screen.findByRole("button", { name: "r/pics uses global timer" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("r/pics local timer seconds")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "r/pics uses global timer" }));

    expect(screen.getByRole("button", { name: "r/pics uses local timer" })).toBeInTheDocument();
    expect(screen.getByLabelText("r/pics local timer seconds")).toHaveValue(10);
    expect(screen.getByLabelText("r/pics local timer seconds")).toHaveAttribute("min", "1");
  });

  it("shows local timer inputs in compact free-layout sources", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Free layout mode" }));
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));
    await user.click(await screen.findByRole("button", { name: "r/pics uses global timer" }));

    expect(screen.getByLabelText("r/pics local timer seconds")).toBeInTheDocument();
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
        media: [{ type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }],
      },
      {
        id: "runtime-2",
        source: "reddit",
        title: "Runtime image 2",
        subreddit: "pics",
        isNsfw: false,
        createdAt: "2026-04-24T00:00:00.000Z",
        media: [{ type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));
    await screen.findByLabelText("r/pics timer progress");

    await user.click(screen.getByRole("button", { name: "Hide UI" }));

    expect(screen.queryByRole("button", { name: "Add source" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("r/pics timer progress")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show UI" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Show UI" })).not.toHaveClass(
      "opacity-0",
    );
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

    expect(screen.getByRole("button", { name: "Add source" })).toBeInTheDocument();
  });

  it("keeps the add-source dialog available when UI chrome is hidden", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Hide UI" }));
    await user.click(screen.getAllByRole("button", { name: "Add source to empty cell" })[0]);

    expect(screen.getByRole("dialog", { name: "Add source" })).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));
    await screen.findByRole("button", { name: "Maximize r/pics" });

    await user.click(screen.getByRole("button", { name: "Save layout" }));
    expect(screen.getByRole("dialog", { name: "Save layout as" })).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Open Layout 1" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Layout 1" }));

    expect(screen.queryByRole("button", { name: "Open Layout 1" })).not.toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Add local files as separate sources" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.mp4", { type: "video/mp4" }),
    ]);

    expect(screen.getByText("2 sources active · Fixed layout")).toBeInTheDocument();
    expect(screen.getAllByText("a.png").length).toBeGreaterThan(0);
    expect(screen.getAllByText("b.mp4").length).toBeGreaterThan(0);
  });

  it("renames layout tabs on double click", async () => {
    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await user.dblClick(screen.getByRole("button", { name: "Layout 1" }));
    const renameInput = screen.getByLabelText("Rename Layout 1");
    await user.clear(renameInput);
    await user.type(renameInput, "Movie Wall{Enter}");

    expect(screen.getByRole("button", { name: "Movie Wall" })).toBeInTheDocument();
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

  it("opens locally saved layouts without requiring account login", async () => {
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
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));
    await screen.findByRole("button", { name: "Maximize r/pics" });
    await user.click(screen.getByRole("button", { name: "Save layout" }));
    await user.click(screen.getByRole("button", { name: "Save as layout" }));
    await user.click(screen.getByRole("button", { name: "New layout" }));

    await user.click(screen.getByRole("button", { name: "Open layouts" }));
    await user.click(screen.getByRole("button", { name: "Open Layout 1" }));

    expect(screen.getByText("r/pics")).toBeInTheDocument();
    expect(screen.getByText("No runtime media")).toBeInTheDocument();
    expect(container.querySelectorAll("img, video")).toHaveLength(0);
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
        media: [{ type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }],
      },
    ]);
    stubRandomUuids(["workspace-1", "session-1", "workspace-2"]);

    const user = userEvent.setup();
    const { container } = render(<FeedWorkbench />);

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));
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
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));
    await screen.findByRole("button", { name: "Remove r/pics" });

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.clear(screen.getByLabelText("Subreddit"));
    await user.type(screen.getByLabelText("Subreddit"), "aww");
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));
    await screen.findByRole("button", { name: "Remove r/aww" });

    await user.click(screen.getByRole("button", { name: "Remove r/pics" }));

    expect(within(screen.getByTestId("fixed-cell-0")).getByText("Add source")).toBeInTheDocument();
    expect(within(screen.getByTestId("fixed-cell-1")).getByText("r/aww")).toBeInTheDocument();
  });

  it("keeps extra top-added sources hidden until the fixed grid grows", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1", "session-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    fireEvent.change(screen.getByLabelText("Fixed columns"), {
      target: { value: "1" },
    });
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));
    await screen.findByRole("button", { name: "Remove r/pics" });

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.clear(screen.getByLabelText("Subreddit"));
    await user.type(screen.getByLabelText("Subreddit"), "aww");
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));

    expect(screen.getByText("1 hidden source")).toBeInTheDocument();
    expect(screen.queryByText("r/aww")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Fixed columns"), {
      target: { value: "2" },
    });

    expect(await within(screen.getByTestId("fixed-cell-1")).findByText("r/aww")).toBeInTheDocument();
  });

  it("fills empty visible cells by duplicating the selected source with a staggered item", async () => {
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

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Open Reddit source" }));
    await screen.findByRole("button", { name: "Fill visible cells" });

    await user.click(screen.getByRole("button", { name: "Fill visible cells" }));

    expect(within(screen.getByTestId("fixed-cell-1")).getAllByText("r/pics")[0]).toBeInTheDocument();
    expect(within(screen.getByTestId("fixed-cell-1")).getByText(/2\/2/)).toBeInTheDocument();
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
      media: [{ type: "image" as const, url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }],
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
