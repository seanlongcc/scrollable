import {
  createFreeRect,
  validateFreeRects,
  type FreeRect,
} from "@/lib/viewer/layout";
import type { FeedSession, LayoutMode, WorkspaceTemplateSlot } from "./types";

export function occupiedFreeRectsForLayer({
  sessions,
  templateSlots,
  layerId,
}: {
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  layerId: string;
}): FreeRect[] {
  return [
    ...sessions
      .filter((session) => session.layerId === layerId)
      .map((session) => session.freeRect),
    ...templateSlots
      .filter((slot) => (slot.layerId ?? layerId) === layerId)
      .map((slot) => slot.freeRect),
  ];
}

export function updateSessionFreeRectState({
  sessions,
  templateSlots,
  id,
  nextRect,
}: {
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  id: string;
  nextRect: Partial<FreeRect>;
}): FeedSession[] {
  const session = sessions.find((candidate) => candidate.id === id);
  if (!session) return sessions;

  const rect = createFreeRect({ ...session.freeRect, ...nextRect });
  validateFreeRects([
    ...sessions
      .filter(
        (candidate) =>
          candidate.id !== id && candidate.layerId === session.layerId,
      )
      .map((candidate) => candidate.freeRect),
    ...templateSlots
      .filter((slot) => (slot.layerId ?? session.layerId) === session.layerId)
      .map((slot) => slot.freeRect),
    rect,
  ]);

  return sessions.map((candidate) =>
    candidate.id === id ? { ...candidate, freeRect: rect } : candidate,
  );
}

export function updateTemplateSlotFreeRectState({
  sessions,
  templateSlots,
  activeLayerId,
  id,
  nextRect,
}: {
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  activeLayerId: string;
  id: string;
  nextRect: Partial<FreeRect>;
}): WorkspaceTemplateSlot[] {
  const slot = templateSlots.find((candidate) => candidate.id === id);
  if (!slot) return templateSlots;

  const layerId = slot.layerId ?? activeLayerId;
  const rect = createFreeRect({ ...slot.freeRect, ...nextRect });
  validateFreeRects([
    ...sessions
      .filter((session) => session.layerId === layerId)
      .map((session) => session.freeRect),
    ...templateSlots
      .filter(
        (candidate) =>
          candidate.id !== id && (candidate.layerId ?? layerId) === layerId,
      )
      .map((candidate) => candidate.freeRect),
    rect,
  ]);

  return templateSlots.map((candidate) =>
    candidate.id === id ? { ...candidate, layerId, freeRect: rect } : candidate,
  );
}

export function restoreTemplateSlotForRemovedSession({
  templateSlots,
  removedSession,
  layoutMode,
}: {
  templateSlots: WorkspaceTemplateSlot[];
  removedSession: FeedSession | null | undefined;
  layoutMode: LayoutMode;
}): WorkspaceTemplateSlot[] {
  if (
    !removedSession?.templateSlotId ||
    layoutMode !== "free" ||
    templateSlots.some((slot) => slot.id === removedSession.templateSlotId)
  ) {
    return templateSlots;
  }

  return [
    ...templateSlots,
    {
      id: removedSession.templateSlotId,
      layerId: removedSession.layerId,
      freeRect: removedSession.freeRect,
    },
  ];
}
