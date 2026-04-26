import { describe, expect, it } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import { fillVisibleCellsState } from "./fill-visible-cells-state";

describe("fill visible cells state", () => {
  it("clones the selected source into empty visible fixed slots", () => {
    const source = session({
      id: "source",
      fixedSlot: 2,
      activeIndex: 1,
      elapsedMs: 4200,
      isPaused: true,
      templateSlotId: "slot-1",
    });
    const ids = ["clone-1", "clone-2"];

    const result = fillVisibleCellsState({
      sessions: [source],
      selectedId: "source",
      visibleFixedCells: 3,
      createId: () => ids.shift() ?? "extra",
    });

    expect(result.map((item) => item.fixedSlot)).toEqual([0, 1, 2]);
    expect(result.map((item) => item.id)).toEqual([
      "clone-1",
      "clone-2",
      "source",
    ]);
    expect(result[0]).toMatchObject({
      title: "source",
      layerId: "layer-1",
      fixedSlot: 0,
      freeRect: { column: 5, row: 1, columnSpan: 4, rowSpan: 4 },
      timer: {
        activeIndex: 2,
        durationSeconds: 10,
        elapsedMs: 4200,
        isPaused: true,
      },
      templateSlotId: undefined,
      sourceConfig: source.sourceConfig,
    });
    expect(result[1]).toMatchObject({
      fixedSlot: 1,
      freeRect: { column: 9, row: 1, columnSpan: 4, rowSpan: 4 },
      timer: { activeIndex: 0 },
      templateSlotId: undefined,
    });
  });

  it("uses the selected source layer when finding empty slots", () => {
    const source = session({ id: "source", fixedSlot: 0 });
    const otherLayer = {
      ...session({ id: "other-layer", fixedSlot: 1 }),
      layerId: "layer-2",
    };

    const result = fillVisibleCellsState({
      sessions: [source, otherLayer],
      selectedId: "source",
      visibleFixedCells: 2,
      createId: () => "clone-1",
    });

    expect(result.find((item) => item.id === "clone-1")).toMatchObject({
      layerId: "layer-1",
      fixedSlot: 1,
    });
  });

  it("returns the current sessions when the selected source has no items", () => {
    const sessions = [session({ id: "empty", fixedSlot: 0, itemCount: 0 })];

    expect(
      fillVisibleCellsState({
        sessions,
        selectedId: "empty",
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
  templateSlotId,
}: {
  id: string;
  fixedSlot: number;
  activeIndex?: number;
  elapsedMs?: number;
  isPaused?: boolean;
  itemCount?: number;
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
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
    items,
    allItems: items,
    sourceConfig: { kind: "local", fileCount: itemCount },
    templateSlotId,
  };
}
