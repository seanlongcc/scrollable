import { findAvailableFreeRectsBySize } from "@/lib/viewer/layout";
import { createTimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";

export function fillVisibleCellsState({
  sessions,
  selectedId,
  visibleFixedCells,
  createId,
}: {
  sessions: FeedSession[];
  selectedId: string | null;
  visibleFixedCells: number;
  createId: () => string;
}) {
  if (!selectedId) return sessions;

  const sourceSession = sessions.find((session) => session.id === selectedId);
  if (!sourceSession?.items.length) return sessions;

  const layerSessions = sessions.filter(
    (session) => session.layerId === sourceSession.layerId,
  );
  const emptySlots = Array.from(
    { length: visibleFixedCells },
    (_, index) => index,
  ).filter(
    (slot) => !layerSessions.some((session) => session.fixedSlot === slot),
  );
  const freeRects = findAvailableFreeRectsBySize(
    layerSessions.map((session) => session.freeRect),
    emptySlots.length,
    {
      columnSpan: sourceSession.freeRect.columnSpan,
      rowSpan: sourceSession.freeRect.rowSpan,
    },
  );

  let cloneIndex = 0;
  const clones = emptySlots.flatMap((fixedSlot, index) => {
    const freeRect = freeRects[index];
    if (!freeRect) return [];

    cloneIndex += 1;
    const timer = createTimerState({
      durationSeconds: sourceSession.timer.durationSeconds,
      itemCount: sourceSession.items.length,
    });

    return {
      ...sourceSession,
      id: createId(),
      fixedSlot,
      freeRect,
      timer: {
        ...timer,
        activeIndex:
          sourceSession.items.length > 0
            ? (sourceSession.timer.activeIndex + cloneIndex) %
              sourceSession.items.length
            : 0,
        elapsedMs: sourceSession.timer.elapsedMs,
        isPaused: sourceSession.timer.isPaused,
      },
      templateSlotId: undefined,
    };
  });

  return [...sessions, ...clones].sort(
    (first, second) => first.fixedSlot - second.fixedSlot,
  );
}
