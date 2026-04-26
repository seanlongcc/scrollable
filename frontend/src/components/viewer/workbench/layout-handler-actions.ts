import type {
  Dispatch,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
} from "react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  createFixedGrid,
  FREE_LAYOUT_SIZE,
  type FixedGrid,
  type FreeRect,
} from "@/lib/viewer/layout";
import type { TimerMode } from "@/lib/viewer/timer";
import { signOutAccountAction } from "./account-actions";
import {
  cloneSelectedSourceState,
  fillSelectedSourceSpaceState,
} from "./source-clone-state";
import {
  resolveFreeDragCommitTarget,
  updateFreeDragCurrentRect,
} from "./free-drag-state";
import {
  restoreTemplateSlotForRemovedSession,
  updateSessionFreeRectState,
  updateTemplateSlotFreeRectState,
} from "./free-layout-state";
import {
  prepareAddLayerState,
  prepareDeleteActiveLayerState,
  prepareSelectLayerState,
} from "./layer-actions";
import {
  applyGlobalTimerActionState,
  applyGlobalTimerSecondsState,
  applyViewTimerModeState,
  applyViewTimerSecondsState,
  type GlobalTimerAction,
} from "./timer-actions";
import type {
  AccountState,
  FeedSession,
  FreeDragState,
  LayoutMode,
  WorkspaceLayer,
  WorkspaceTemplateSlot,
} from "./types";

type LayoutHandlersInput = {
  layoutMode: LayoutMode;
  layoutModeLocked: boolean;
  activeLayerId: string;
  layers: WorkspaceLayer[];
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  selected: FeedSession | null;
  selectedId: string | null;
  maximizedId: string | null;
  pendingTemplateSlotId: string | null;
  visibleFixedCells: number;
  globalSeconds: number;
  freeDrag: FreeDragState | null;
  freeGridRef: RefObject<HTMLDivElement | null>;
  createId: () => string;
  setFixedGrid: Dispatch<SetStateAction<FixedGrid>>;
  setLayoutMode: Dispatch<SetStateAction<LayoutMode>>;
  setSessions: Dispatch<SetStateAction<FeedSession[]>>;
  setTemplateSlots: Dispatch<SetStateAction<WorkspaceTemplateSlot[]>>;
  setGalleryIndexes: Dispatch<SetStateAction<Record<string, number>>>;
  setVideoPositions: Dispatch<SetStateAction<Record<string, number>>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setMaximizedId: Dispatch<SetStateAction<string | null>>;
  setPendingFixedSlot: Dispatch<SetStateAction<number | null>>;
  setPendingTemplateSlotId: Dispatch<SetStateAction<string | null>>;
  setFreeDrag: Dispatch<SetStateAction<FreeDragState | null>>;
  setGlobalSeconds: Dispatch<SetStateAction<number>>;
  setLayers: Dispatch<SetStateAction<WorkspaceLayer[]>>;
  setActiveLayerId: Dispatch<SetStateAction<string>>;
  setIsClearOpen: Dispatch<SetStateAction<boolean>>;
  setAccount: Dispatch<SetStateAction<AccountState>>;
};

