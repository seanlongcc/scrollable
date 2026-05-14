import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import { EditSourceDialog } from "./source-edit-dialog";
import {
  LocalSourceFilesEditor,
  type LocalEditEntry,
} from "./source-edit-local-files";
import { UrlSourceRowsEditor, type UrlEditRow } from "./source-edit-url-rows";
import type { FeedSession } from "./types";

describe("EditSourceDialog", () => {
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
  });

  it("keeps focus in the Reddit source URLs textarea while typing", async () => {
    const user = userEvent.setup();

    render(
      <EditSourceDialog
        source={redditSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={vi.fn()}
      />,
    );

    const urlInput =
      screen.getByLabelText<HTMLTextAreaElement>("Reddit source URLs");
    await user.click(urlInput);
    urlInput.setSelectionRange(urlInput.value.length, urlInput.value.length);
    await user.keyboard("top");

    expect(screen.getByLabelText("Reddit source URLs")).toHaveValue(
      "https://www.reddit.com/r/pics/top",
    );
    expect(screen.getByLabelText("Reddit source URLs")).toHaveFocus();
  });

  it("puts Reddit source URLs before compact listing controls", () => {
    render(
      <EditSourceDialog
        source={redditSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={vi.fn()}
      />,
    );

    const urlInput = screen.getByLabelText("Reddit source URLs");
    const subredditInput = screen.getByLabelText("Subreddit name");
    const countInput = screen.getByLabelText("Reddit post count");

    expect(
      urlInput.compareDocumentPosition(subredditInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(subredditInput).toHaveValue("pics");
    expect(screen.getByRole("combobox", { name: "Sort" })).toHaveTextContent(
      "Top",
    );
    expect(
      screen.getByRole("combobox", { name: "Time range" }),
    ).toHaveTextContent("Week");
    expect(countInput).toHaveClass("text-foreground");
  });

  it("edits multiple Reddit source URLs in one scrollable textarea", () => {
    const urls = [
      "https://www.reddit.com/r/pics/",
      "https://www.reddit.com/r/aww/",
    ];

    render(
      <EditSourceDialog
        source={redditSession(urls)}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={vi.fn()}
      />,
    );

    const urlInput =
      screen.getByLabelText<HTMLTextAreaElement>("Reddit source URLs");

    expect(urlInput.tagName).toBe("TEXTAREA");
    expect(urlInput).toHaveValue(urls.join("\n"));
    expect(urlInput).toHaveClass("min-h-40", "overflow-y-auto");
  });

  it("puts URL source title before editable URL rows", () => {
    render(
      <EditSourceDialog
        source={urlSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={vi.fn()}
      />,
    );

    const titleInput = screen.getByLabelText("Title");
    const urlInput = screen.getByLabelText<HTMLInputElement>("URL 1");

    expect(
      titleInput.compareDocumentPosition(urlInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(urlInput.tagName).toBe("INPUT");
    expect(screen.getByRole("button", { name: "Add URL" })).toBeVisible();
  });

  it("edits all URLs from a stacked URL source as rows", () => {
    const urls = [
      "https://example.com/gallery/one",
      "https://example.com/gallery/two",
      "https://example.com/gallery/three",
    ];

    render(
      <EditSourceDialog
        source={urlSession({ urls })}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("URL 1")).toHaveValue(urls[0]);
    expect(screen.getByLabelText("URL 2")).toHaveValue(urls[1]);
    expect(screen.getByLabelText("URL 3")).toHaveValue(urls[2]);
  });

  it("saves reordered URL rows with per-row video ranges", async () => {
    const user = userEvent.setup();
    const onSaveUrl = vi.fn();

    render(
      <EditSourceDialog
        source={urlVideoSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={onSaveUrl}
        onSaveLocal={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("URL 1")).toHaveValue(
      "https://example.com/clip-a.mp4",
    );
    expect(screen.getByLabelText("Start time for URL 1")).toHaveValue("0:10");

    await user.clear(screen.getByLabelText("End time for URL 2"));
    await user.type(screen.getByLabelText("End time for URL 2"), "0:45");
    await user.click(screen.getByRole("button", { name: "Move URL 2 up" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(onSaveUrl).toHaveBeenCalledWith(
      "session-1",
      [
        {
          id: "row-b",
          url: "https://example.com/clip-b.mp4",
          videoTimeRange: { startSeconds: 20, endSeconds: 45 },
        },
        {
          id: "row-a",
          url: "https://example.com/clip-a.mp4",
          videoTimeRange: { startSeconds: 10, endSeconds: 30 },
        },
      ],
      "Example URL",
    );
  });

  it("saves per-file ranges for local video tiles only", async () => {
    const user = userEvent.setup();
    const onSaveLocal = vi.fn();

    render(
      <EditSourceDialog
        source={localVideoSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={onSaveLocal}
      />,
    );

    expect(screen.getByLabelText("Start time for clip.mp4")).toHaveValue(
      "0:10",
    );
    expect(screen.queryByLabelText("Start time for still.png")).toBeNull();

    await user.clear(screen.getByLabelText("End time for clip.mp4"));
    await user.type(screen.getByLabelText("End time for clip.mp4"), "0:30");
    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(onSaveLocal).toHaveBeenCalledWith(
      "session-1",
      expect.arrayContaining([expect.objectContaining({ name: "clip.mp4" })]),
      {
        0: { startSeconds: 10, endSeconds: 30 },
      },
    );
  });

  it("clears URL row starts beyond the known video duration", async () => {
    const user = userEvent.setup();
    const onSaveUrl = vi.fn();
    render(
      <EditSourceDialog
        source={urlVideoSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={onSaveUrl}
        onSaveLocal={vi.fn()}
      />,
    );
    const durationProbe = document.querySelector<HTMLVideoElement>(
      'video[data-video-duration-probe="url-row-1"]',
    );
    Object.defineProperty(durationProbe, "duration", {
      configurable: true,
      value: 360,
    });
    fireEvent.loadedMetadata(durationProbe!);

    await user.clear(screen.getByLabelText("Start time for URL 1"));
    await user.clear(screen.getByLabelText("End time for URL 1"));
    await user.type(screen.getByLabelText("Start time for URL 1"), "10:00");

    expect(screen.getByLabelText("Start time for URL 1")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSaveUrl).toHaveBeenCalledOnce();
    expect(onSaveUrl.mock.calls[0]?.[1][0]).not.toHaveProperty(
      "videoTimeRange",
    );
  });

  it("clears URL row starts from player-known duration on save", async () => {
    const user = userEvent.setup();
    const onSaveUrl = vi.fn();
    render(
      <EditSourceDialog
        source={urlVideoSession({
          ranges: [{ startSeconds: 600 }, { startSeconds: 20 }],
        })}
        videoDurations={{ "session-1:url:row-a:0": 360 }}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={onSaveUrl}
        onSaveLocal={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Start time for URL 1")).toHaveValue("10:00");

    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(screen.getByLabelText("Start time for URL 1")).toHaveValue("");
    expect(onSaveUrl).toHaveBeenCalledOnce();
    expect(onSaveUrl.mock.calls[0]?.[1][0]).not.toHaveProperty(
      "videoTimeRange",
    );
  });

  it("clears local video starts beyond the known file duration", async () => {
    const user = userEvent.setup();
    const onSaveLocal = vi.fn();
    render(
      <EditSourceDialog
        source={localVideoSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={onSaveLocal}
      />,
    );
    const durationProbe = document.querySelector<HTMLVideoElement>(
      'video[data-video-duration-probe="local-file-1"]',
    );
    Object.defineProperty(durationProbe, "duration", {
      configurable: true,
      value: 360,
    });
    fireEvent.loadedMetadata(durationProbe!);

    await user.clear(screen.getByLabelText("Start time for clip.mp4"));
    await user.type(screen.getByLabelText("Start time for clip.mp4"), "10:00");

    expect(screen.getByLabelText("Start time for clip.mp4")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSaveLocal).toHaveBeenCalledOnce();
    expect(onSaveLocal.mock.calls[0]?.[2]).toBeUndefined();
  });

  it("clears local video starts from player-known duration on save", async () => {
    const user = userEvent.setup();
    const onSaveLocal = vi.fn();
    render(
      <EditSourceDialog
        source={localVideoSession({ startSeconds: 600 })}
        videoDurations={{ "session-1:local:video:0": 360 }}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={onSaveLocal}
      />,
    );

    expect(screen.getByLabelText("Start time for clip.mp4")).toHaveValue(
      "10:00",
    );

    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(screen.getByLabelText("Start time for clip.mp4")).toHaveValue("");
    expect(onSaveLocal).toHaveBeenCalledOnce();
    expect(onSaveLocal.mock.calls[0]?.[2]).toBeUndefined();
  });

  it("captures local video probe duration before queued state update runs", () => {
    const entries: LocalEditEntry[] = [
      {
        file: new File(["video"], "clip.mp4", { type: "video/mp4" }),
        previewUrl: "blob:local-video",
        mediaType: "video",
        start: "10:00",
        end: "",
      },
    ];
    let queuedUpdate:
      | ((current: LocalEditEntry[]) => LocalEditEntry[])
      | undefined;

    render(
      <LocalSourceFilesEditor
        entries={entries}
        onEntriesChange={(update) => {
          if (typeof update === "function") queuedUpdate = update;
        }}
      />,
    );

    const durationProbe = document.querySelector<HTMLVideoElement>(
      'video[data-video-duration-probe="local-file-1"]',
    );
    Object.defineProperty(durationProbe, "duration", {
      configurable: true,
      value: 360,
    });

    fireEvent.loadedMetadata(durationProbe!);

    expect(() => queuedUpdate?.(entries)).not.toThrow();
    expect(queuedUpdate?.(entries)[0]?.durationSeconds).toBe(360);
  });

  it("captures URL video probe duration before queued state update runs", () => {
    const rows: UrlEditRow[] = [
      {
        id: "row-a",
        url: "https://example.com/clip.mp4",
        videoUrls: ["blob:url-video"],
        start: "10:00",
        end: "",
      },
    ];
    let queuedUpdate: ((current: UrlEditRow[]) => UrlEditRow[]) | undefined;

    render(
      <UrlSourceRowsEditor
        rows={rows}
        onRowsChange={(update) => {
          if (typeof update === "function") queuedUpdate = update;
        }}
      />,
    );

    const durationProbe = document.querySelector<HTMLVideoElement>(
      'video[data-video-duration-probe="url-row-1"]',
    );
    Object.defineProperty(durationProbe, "duration", {
      configurable: true,
      value: 360,
    });

    fireEvent.loadedMetadata(durationProbe!);

    expect(() => queuedUpdate?.(rows)).not.toThrow();
    expect(queuedUpdate?.(rows)[0]?.durationSeconds).toBe(360);
  });

  it("shows a pending save state while source edits resolve", async () => {
    const user = userEvent.setup();
    let resolveSave!: () => void;
    const onSaveUrl = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(
      <EditSourceDialog
        source={urlSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={onSaveUrl}
        onSaveLocal={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(screen.getByRole("status")).toHaveTextContent("Saving source");
    expect(
      screen.getByRole("button", { name: "Saving source" }),
    ).toBeDisabled();

    resolveSave();

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("keeps the dialog fixed while showing the edit source panel", () => {
    render(
      <EditSourceDialog
        source={urlSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveClass("fixed");
    expect(screen.getByRole("dialog")).not.toHaveClass("relative");
  });

  it("updates a Reddit listing URL from edit listing controls", async () => {
    const user = userEvent.setup();
    const onSaveReddit = vi.fn();

    render(
      <EditSourceDialog
        source={redditSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={onSaveReddit}
        onSaveUrl={vi.fn()}
        onSaveLocal={vi.fn()}
      />,
    );

    await user.clear(screen.getByLabelText("Subreddit name"));
    await user.type(screen.getByLabelText("Subreddit name"), "aww");
    await user.click(screen.getByRole("combobox", { name: "Sort" }));
    await user.click(screen.getByRole("option", { name: "New" }));
    await user.clear(screen.getByLabelText("Reddit post count"));
    await user.type(screen.getByLabelText("Reddit post count"), "25");
    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(onSaveReddit).toHaveBeenCalledWith(
      "session-1",
      ["https://www.reddit.com/r/aww/new/"],
      25,
      [],
      [],
    );
  });

  it("does not expose per-link removal for Reddit sources", () => {
    render(
      <EditSourceDialog
        source={redditSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Remove r/pics link" }),
    ).not.toBeInTheDocument();
  });

  it("keeps Reddit hide item rows content-sized", () => {
    render(
      <EditSourceDialog
        source={redditSession()}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={vi.fn()}
      />,
    );

    const firstRow = screen.getByText("First listing item").closest("div");
    const list = firstRow?.parentElement;

    expect(list).toHaveClass("content-start", "gap-1.5");
    expect(firstRow).toHaveClass("min-h-16");
    expect(
      screen.getByRole("button", {
        name: "Hide First listing item from r/pics",
      }),
    ).toHaveClass("size-11", "min-h-11", "min-w-11");
    expect(screen.getByText("Second listing item").closest("div")).toHaveClass(
      "min-h-16",
    );
  });

  it("shows Reddit items in source order instead of playback random order", () => {
    render(
      <EditSourceDialog
        source={{
          ...redditSession(),
          items: [redditSession().items[1]!, redditSession().items[0]!],
          allItems: redditSession().items,
        }}
        open
        onOpenChange={vi.fn()}
        onSaveReddit={vi.fn()}
        onSaveUrl={vi.fn()}
        onSaveLocal={vi.fn()}
      />,
    );

    const first = screen.getByText("First listing item");
    const second = screen.getByText("Second listing item");

    expect(
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

function redditSession(
  urls: string[] = ["https://www.reddit.com/r/pics/"],
): FeedSession {
  const items: FeedSession["items"] = [
    {
      id: "reddit:first",
      source: "reddit",
      title: "First listing item",
      subreddit: "pics",
      isNsfw: false,
      createdAt: "2026-04-26T00:00:00.000Z",
      media: [{ type: "image", url: "https://cdn.test/first.jpg" }],
    },
    {
      id: "reddit:second",
      source: "reddit",
      title: "Second listing item",
      subreddit: "pics",
      isNsfw: false,
      createdAt: "2026-04-26T00:00:00.000Z",
      media: [{ type: "image", url: "https://cdn.test/second.jpg" }],
    },
  ];

  return {
    id: "session-1",
    title: "r/pics",
    layerId: "layer-1",
    timerMode: "global",
    timer: createTimerState({ durationSeconds: 10, itemCount: items.length }),
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
    items,
    allItems: items,
    sourceConfig: {
      kind: "reddit",
      urls,
      limit: 10,
      allowNsfw: false,
    },
  };
}

function urlSession({ urls }: { urls?: string[] } = {}): FeedSession {
  const url = urls?.[0] ?? "https://example.com/media";

  return {
    ...redditSession(),
    title: "Example URL",
    items: [
      {
        id: "url:first",
        source: "url",
        title: "Example URL",
        isNsfw: false,
        createdAt: "2026-04-26T00:00:00.000Z",
        media: [{ type: "image", url: "https://cdn.test/first.jpg" }],
      },
    ],
    allItems: undefined,
    sourceConfig: {
      kind: "url",
      url,
      ...(urls ? { urls } : {}),
      title: "Example URL",
    },
  };
}

function urlVideoSession({
  ranges,
}: {
  ranges?: Array<{ startSeconds?: number; endSeconds?: number }>;
} = {}): FeedSession {
  const rows = [
    {
      id: "row-a",
      url: "https://example.com/clip-a.mp4",
      videoTimeRange: ranges?.[0] ?? { startSeconds: 10, endSeconds: 30 },
    },
    {
      id: "row-b",
      url: "https://example.com/clip-b.mp4",
      videoTimeRange: ranges?.[1] ?? { startSeconds: 20 },
    },
  ];

  return {
    ...urlSession(),
    items: rows.map((row) => ({
      id: `url:${row.id}`,
      source: "url" as const,
      title: row.url,
      isNsfw: false,
      createdAt: "2026-04-26T00:00:00.000Z",
      media: [
        {
          type: "video" as const,
          url: `blob:${row.id}`,
          videoTimeRange: row.videoTimeRange,
        },
      ],
    })),
    sourceConfig: {
      kind: "url",
      url: rows[0]!.url,
      urls: rows.map((row) => row.url),
      urlRows: rows,
      title: "Example URL",
    },
  };
}

function localVideoSession({
  startSeconds = 10,
}: { startSeconds?: number } = {}): FeedSession {
  const video = new File(["video"], "clip.mp4", { type: "video/mp4" });
  const image = new File(["image"], "still.png", { type: "image/png" });

  return {
    ...redditSession(),
    title: "Local files",
    items: [
      {
        id: "local:video",
        source: "local",
        title: "clip.mp4",
        isNsfw: false,
        createdAt: "2026-04-26T00:00:00.000Z",
        media: [
          {
            type: "video",
            url: "blob:video",
            videoTimeRange: { startSeconds },
          },
        ],
      },
      {
        id: "local:image",
        source: "local",
        title: "still.png",
        isNsfw: false,
        createdAt: "2026-04-26T00:00:00.000Z",
        media: [{ type: "image", url: "blob:image" }],
      },
    ],
    allItems: undefined,
    localFiles: [video, image],
    sourceConfig: {
      kind: "local",
      cacheSetId: "cache-1",
      fileCount: 2,
      videoTimeRanges: {
        0: { startSeconds },
      },
    },
  };
}
