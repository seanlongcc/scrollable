import { render, screen } from "@testing-library/react";
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

  it("keeps focus in a Reddit source URL while typing", async () => {
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

    const urlInput = screen.getByLabelText<HTMLInputElement>("Reddit source 1");
    await user.click(urlInput);
    urlInput.setSelectionRange(urlInput.value.length, urlInput.value.length);
    await user.keyboard("top");

    expect(screen.getByLabelText("Reddit source 1")).toHaveValue(
      "https://www.reddit.com/r/pics/top",
    );
    expect(screen.getByLabelText("Reddit source 1")).toHaveFocus();
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

    const urlInput = screen.getByLabelText("Reddit source 1");
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

function redditSession(): FeedSession {
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
      urls: ["https://www.reddit.com/r/pics/"],
      limit: 10,
      allowNsfw: false,
    },
  };
}
