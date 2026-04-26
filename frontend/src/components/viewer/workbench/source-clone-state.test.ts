import { describe, expect, it } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import {
  cloneSelectedSourceState,
  fillSelectedSourceSpaceState,
} from "./source-clone-state";

describe("source clone state", () => {
  it("clones a selected fixed source once into the first empty fixed slot", () => {
    const source = session({
      id: "source",
      fixedSlot: 2,
      activeIndex: 1,
      elapsedMs: 4200,
      isPaused: true,
      templateSlotId: "slot-1",
    });

    const result = cloneSelectedSourceState({
      sessions: [source],
      selectedId: "source",
      layoutMode: "fixed",
      visibleFixedCells: 3,
      createId: () => "clone-1",
    });

    expect(result.map((item) => item.fixedSlot)).toEqual([0, 2]);
    expect(result.map((item) => item.id)).toEqual(["clone-1", "source"]);
    expect(result[0]).toMatchObject({
      title: "source",
      layerId: "layer-1",
      fixedSlot: 0,
      timer: {
        activeIndex: 1,
        durationSeconds: 10,
        elapsedMs: 4200,
        isPaused: true,
      },
      templateSlotId: undefined,
      sourceConfig: source.sourceConfig,
    });
  });

  it("fills fixed empty slots without offsetting cloned timer indexes", () => {
    const source = session({
      id: "source",
      fixedSlot: 2,
      activeIndex: 1,
    });
    const ids = ["clone-1", "clone-2"];

    const result = fillSelectedSourceSpaceState({
      sessions: [source],
      selectedId: "source",
      layoutMode: "fixed",
      visibleFixedCells: 3,
      createId: () => ids.shift() ?? "extra",
    });

    expect(result.map((item) => item.fixedSlot)).toEqual([0, 1, 2]);
    expect(result.map((item) => item.id)).toEqual([
      "clone-1",
      "clone-2",
      "source",
    ]);
    expect(result.map((item) => item.timer.activeIndex)).toEqual([1, 1, 1]);
  });

  it("clones a selected free source once using the same size when it fits", () => {
    const source = session({ id: "source", fixedSlot: 0 });

    const result = cloneSelectedSourceState({
      sessions: [source],
      selectedId: "source",
      layoutMode: "free",
      visibleFixedCells: 1,
      createId: () => "clone-1",
    });

    expect(result.find((item) => item.id === "clone-1")).toMatchObject({
      fixedSlot: 1,
      freeRect: { column: 5, row: 1, columnSpan: 4, rowSpan: 4 },
      timer: { activeIndex: 0 },
    });
  });

  it("shrinks a free clone when no same-size rectangle fits", () => {
    const source = session({ id: "source", fixedSlot: 0 });
    const leftBlock = session({
      id: "left-block",
      fixedSlot: 1,
      freeRect: { column: 1, row: 5, columnSpan: 4, rowSpan: 12 },
    });
    const middleBlock = session({
      id: "middle-block",
      fixedSlot: 2,
      freeRect: { column: 5, row: 1, columnSpan: 11, rowSpan: 16 },
    });
    const rightBlock = session({
      id: "right-block",
      fixedSlot: 3,
      freeRect: { column: 16, row: 1, columnSpan: 1, rowSpan: 15 },
    });

    const result = cloneSelectedSourceState({
      sessions: [source, leftBlock, middleBlock, rightBlock],
      selectedId: "source",
      layoutMode: "free",
      visibleFixedCells: 1,
      createId: () => "clone-1",
    });

    expect(result.find((item) => item.id === "clone-1")).toMatchObject({
      fixedSlot: 4,
      freeRect: { column: 16, row: 16, columnSpan: 1, rowSpan: 1 },
    });
  });

  it("fills free space using as many fitting source clones as possible", () => {
    const source = session({
      id: "source",
      fixedSlot: 0,
      freeRect: { column: 1, row: 1, columnSpan: 8, rowSpan: 8 },
    });
    const ids = ["clone-1", "clone-2", "clone-3"];

    const result = fillSelectedSourceSpaceState({
      sessions: [source],
      selectedId: "source",
      layoutMode: "free",
      visibleFixedCells: 1,
      createId: () => ids.shift() ?? "extra",
    });

    expect(result.map((item) => item.id)).toEqual([
      "source",
      "clone-1",
      "clone-2",
      "clone-3",
    ]);
    expect(result.map((item) => item.freeRect)).toEqual([
      { column: 1, row: 1, columnSpan: 8, rowSpan: 8 },
      { column: 9, row: 1, columnSpan: 8, rowSpan: 8 },
      { column: 1, row: 9, columnSpan: 8, rowSpan: 8 },
      { column: 9, row: 9, columnSpan: 8, rowSpan: 8 },
    ]);
  });

  it("returns the current sessions when the selected source has no items", () => {
    const sessions = [session({ id: "empty", fixedSlot: 0, itemCount: 0 })];

    expect(
      cloneSelectedSourceState({
        sessions,
        selectedId: "empty",
        layoutMode: "fixed",
        visibleFixedCells: 3,
        createId: () => "clone-1",
      }),
    ).toBe(sessions);
    expect(
      fillSelectedSourceSpaceState({
        sessions,
        selectedId: "empty",
        layoutMode: "fixed",
        visibleFixedCells: 3,
        createId: () => "clone-1",
      }),
    ).toBe(sessions);
  });
});

function session({
  id,
  fixedSlot,
  activeIndex = 0,
  elapsedMs = 0,
  isPaused = false,
  itemCount = 3,
  freeRect = { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
  templateSlotId,
}: {
  id: string;
  fixedSlot: number;
  activeIndex?: number;
  elapsedMs?: number;
  isPaused?: boolean;
  itemCount?: number;
  freeRect?: FeedSession["freeRect"];
  templateSlotId?: string;
}): FeedSession {
  const items = Array.from({ length: itemCount }, (_, index) => ({
    id: `${id}-item-${index}`,
    source: "local" as const,
    title: `${id} item ${index}`,
    isNsfw: false,
    createdAt: "2026-04-26T00:00:00.000Z",
    media: [{ type: "image" as const, url: `blob:${id}-${index}` }],
  }));

  return {
    id,
    title: id,
    layerId: "layer-1",
    timerMode: "global",
    timer: {
      ...createTimerState({ durationSeconds: 10, itemCount }),
      activeIndex,
      elapsedMs,
      isPaused,
    },
    fixedSlot,
    freeRect,
    items,
    allItems: items,
    sourceConfig: { kind: "local", fileCount: itemCount },
    templateSlotId,
  };
}
