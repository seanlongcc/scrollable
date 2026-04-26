import { FREE_LAYOUT_SIZE, type FreeRect } from "@/lib/viewer/layout";
import { clamp } from "./helpers";
import type { FreeDragState } from "./types";

export function freeDragDelta({
  drag,
  clientX,
  clientY,
}: {
  drag: FreeDragState;
  clientX: number;
  clientY: number;
}) {
  return {
    deltaColumns: Math.round((clientX - drag.startX) / drag.cellWidth),
    deltaRows: Math.round((clientY - drag.startY) / drag.cellHeight),
  };
}

export function nextFreeDragRect({
  drag,
  clientX,
  clientY,
}: {
  drag: FreeDragState;
  clientX: number;
  clientY: number;
}): FreeRect {
  const { deltaColumns, deltaRows } = freeDragDelta({ drag, clientX, clientY });

  if (drag.mode === "move") {
    return {
      ...drag.startRect,
      column: clamp(
        drag.startRect.column + deltaColumns,
        1,
        FREE_LAYOUT_SIZE + 1 - drag.startRect.columnSpan,
      ),
      row: clamp(
        drag.startRect.row + deltaRows,
        1,
        FREE_LAYOUT_SIZE + 1 - drag.startRect.rowSpan,
      ),
    };
  }

  return {
    ...drag.startRect,
    columnSpan: clamp(
      drag.startRect.columnSpan + deltaColumns,
      1,
      FREE_LAYOUT_SIZE + 1 - drag.startRect.column,
    ),
    rowSpan: clamp(
      drag.startRect.rowSpan + deltaRows,
      1,
      FREE_LAYOUT_SIZE + 1 - drag.startRect.row,
    ),
  };
}

export function updateFreeDragCurrentRect({
  current,
  id,
  clientX,
  clientY,
}: {
  current: FreeDragState | null;
  id: string;
  clientX: number;
  clientY: number;
}) {
  if (!current || current.id !== id) return current;

  return {
    ...current,
    currentRect: nextFreeDragRect({ drag: current, clientX, clientY }),
  };
}

export function resolveFreeDragCommitTarget(drag: FreeDragState) {
  return {
    id: drag.id,
    targetType: drag.targetType,
    rect: drag.currentRect,
  };
}
