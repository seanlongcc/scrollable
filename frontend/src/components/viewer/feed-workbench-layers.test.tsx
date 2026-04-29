import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  addDefaultSubredditSource,
  FeedWorkbench,
  installFeedWorkbenchTestHooks,
  stubObjectUrls,
  stubRandomUuids,
  stubRuntimeFetch,
} from "./feed-workbench-test-utils";

describe("FeedWorkbench layers", () => {
  installFeedWorkbenchTestHooks();

  it("reports source and file counts across the default layers", async () => {
    stubObjectUrls();
    stubRandomUuids([
      "workspace-1",
      "local-1",
      "session-1",
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
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["a"], "foreground.png", { type: "image/png" }),
    );

    expect(await screen.findByText("1 source")).toBeInTheDocument();
    expect(screen.getByText("1 file")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Select Layer 2" }));
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["b"], "background.mp4", { type: "video/mp4" }),
      new File(["c"], "background.mp3", { type: "audio/mpeg" }),
    ]);

    expect(await screen.findByLabelText("background.mp4")).toBeInTheDocument();
    expect(screen.getByText("2 files")).toBeInTheDocument();
    expect(screen.getByText("0 sources")).toBeInTheDocument();
  });

  it("starts with all three default layers visible", async () => {
    stubObjectUrls();
    stubRandomUuids(["workspace-1"]);

    render(<FeedWorkbench />);

    expect(
      screen.getByRole("button", { name: "Select Layer 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Select Layer 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select Layer 3" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("0 sources")).toHaveLength(3);
    expect(screen.getAllByText("0 files")).toHaveLength(3);
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
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["a"], "foreground.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("foreground.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Select Layer 2" }));
    expect(screen.getByAltText("foreground.png")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
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
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(
      screen.getByLabelText("Image/video files"),
      new File(["a"], "foreground.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("foreground.png")).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Selected free layout controls" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
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
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.upload(screen.getByLabelText("Image/video files"), [
      new File(["a"], "foreground-a.png", { type: "image/png" }),
      new File(["b"], "foreground-b.png", { type: "image/png" }),
    ]);
    expect(await screen.findByAltText("foreground-a.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Select Layer 2" }));
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
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
  });

  it("keeps fixed-grid content in its assigned cell after another cell is removed", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1", "session-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Remove r/pics" });

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.click(screen.getByRole("button", { name: "Reddit" }));
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
      within(screen.getByTestId("fixed-cell-1")).getByRole("button", {
        name: "Remove r/aww",
      }),
    ).toBeInTheDocument();
  });

  it("keeps extra top-added sources hidden until the fixed grid grows", async () => {
    stubRuntimeFetch();
    stubRandomUuids(["workspace-1", "session-1", "session-2"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    fireEvent.change(screen.getByLabelText("Columns"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Rows"), {
      target: { value: "1" },
    });
    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Remove r/pics" });

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.click(screen.getByRole("button", { name: "Local" }));
    await user.click(screen.getByRole("button", { name: "Reddit" }));
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

    expect(
      screen.queryByRole("button", { name: "Remove r/aww" }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Columns"), {
      target: { value: "2" },
    });

    expect(
      await within(screen.getByTestId("fixed-cell-1")).findByRole("button", {
        name: "Remove r/aww",
      }),
    ).toBeInTheDocument();
  });

  it("clones the selected source into one empty fixed cell", async () => {
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

    fireEvent.change(screen.getByLabelText("Columns"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Rows"), {
      target: { value: "1" },
    });
    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Remove r/pics" });
    await screen.findByRole("button", {
      name: "Clone selected source",
    });

    await user.click(
      screen.getByRole("button", {
        name: "Clone selected source",
      }),
    );

    expect(
      within(screen.getByTestId("fixed-cell-1")).getByAltText(
        "Runtime image 1",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("fixed-cell-2")).getByRole("button", {
        name: "Add source to empty cell",
      }),
    ).toBeInTheDocument();
  });

  it("fills empty visible fixed cells with the selected source", async () => {
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
    stubRandomUuids(["workspace-1", "session-1", "session-2", "session-3"]);

    const user = userEvent.setup();
    render(<FeedWorkbench />);

    fireEvent.change(screen.getByLabelText("Columns"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Rows"), {
      target: { value: "1" },
    });
    await addDefaultSubredditSource(user);
    await screen.findByRole("button", { name: "Remove r/pics" });
    await screen.findByRole("button", {
      name: "Fill empty spaces with selected source",
    });

    await user.click(
      screen.getByRole("button", {
        name: "Fill empty spaces with selected source",
      }),
    );

    expect(
      within(screen.getByTestId("fixed-cell-1")).getByAltText(
        "Runtime image 1",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("fixed-cell-2")).getByAltText(
        "Runtime image 1",
      ),
    ).toBeInTheDocument();
  });
});