export function useLayoutHandlers({
  layoutMode,
  layoutModeLocked,
  activeLayerId,
  layers,
  sessions,
  templateSlots,
  galleryIndexes,
  videoPositions,
  selected,
  selectedId,
  maximizedId,
  pendingTemplateSlotId,
  visibleFixedCells,
  globalSeconds,
  freeDrag,
  freeGridRef,
  createId,
  setFixedGrid,
  setLayoutMode,
  setSessions,
  setTemplateSlots,
  setGalleryIndexes,
  setVideoPositions,
  setSelectedId,
  setMaximizedId,
  setPendingFixedSlot,
  setPendingTemplateSlotId,
  setFreeDrag,
  setGlobalSeconds,
  setLayers,
  setActiveLayerId,
  setIsClearOpen,
  setAccount,
}: LayoutHandlersInput) {
  function updateFixedGrid(next: Partial<FixedGrid>) {
    try {
      setFixedGrid((current) =>
        createFixedGrid(
          next.columns ?? current.columns,
          next.rows ?? current.rows,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid grid");
    }
  }

  function changeLayoutMode(nextMode: LayoutMode) {
    if (layoutModeLocked && nextMode !== layoutMode) {
      toast.error("Clear sources and template boxes before switching layouts");
      return;
    }

    setLayoutMode(nextMode);
  }

  function removeSession(id: string) {
    const removed = sessions.find((session) => session.id === id);
    setSessions((current) => current.filter((session) => session.id !== id));
    if (removed?.templateSlotId && layoutMode === "free") {
      setTemplateSlots((current) =>
        restoreTemplateSlotForRemovedSession({
          templateSlots: current,
          removedSession: removed,
          layoutMode,
        }),
      );
    }
    setGalleryIndexes((current) => {
      const next = { ...current };
      removed?.items.forEach((item) => delete next[item.id]);
      return next;
    });
    setVideoPositions((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(`${id}:`)),
      ),
    );
    if (selectedId === id) setSelectedId(null);
    if (maximizedId === id) setMaximizedId(null);
  }

  function updateFreeRect(
    id: string,
    nextRect: Partial<FreeRect>,
    showError = true,
  ) {
    setSessions((current) => {
      try {
        return updateSessionFreeRectState({
          sessions: current,
          templateSlots,
          id,
          nextRect,
        });
      } catch (error) {
        if (showError) {
          toast.error(
            error instanceof Error ? error.message : "Invalid free layout",
          );
        }
        return current;
      }
    });
  }

  function updateTemplateSlotRect(
    id: string,
    nextRect: Partial<FreeRect>,
    showError = true,
  ) {
    setTemplateSlots((current) => {
      try {
        return updateTemplateSlotFreeRectState({
          sessions,
          templateSlots: current,
          activeLayerId,
          id,
          nextRect,
        });
      } catch (error) {
        if (showError) {
          toast.error(
            error instanceof Error ? error.message : "Invalid free layout",
          );
        }
        return current;
      }
    });
  }

  function removeTemplateSlot(id: string) {
    setTemplateSlots((current) =>
      current.filter((candidate) => candidate.id !== id),
    );
    if (pendingTemplateSlotId === id) setPendingTemplateSlotId(null);
  }

  function beginFreeDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    target: { id: string; freeRect: FreeRect },
    mode: "move" | "resize",
    targetType: FreeDragState["targetType"] = "session",
  ) {
    const bounds = freeGridRef.current?.getBoundingClientRect();
    if (!bounds) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedId(targetType === "session" ? target.id : null);
    setFreeDrag({
      id: target.id,
      targetType,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      cellWidth: bounds.width / FREE_LAYOUT_SIZE,
      cellHeight: bounds.height / FREE_LAYOUT_SIZE,
      startRect: target.freeRect,
      currentRect: target.freeRect,
    });
  }

  function commitFreeDrag(drag: FreeDragState) {
    const target = resolveFreeDragCommitTarget(drag);
    if (target.targetType === "template-slot") {
      updateTemplateSlotRect(target.id, target.rect);
    } else {
      updateFreeRect(target.id, target.rect);
    }
    setFreeDrag(null);
  }

  function updateFreeDrag(event: PointerEvent, drag: FreeDragState) {
    setFreeDrag((current) =>
      updateFreeDragCurrentRect({
        current,
        id: drag.id,
        clientX: event.clientX,
        clientY: event.clientY,
      }),
    );
  }

  function changeGallery(itemId: string, direction: 1 | -1) {
    const item = sessions
      .flatMap((session) => session.items)
      .find((candidate) => candidate.id === itemId);
    if (!item) return;

    setGalleryIndexes((state) => {
      const current = state[itemId] ?? 0;
      const next =
        (current + direction + item.media.length) % item.media.length;
      return { ...state, [itemId]: next };
    });
  }

  function setGlobalTimerSeconds(value: number) {
    const { globalSeconds: durationSeconds } = applyGlobalTimerSecondsState({
      sessions: [],
      value,
    });
    setGlobalSeconds(durationSeconds);
    setSessions(
      (current) =>
        applyGlobalTimerSecondsState({
          sessions: current,
          value: durationSeconds,
        }).sessions,
    );
  }

  function setViewTimerSeconds(id: string, value: number) {
    setSessions((current) =>
      applyViewTimerSecondsState({ sessions: current, id, value }),
    );
  }

  function setViewTimerMode(id: string, mode: TimerMode) {
    setSessions((current) =>
      applyViewTimerModeState({
        sessions: current,
        id,
        mode,
        globalSeconds,
      }),
    );
  }

  function runGlobalAction(action: GlobalTimerAction) {
    setSessions((current) =>
      applyGlobalTimerActionState({ sessions: current, action }),
    );
  }

  function cloneSelectedSource() {
    if (!selected?.items.length) return;

    setSessions((current) =>
      cloneSelectedSourceState({
        sessions: current,
        selectedId: selected.id,
        layoutMode,
        visibleFixedCells,
        createId,
      }),
    );
  }

  function fillSelectedSourceSpace() {
    if (!selected?.items.length) return;

    setSessions((current) =>
      fillSelectedSourceSpaceState({
        sessions: current,
        selectedId: selected.id,
        layoutMode,
        visibleFixedCells,
        createId,
      }),
    );
  }

  function addLayer() {
    const nextState = prepareAddLayerState({ layers, createId });
    if (!nextState) return;

    setLayers(nextState.layers);
    setActiveLayerId(nextState.activeLayerId);
    setSelectedId(nextState.selectedId);
    setMaximizedId(nextState.maximizedId);
    setPendingFixedSlot(nextState.pendingFixedSlot);
    setPendingTemplateSlotId(nextState.pendingTemplateSlotId);
  }

  function selectLayer(id: string) {
    const nextState = prepareSelectLayerState(id);

    setActiveLayerId(nextState.activeLayerId);
    setSelectedId(nextState.selectedId);
    setMaximizedId(nextState.maximizedId);
    setPendingFixedSlot(nextState.pendingFixedSlot);
    setPendingTemplateSlotId(nextState.pendingTemplateSlotId);
  }

  function deleteActiveLayer() {
    if (layers.length <= 1) return;

    const nextState = prepareDeleteActiveLayerState({
      layers,
      activeLayerId,
      sessions,
      templateSlots,
      galleryIndexes,
      videoPositions,
    });

    setLayers(nextState.nextLayers);
    setSessions(nextState.nextSessions);
    setTemplateSlots(nextState.nextTemplateSlots);
    setGalleryIndexes(nextState.nextGalleryIndexes);
    setVideoPositions(nextState.nextVideoPositions);
    setActiveLayerId(nextState.nextActiveLayerId);
    setSelectedId(nextState.nextSelectedId);
    setMaximizedId(nextState.nextMaximizedId);
    setPendingFixedSlot(nextState.nextPendingFixedSlot);
    setPendingTemplateSlotId(nextState.nextPendingTemplateSlotId);
  }

  function clearCurrentLayout() {
    setSessions([]);
    setTemplateSlots([]);
    setGalleryIndexes({});
    setVideoPositions({});
    setSelectedId(null);
    setMaximizedId(null);
    setPendingFixedSlot(null);
    setPendingTemplateSlotId(null);
    setIsClearOpen(false);
  }

  async function signOut() {
    const result = await signOutAccountAction({
      isConfigured: Boolean(getSupabaseEnv()),
      signOut: async () => createSupabaseBrowserClient().auth.signOut(),
    });

    if (result.status === "error") {
      toast.error(result.error);
      return;
    }

    setAccount(result.account);
    if (result.status === "signed-out") {
      toast.success(result.successMessage);
    }
  }

  return {
    updateFixedGrid,
    changeLayoutMode,
    removeSession,
    updateFreeRect,
    updateTemplateSlotRect,
    removeTemplateSlot,
    beginFreeDrag,
    commitFreeDrag,
    updateFreeDrag,
    changeGallery,
    setGlobalTimerSeconds,
    setViewTimerSeconds,
    setViewTimerMode,
    runGlobalAction,
    cloneSelectedSource,
    fillSelectedSourceSpace,
    addLayer,
    selectLayer,
    deleteActiveLayer,
    clearCurrentLayout,
    signOut,
    freeDrag,
  };
}
