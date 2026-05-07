import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import { EditSourceDialog } from "./source-edit-dialog";
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

  it("puts URL source title before the larger URL field", () => {
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
    const urlInput = screen.getByLabelText<HTMLTextAreaElement>("URL");

    expect(
      titleInput.compareDocumentPosition(urlInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(urlInput.tagName).toBe("TEXTAREA");
    expect(urlInput).toHaveClass("min-h-40", "overflow-y-auto");
  });

  it("edits all URLs from a stacked URL source", () => {
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

    expect(screen.getByLabelText("URL")).toHaveValue(urls.join("\n"));
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
