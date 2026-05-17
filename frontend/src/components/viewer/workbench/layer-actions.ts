import { MAX_WORKSPACE_LAYERS } from "@/lib/viewer/workspaces";
import type {
  FeedSession,
  WorkspaceLayer,
  WorkspaceTemplateSlot,
} from "./types";
import { clearActiveLayerState, deleteActiveLayerState } from "./layer-state";

export type ClearedLayerSelectionState = {
  selectedId: null;
  maximizedId: null;
  pendingFixedSlot: null;
  pendingTemplateSlotId: null;
};

export type AddLayerStateResult = {
  layers: WorkspaceLayer[];
  activeLayerId: string;
} & ClearedLayerSelectionState;

export type DeleteLayerActionResult = ReturnType<
  typeof deleteActiveLayerState
> & {
  nextMaximizedId: null;
  nextPendingFixedSlot: null;
  nextPendingTemplateSlotId: null;
};

export type ClearLayerActionResult = ReturnType<typeof clearActiveLayerState> &
  ClearedLayerSelectionState;

export function clearedLayerSelectionState(): ClearedLayerSelectionState {
  return {
    selectedId: null,
    maximizedId: null,
    pendingFixedSlot: null,
    pendingTemplateSlotId: null,
  };
}

export function prepareSelectLayerState(
  activeLayerId: string,
): { activeLayerId: string } & ClearedLayerSelectionState {
  return {
    activeLayerId,
    ...clearedLayerSelectionState(),
  };
}

export function prepareAddLayerState({
  layers,
  createId,
  maxLayers = MAX_WORKSPACE_LAYERS,
}: {
  layers: WorkspaceLayer[];
  createId: () => string;
  maxLayers?: number;
}): AddLayerStateResult | null {
  if (layers.length >= maxLayers) return null;

  const activeLayerId = createId();

  return {
    layers: [
      ...layers,
      {
        id: activeLayerId,
        name: `Layer ${layers.length + 1}`,
      },
    ],
    activeLayerId,
    ...clearedLayerSelectionState(),
  };
}

export function prepareDeleteActiveLayerState({
  layers,
  activeLayerId,
  sessions,
  templateSlots,
  galleryIndexes,
  videoPositions,
}: {
  layers: WorkspaceLayer[];
  activeLayerId: string;
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
}): DeleteLayerActionResult {
  return {
    ...deleteActiveLayerState({
      layers,
      activeLayerId,
      sessions,
      templateSlots,
      galleryIndexes,
      videoPositions,
    }),
    nextMaximizedId: null,
    nextPendingFixedSlot: null,
    nextPendingTemplateSlotId: null,
  };
}

export function prepareClearActiveLayerState({
  activeLayerId,
  sessions,
  templateSlots,
  galleryIndexes,
  videoPositions,
}: {
  activeLayerId: string;
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
}): ClearLayerActionResult {
  return {
    ...clearActiveLayerState({
      activeLayerId,
      sessions,
      templateSlots,
      galleryIndexes,
      videoPositions,
    }),
    ...clearedLayerSelectionState(),
  };
}
