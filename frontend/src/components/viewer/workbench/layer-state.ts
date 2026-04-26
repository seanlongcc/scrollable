import { normalizeWorkspaceLayers } from "@/lib/viewer/workspaces";
import type {
  FeedSession,
  WorkspaceLayer,
  WorkspaceTemplateSlot,
} from "./types";

export type DeleteActiveLayerStateInput = {
  layers: WorkspaceLayer[];
  activeLayerId: string;
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
};

export type DeleteActiveLayerStateResult = {
  nextLayers: WorkspaceLayer[];
  nextActiveLayerId: string;
  nextSessions: FeedSession[];
  nextTemplateSlots: WorkspaceTemplateSlot[];
  nextGalleryIndexes: Record<string, number>;
  nextVideoPositions: Record<string, number>;
  nextSelectedId: string | null;
};

export function deleteActiveLayerState({
  layers,
  activeLayerId,
  sessions,
  templateSlots,
  galleryIndexes,
  videoPositions,
}: DeleteActiveLayerStateInput): DeleteActiveLayerStateResult {
  const deleteIndex = layers.findIndex((layer) => layer.id === activeLayerId);
  const nextLayers = normalizeWorkspaceLayers(
    layers.filter((layer) => layer.id !== activeLayerId),
  );
  const nextActiveLayer =
    nextLayers[Math.min(deleteIndex, nextLayers.length - 1)] ?? nextLayers[0];
  const removedItemIds = new Set(
    sessions
      .filter((session) => session.layerId === activeLayerId)
      .flatMap((session) => session.items.map((item) => item.id)),
  );

  return {
    nextLayers,
    nextActiveLayerId: nextActiveLayer.id,
    nextSessions: sessions.filter(
      (session) => session.layerId !== activeLayerId,
    ),
    nextTemplateSlots: templateSlots.filter(
      (slot) => (slot.layerId ?? activeLayerId) !== activeLayerId,
    ),
    nextGalleryIndexes: Object.fromEntries(
      Object.entries(galleryIndexes).filter(
        ([itemId]) => !removedItemIds.has(itemId),
      ),
    ),
    nextVideoPositions: Object.fromEntries(
      Object.entries(videoPositions).filter(([key]) => {
        const sessionId = key.split(":")[0];
        return !sessions.some(
          (session) =>
            session.id === sessionId && session.layerId === activeLayerId,
        );
      }),
    ),
    nextSelectedId:
      sessions.find((session) => session.layerId === nextActiveLayer.id)?.id ??
      null,
  };
}
