import {
  countAvailableFreeUnitRects,
  type FreeRect,
} from "@/lib/viewer/layout";
import type {
  FeedSession,
  LayoutMode,
  WorkspaceLayer,
  WorkspaceTemplateSlot,
} from "./types";
import { sessionFileCount } from "./helpers";
import { occupiedFreeRectsForLayer } from "./free-layout-state";

export type LayerStats = WorkspaceLayer & {
  sourceCount: number;
  fileCount: number;
};

export function activeLayerSessions(
  sessions: FeedSession[],
  activeLayerId: string,
) {
  return sessions.filter((session) => session.layerId === activeLayerId);
}

export function activeLayerHasLayoutContent({
  sessions,
  templateSlots,
  activeLayerId,
}: {
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  activeLayerId: string;
}) {
  return (
    sessions.some(
      (session) => (session.layerId ?? activeLayerId) === activeLayerId,
    ) ||
    templateSlots.some(
      (slot) => (slot.layerId ?? activeLayerId) === activeLayerId,
    )
  );
}

export function activeLayerFreeRects({
  sessions,
  templateSlots,
  activeLayerId,
}: {
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  activeLayerId: string;
}) {
  return occupiedFreeRectsForLayer({
    sessions,
    templateSlots,
    layerId: activeLayerId,
  });
}

export function selectedActiveLayerSession({
  sessions,
  activeLayerId,
  selectedId,
}: {
  sessions: FeedSession[];
  activeLayerId: string;
  selectedId: string | null;
}) {
  if (!selectedId) return undefined;

  return activeLayerSessions(sessions, activeLayerId).find(
    (session) => session.id === selectedId,
  );
}

export function hiddenFixedSessions({
  sessions,
  activeLayerId,
  layoutMode,
  visibleFixedCells,
}: {
  sessions: FeedSession[];
  activeLayerId: string;
  layoutMode: LayoutMode;
  visibleFixedCells: number;
}) {
  if (layoutMode !== "fixed") return [];

  return activeLayerSessions(sessions, activeLayerId).filter(
    (session) => session.fixedSlot >= visibleFixedCells,
  );
}

export function visibleFixedEmptySlots({
  sessions,
  activeLayerId,
  visibleFixedCells,
}: {
  sessions: FeedSession[];
  activeLayerId: string;
  visibleFixedCells: number;
}) {
  const occupied = new Set(
    activeLayerSessions(sessions, activeLayerId).map(
      (session) => session.fixedSlot,
    ),
  );

  return Array.from({ length: visibleFixedCells }, (_, index) => index).filter(
    (slot) => !occupied.has(slot),
  );
}

export function availableSeparateSourceSlots({
  layoutMode,
  visibleEmptySlots,
  activeLayerFreeRects,
  pendingTemplateSlotId,
}: {
  layoutMode: LayoutMode;
  visibleEmptySlots: number[];
  activeLayerFreeRects: FreeRect[];
  pendingTemplateSlotId: string | null;
}) {
  return layoutMode === "fixed"
    ? visibleEmptySlots.length
    : countAvailableFreeUnitRects(activeLayerFreeRects) +
        (pendingTemplateSlotId ? 1 : 0);
}

export function deriveLayerStats({
  layers,
  sessions,
}: {
  layers: WorkspaceLayer[];
  sessions: FeedSession[];
}): LayerStats[] {
  return layers.map((layer) => {
    const layerSessions = sessions.filter(
      (session) => session.layerId === layer.id,
    );

    return {
      ...layer,
      sourceCount: layerSessions.length,
      fileCount: layerSessions.reduce(
        (count, session) => count + sessionFileCount(session),
        0,
      ),
    };
  });
}
