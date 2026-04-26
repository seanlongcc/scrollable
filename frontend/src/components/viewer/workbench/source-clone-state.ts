import {
  FREE_LAYOUT_SIZE,
  findAvailableFreeRectsBySize,
  type FreeRect,
} from "@/lib/viewer/layout";
import { createTimerState } from "@/lib/viewer/timer";
import { nextFixedSlot } from "./session-placement";
import type { FeedSession, LayoutMode } from "./types";

type SourceCloneStateInput = {
  sessions: FeedSession[];
  selectedId: string | null;
  layoutMode: LayoutMode;
  visibleFixedCells: number;
  createId: () => string;
};

export function cloneSelectedSourceState(input: SourceCloneStateInput) {
  return cloneSelectedSource(input, { fill: false });
}

export function fillSelectedSourceSpaceState(input: SourceCloneStateInput) {
  return cloneSelectedSource(input, { fill: true });
}

function cloneSelectedSource(
  {
    sessions,
    selectedId,
    layoutMode,
    visibleFixedCells,
    createId,
  }: SourceCloneStateInput,
  { fill }: { fill: boolean },
) {
  const sourceSession = selectedActionSource(sessions, selectedId);
  if (!sourceSession) return sessions;

  const layerSessions = sessionsForSourceLayer(sessions, sourceSession);
  const clones =
    layoutMode === "fixed"
      ? fixedLayoutClones({
          layerSessions,
          sourceSession,
          visibleFixedCells,
          createId,
          fill,
        })
      : freeLayoutClones({
          layerSessions,
          sourceSession,
          createId,
          fill,
        });

  if (!clones.length) return sessions;

  return [...sessions, ...clones].sort(
    (first, second) => first.fixedSlot - second.fixedSlot,
  );
}

function fixedLayoutClones({
  layerSessions,
  sourceSession,
  visibleFixedCells,
  createId,
  fill,
}: {
  layerSessions: FeedSession[];
  sourceSession: FeedSession;
  visibleFixedCells: number;
  createId: () => string;
  fill: boolean;
}) {
  const slots = emptyVisibleFixedSlots({ layerSessions, visibleFixedCells });
  const targetSlots = fill ? slots : slots.slice(0, 1);
  const occupiedFreeRects = layerSessions.map((session) => session.freeRect);

  return targetSlots.map((fixedSlot) => {
    const freeRect =
      findFittingFreeRect(occupiedFreeRects, sourceSession.freeRect) ??
      sourceSession.freeRect;
    occupiedFreeRects.push(freeRect);

    return createSessionClone({
      sourceSession,
      id: createId(),
      fixedSlot,
      freeRect,
    });
  });
}

function freeLayoutClones({
  layerSessions,
  sourceSession,
  createId,
  fill,
}: {
  layerSessions: FeedSession[];
  sourceSession: FeedSession;
  createId: () => string;
  fill: boolean;
}) {
  const occupiedFreeRects = layerSessions.map((session) => session.freeRect);
  const clones: FeedSession[] = [];

  while (true) {
    const freeRect = findFittingFreeRect(
      occupiedFreeRects,
      sourceSession.freeRect,
    );
    if (!freeRect) break;

    const fixedSlot = nextFixedSlot([...layerSessions, ...clones], null);
    clones.push(
      createSessionClone({
        sourceSession,
        id: createId(),
        fixedSlot,
        freeRect,
      }),
    );
    occupiedFreeRects.push(freeRect);

    if (!fill) break;
  }

  return clones;
}

function selectedActionSource(
  sessions: FeedSession[],
  selectedId: string | null,
) {
  if (!selectedId) return null;

  const sourceSession = sessions.find((session) => session.id === selectedId);
  return sourceSession?.items.length ? sourceSession : null;
}

function sessionsForSourceLayer(
  sessions: FeedSession[],
  sourceSession: FeedSession,
) {
  return sessions.filter(
    (session) => session.layerId === sourceSession.layerId,
  );
}

function emptyVisibleFixedSlots({
  layerSessions,
  visibleFixedCells,
}: {
  layerSessions: FeedSession[];
  visibleFixedCells: number;
}) {
  const occupied = new Set(layerSessions.map((session) => session.fixedSlot));

  return Array.from({ length: visibleFixedCells }, (_, index) => index).filter(
    (slot) => !occupied.has(slot),
  );
}

function createSessionClone({
  sourceSession,
  id,
  fixedSlot,
  freeRect,
}: {
  sourceSession: FeedSession;
  id: string;
  fixedSlot: number;
  freeRect: FreeRect;
}): FeedSession {
  const timer = createTimerState({
    durationSeconds: sourceSession.timer.durationSeconds,
    itemCount: sourceSession.items.length,
  });

  return {
    ...sourceSession,
    id,
    fixedSlot,
    freeRect,
    timer: {
      ...timer,
      activeIndex: sourceSession.timer.activeIndex,
      elapsedMs: sourceSession.timer.elapsedMs,
      isPaused: sourceSession.timer.isPaused,
    },
    templateSlotId: undefined,
  };
}

function findFittingFreeRect(
  occupiedRects: FreeRect[],
  sourceRect: Pick<FreeRect, "columnSpan" | "rowSpan">,
) {
  for (const size of candidateCloneSizes(sourceRect)) {
    const rect = findAvailableFreeRectsBySize(occupiedRects, 1, size)[0];
    if (rect) return rect;
  }

  return null;
}

function candidateCloneSizes({
  columnSpan,
  rowSpan,
}: Pick<FreeRect, "columnSpan" | "rowSpan">) {
  const maxColumnSpan = Math.min(columnSpan, FREE_LAYOUT_SIZE);
  const maxRowSpan = Math.min(rowSpan, FREE_LAYOUT_SIZE);
  const sizes: Array<Pick<FreeRect, "columnSpan" | "rowSpan">> = [];

  for (
    let nextColumnSpan = 1;
    nextColumnSpan <= maxColumnSpan;
    nextColumnSpan += 1
  ) {
    for (let nextRowSpan = 1; nextRowSpan <= maxRowSpan; nextRowSpan += 1) {
      sizes.push({
        columnSpan: nextColumnSpan,
        rowSpan: nextRowSpan,
      });
    }
  }

  return sizes.sort((first, second) => {
    const areaDifference =
      second.columnSpan * second.rowSpan - first.columnSpan * first.rowSpan;
    if (areaDifference !== 0) return areaDifference;

    const firstDistance =
      Math.abs(columnSpan - first.columnSpan) +
      Math.abs(rowSpan - first.rowSpan);
    const secondDistance =
      Math.abs(columnSpan - second.columnSpan) +
      Math.abs(rowSpan - second.rowSpan);
    if (firstDistance !== secondDistance) return firstDistance - secondDistance;

    if (second.columnSpan !== first.columnSpan) {
      return second.columnSpan - first.columnSpan;
    }

    return second.rowSpan - first.rowSpan;
  });
}
