import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { UrlRuntimeResolution } from "@/lib/url-source/types";
import { findBestAvailableFreeRects } from "@/lib/viewer/layout";
import { createTimerState, type TimerMode } from "@/lib/viewer/timer";
import type {
  FeedSession,
  PersistedSourceConfig,
  WorkspaceTemplateSlot,
} from "./types";

export type SessionPlacementSourceInput = {
  title: string;
  items: RuntimeFeedItem[];
  allItems?: RuntimeFeedItem[];
  isOrderRandomized?: boolean;
  urlResolution?: UrlRuntimeResolution;
  localFiles?: File[];
  sourceConfig: PersistedSourceConfig;
};

export type SessionPlacementInput = {
  current: FeedSession[];
  sources: SessionPlacementSourceInput[];
  activeLayerId: string;
  globalSeconds: number;
  pendingFixedSlot: number | null;
  pendingTemplateSlotId: string | null;
  templateSlots: WorkspaceTemplateSlot[];
  createId: () => string;
};

export type SessionPlacementResult = {
  sessions: FeedSession[];
  selectedSessionId: string | null;
  consumedTemplateSlotId: string | null;
  noFreeLayoutSpace: boolean;
};

export function nextFixedSlot(
  sessions: FeedSession[],
  preferredSlot: number | null,
) {
  const occupied = new Set(sessions.map((session) => session.fixedSlot));
  if (preferredSlot !== null && !occupied.has(preferredSlot)) {
    return preferredSlot;
  }

  let slot = 0;
  while (occupied.has(slot)) slot += 1;
  return slot;
}

export function placeSessions({
  current,
  sources,
  activeLayerId,
  globalSeconds,
  pendingFixedSlot,
  pendingTemplateSlotId,
  templateSlots,
  createId,
}: SessionPlacementInput): SessionPlacementResult {
  const next = [...current];
  const pendingTemplateSlot = pendingTemplateSlotId
    ? templateSlots.find((slot) => slot.id === pendingTemplateSlotId)
    : null;
  const occupiedRects = [
    ...next
      .filter((session) => session.layerId === activeLayerId)
      .map((session) => session.freeRect),
    ...templateSlots
      .filter(
        (slot) =>
          (slot.layerId ?? activeLayerId) === activeLayerId &&
          slot.id !== pendingTemplateSlot?.id,
      )
      .map((slot) => slot.freeRect),
  ];
  let preferredSlot = pendingFixedSlot;
  let selectedSessionId: string | null = null;
  let consumedTemplateSlotId: string | null = null;
  let noFreeLayoutSpace = false;

  for (const [index, source] of sources.entries()) {
    const freeRect =
      index === 0 && pendingTemplateSlot
        ? pendingTemplateSlot.freeRect
        : findBestAvailableFreeRects(occupiedRects, 1)[0];

    if (!freeRect) {
      noFreeLayoutSpace = true;
      break;
    }

    const id = createId();
    const timerMode: TimerMode = "global";
    const fixedSlot = nextFixedSlot(
      next.filter((session) => session.layerId === activeLayerId),
      preferredSlot,
    );
    preferredSlot = null;
    selectedSessionId = id;
    next.push({
      id,
      title: source.title,
      layerId: activeLayerId,
      timerMode,
      timer: createTimerState({
        durationSeconds: globalSeconds,
        itemCount: source.items.length,
      }),
      fixedSlot,
      freeRect,
      items: source.items,
      allItems: source.allItems,
      isOrderRandomized: source.isOrderRandomized,
      urlResolution: source.urlResolution,
      localFiles: source.localFiles,
      templateSlotId:
        index === 0 && pendingTemplateSlot ? pendingTemplateSlot.id : undefined,
      sourceConfig: source.sourceConfig,
    });
    occupiedRects.push(freeRect);
    if (index === 0 && pendingTemplateSlot) {
      consumedTemplateSlotId = pendingTemplateSlot.id;
    }
  }

  return {
    sessions: next.sort((first, second) => first.fixedSlot - second.fixedSlot),
    selectedSessionId,
    consumedTemplateSlotId,
    noFreeLayoutSpace,
  };
}
