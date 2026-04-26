import { describe, expect, it } from "vitest";

import type { FreeDragState } from "./types";
import {
  freeDragDelta,
  nextFreeDragRect,
  resolveFreeDragCommitTarget,
  updateFreeDragCurrentRect,
} from "./free-drag-state";

describe("free drag state", () => {
  it("calculates pointer deltas in free-layout grid cells", () => {
    expect(
      freeDragDelta({
        drag: dragState(),
        clientX: 149,
        clientY: 51,
      }),
    ).toEqual({ deltaColumns: 1, deltaRows: 1 });
  });

  it("clamps moved rectangles inside the free-layout canvas", () => {
    expect(
      nextFreeDragRect({
        drag: dragState({
          mode: "move",
          startRect: { column: 12, row: 12, columnSpan: 4, rowSpan: 4 },
        }),
        clientX: 1000,
        clientY: 1000,
      }),
    ).toEqual({ column: 13, row: 13, columnSpan: 4, rowSpan: 4 });
  });

  it("clamps resized rectangles inside the free-layout canvas", () => {
    expect(
      nextFreeDragRect({
        drag: dragState({
          mode: "resize",
          startRect: { column: 14, row: 15, columnSpan: 1, rowSpan: 1 },
        }),
        clientX: 1000,
        clientY: 1000,
      }),
    ).toEqual({ column: 14, row: 15, columnSpan: 3, rowSpan: 2 });
  });

  it("updates only the active drag state", () => {
    const current = dragState({ id: "drag-1" });

    expect(
      updateFreeDragCurrentRect({
        current,
        id: "other",
        clientX: 1000,
        clientY: 1000,
      }),
    ).toBe(current);

    expect(
      updateFreeDragCurrentRect({
        current,
        id: "drag-1",
        clientX: 100,
        clientY: 0,
      })?.currentRect,
    ).toEqual({ column: 2, row: 1, columnSpan: 4, rowSpan: 4 });
  });

  it("resolves the drag commit target", () => {
    expect(
      resolveFreeDragCommitTarget(
        dragState({
          id: "slot-1",
          targetType: "template-slot",
          currentRect: { column: 5, row: 1, columnSpan: 4, rowSpan: 4 },
        }),
      ),
    ).toEqual({
      id: "slot-1",
      targetType: "template-slot",
      rect: { column: 5, row: 1, columnSpan: 4, rowSpan: 4 },
    });
  });
});

function dragState(overrides: Partial<FreeDragState> = {}): FreeDragState {
  const startRect = overrides.startRect ?? {
    column: 1,
    row: 1,
    columnSpan: 4,
    rowSpan: 4,
  };

  return {
    id: "drag-1",
    targetType: "session",
    mode: "move",
    startX: 0,
    startY: 0,
    cellWidth: 100,
    cellHeight: 50,
    startRect,
    currentRect: startRect,
    ...overrides,
  };
}
