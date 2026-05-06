import { afterEach, describe, expect, it, vi } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import {
  isSessionOrderRandomized,
  setAllSessionSourcesOrderRandomized,
  setSourceInputsOrderRandomized,
  toggleSessionOrderRandomized,
} from "./source-order-state";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("source order state", () => {
  it("treats local, Reddit, and URL source random order as enabled by default", () => {
    expect(isSessionOrderRandomized(session())).toBe(true);
    expect(
      isSessionOrderRandomized(
        session({
          sourceConfig: { kind: "url", url: "https://example.com/source" },
        }),
      ),
    ).toBe(true);
  });

  it("toggles random order off by restoring source order", () => {
    const source = session({
      items: [item("second"), item("first")],
      allItems: [item("first"), item("second")],
      isOrderRandomized: true,
    });

    const next = toggleSessionOrderRandomized(source);

    expect(next.isOrderRandomized).toBe(false);
    expect(next.items.map((item) => item.id)).toEqual(["first", "second"]);
    expect(next.timer.activeIndex).toBe(0);
  });

  it("toggles random order on by shuffling visible source-order items", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.1);
    const source = session({
      isOrderRandomized: false,
      items: [item("first"), item("second")],
      allItems: [item("first"), item("second"), item("hidden")],
    });

    const next = toggleSessionOrderRandomized(source);

    expect(next.isOrderRandomized).toBe(true);
    expect(next.items.map((item) => item.id)).toEqual(["second", "first"]);
  });

  it("sets every randomizable session order on from global settings", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const reddit = session({ id: "reddit" });
    const url = session({
      id: "url",
      sourceConfig: { kind: "url", url: "https://example.com/source" },
    });
    const singleItem = session({ id: "single", items: [item("only")] });

    const next = setAllSessionSourcesOrderRandomized(
      [reddit, url, singleItem],
      true,
    );

    expect(next[0]).not.toBe(reddit);
    expect(next[0].isOrderRandomized).toBe(true);
    expect(next[0].items.map((item) => item.id)).toEqual(["second", "first"]);
    expect(next[1]).not.toBe(url);
    expect(next[1].isOrderRandomized).toBe(true);
    expect(next[1].items.map((item) => item.id)).toEqual(["second", "first"]);
    expect(next[2]).toBe(singleItem);
  });

  it("sets every randomizable session order off from global settings", () => {
    const randomized = session({
      items: [item("second"), item("first")],
      allItems: [item("first"), item("second")],
      isOrderRandomized: true,
      timer: {
        ...createTimerState({ durationSeconds: 10, itemCount: 2 }),
        activeIndex: 1,
        elapsedMs: 4000,
      },
    });

    const next = setAllSessionSourcesOrderRandomized([randomized], false);

    expect(next[0]).not.toBe(randomized);
    expect(next[0].isOrderRandomized).toBe(false);
    expect(next[0].items.map((item) => item.id)).toEqual(["first", "second"]);
    expect(next[0].timer.activeIndex).toBe(0);
    expect(next[0].timer.elapsedMs).toBe(0);
  });

  it("applies global order mode to new source inputs before placement", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const source = {
      title: "URL stack",
      items: [item("second"), item("first")],
      allItems: [item("first"), item("second")],
      isOrderRandomized: true,
      sourceConfig: { kind: "url" as const, url: "https://example.com" },
    };

    const restored = setSourceInputsOrderRandomized([source], false);
    const shuffled = setSourceInputsOrderRandomized(restored, true);

    expect(restored[0].isOrderRandomized).toBe(false);
    expect(restored[0].items.map((item) => item.id)).toEqual([
      "first",
      "second",
    ]);
    expect(shuffled[0].isOrderRandomized).toBe(true);
    expect(shuffled[0].items.map((item) => item.id)).toEqual([
      "second",
      "first",
    ]);
  });
});

function session(overrides: Partial<FeedSession> = {}): FeedSession {
  const items = [item("first"), item("second")];

  return {
    id: "session-1",
    title: "r/pics",
    layerId: "layer-1",
    timerMode: "global",
    timer: createTimerState({ durationSeconds: 10, itemCount: items.length }),
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 2, rowSpan: 2 },
    items,
    allItems: items,
    sourceConfig: {
      kind: "reddit",
      urls: ["https://www.reddit.com/r/pics/top/?t=week"],
      limit: 10,
      allowNsfw: true,
    },
    ...overrides,
  };
}

function item(id: string): FeedSession["items"][number] {
  return {
    id,
    source: "reddit",
    title: id,
    subreddit: "pics",
    isNsfw: false,
    createdAt: "2026-04-24T00:00:00.000Z",
    media: [{ type: "image", url: `https://cdn.test/${id}.jpg` }],
  };
}
