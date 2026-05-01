import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import { EditSourceDialog } from "./source-edit-dialog";
import type { FeedSession } from "./types";

describe("EditSourceDialog", () => {
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
    expect(firstRow).toHaveClass("min-h-11");
    expect(screen.getByText("Second listing item").closest("div")).toHaveClass(
      "min-h-11",
    );
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
