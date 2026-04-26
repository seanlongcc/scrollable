import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

import type { FixedGrid } from "@/lib/viewer/layout";
import { hasDuplicateLayoutName, limitLayoutName } from "./helpers";
import type {
  FeedSession,
  LayoutMode,
  RuntimeWorkspace,
  SaveKind,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceLayer,
  WorkspaceTab,
  WorkspaceTemplateSlot,
} from "./types";
import {
  deleteSavedTemplateRecord,
  deleteSavedWorkspaceRecord,
  prepareCloseWorkspaceTab,
  prepareCreateWorkspaceTab,
  prepareOpenSavedTemplates,
  prepareOpenSavedWorkspaces,
  prepareSelectWorkspaceTab,
  prepareWorkspaceRename,
  prepareWorkspaceSnapshotApply,
} from "./workspace-actions";
import {
  createCurrentWorkspaceState,
  persistTemplateSnapshot,
  persistWorkspaceSnapshot,
  writeWorkspaceSessionStore,
  writeWorkspaceStore,
  writeWorkspaceTemplateStore,
} from "./workspace-state";
import {
  openSaveDialogState,
  renameActiveWorkspaceTab,
  validateLayoutSaveName,
  validateTemplateSaveName,
} from "./workspace-save-state";
import {
  syncViewerSessionsToAccount,
  syncViewerTemplatesToAccount,
} from "./workspace-sync-actions";

type WorkspaceHandlersInput = {
  workspaceName: string;
  saveName: string;
  activeWorkspaceId: string;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;
  layers: WorkspaceLayer[];
  activeLayerId: string;
  layoutMode: LayoutMode;
  fixedGrid: FixedGrid;
  globalSeconds: number;
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  createId: () => string;
  hydrateRuntimeItems: (nextSessions: FeedSession[]) => void;
  setSaveName: Dispatch<SetStateAction<string>>;
  setSaveKind: Dispatch<SetStateAction<SaveKind>>;
  setSaveError: Dispatch<SetStateAction<string | null>>;
  setIsSaveOpen: Dispatch<SetStateAction<boolean>>;
  setIsLayoutsOpen: Dispatch<SetStateAction<boolean>>;
  setWorkspaceTabs: Dispatch<SetStateAction<WorkspaceTab[]>>;
  setWorkspaceStates: Dispatch<
    SetStateAction<Record<string, RuntimeWorkspace>>
  >;
  setSavedWorkspaces: Dispatch<
    SetStateAction<Record<string, SerializedWorkspace>>
  >;
  setSavedTemplates: Dispatch<
    SetStateAction<Record<string, SerializedWorkspaceTemplate>>
  >;
  setActiveWorkspaceId: Dispatch<SetStateAction<string>>;
  setEditingWorkspaceId: Dispatch<SetStateAction<string | null>>;
  setEditingWorkspaceName: Dispatch<SetStateAction<string>>;
  setLayers: Dispatch<SetStateAction<WorkspaceLayer[]>>;
  setActiveLayerId: Dispatch<SetStateAction<string>>;
  setLayoutMode: Dispatch<SetStateAction<LayoutMode>>;
  setFixedGrid: Dispatch<SetStateAction<FixedGrid>>;
  setGlobalSeconds: Dispatch<SetStateAction<number>>;
  setTemplateSlots: Dispatch<SetStateAction<WorkspaceTemplateSlot[]>>;
  setSessions: Dispatch<SetStateAction<FeedSession[]>>;
  setGalleryIndexes: Dispatch<SetStateAction<Record<string, number>>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setMaximizedId: Dispatch<SetStateAction<string | null>>;
  setPendingTemplateSlotId: Dispatch<SetStateAction<string | null>>;
};

export function useWorkspaceHandlers({
  workspaceName,
  saveName,
  activeWorkspaceId,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
  savedTemplates,
  editingWorkspaceId,
  editingWorkspaceName,
  layers,
  activeLayerId,
  layoutMode,
  fixedGrid,
  globalSeconds,
  sessions,
  templateSlots,
  createId,
  hydrateRuntimeItems,
  setSaveName,
  setSaveKind,
  setSaveError,
  setIsSaveOpen,
  setIsLayoutsOpen,
  setWorkspaceTabs,
  setWorkspaceStates,
  setSavedWorkspaces,
  setSavedTemplates,
  setActiveWorkspaceId,
  setEditingWorkspaceId,
  setEditingWorkspaceName,
  setLayers,
  setActiveLayerId,
  setLayoutMode,
  setFixedGrid,
  setGlobalSeconds,
  setTemplateSlots,
  setSessions,
  setGalleryIndexes,
  setSelectedId,
  setMaximizedId,
  setPendingTemplateSlotId,
}: WorkspaceHandlersInput) {
  function openSaveDialog() {
    const nextState = openSaveDialogState(workspaceName);
    setSaveName(nextState.saveName);
    setSaveKind(nextState.saveKind);
    setSaveError(nextState.saveError);
    setIsSaveOpen(nextState.isSaveOpen);
  }

  async function saveLayoutAs() {
    const validation = validateLayoutSaveName({
      name: saveName,
      activeWorkspaceId,
      workspaceTabs,
      savedWorkspaces,
    });
    if (!validation.ok) {
      setSaveError(validation.error);
      return;
    }

    const nextTabs = renameActiveWorkspaceTab({
      workspaceTabs,
      activeWorkspaceId,
      name: validation.name,
    });
    const { store } = persistCurrentWorkspace(validation.name, nextTabs);
    const sync = await syncViewerSessionsToAccount({
      workspaces: store.workspaces,
    });

    if (sync.status === "error") toast.error(sync.error);

    toast.success(
      sync.status === "synced"
        ? "Layout saved locally and to account"
        : "Layout saved locally",
    );
    setIsSaveOpen(false);
  }

  async function saveTemplateAs() {
    const validation = validateTemplateSaveName({
      name: saveName,
      activeWorkspaceId,
      layoutMode,
      savedTemplates,
    });
    if (!validation.ok) {
      setSaveError(validation.error);
      return;
    }

    const { store } = persistCurrentTemplate(validation.name);
    const sync = await syncViewerTemplatesToAccount({
      templates: store.templates,
    });

    if (sync.status === "error") toast.error(sync.error);

    toast.success(
      sync.status === "synced"
        ? "Template saved locally and to account"
        : "Template saved locally",
    );
    setIsSaveOpen(false);
  }

  function persistCurrentWorkspace(
    nameOverride = workspaceName,
    tabsOverride = workspaceTabs,
  ) {
    const current = currentWorkspaceState(nameOverride);
    const { snapshot, nextSaved, store } = persistWorkspaceSnapshot(
      current,
      savedWorkspaces,
    );
    const nextStates = { ...workspaceStates, [current.id]: current };
    setWorkspaceTabs(tabsOverride);
    setWorkspaceStates(nextStates);
    setSavedWorkspaces(nextSaved);
    writeWorkspaceSessionStore(tabsOverride, current.id, nextSaved);
    return { snapshot, store };
  }

  function persistCurrentTemplate(nameOverride = workspaceName) {
    const current = currentWorkspaceState(nameOverride);
    const { snapshot, nextTemplates, store } = persistTemplateSnapshot(
      current,
      savedTemplates,
      templateSlots,
    );
    const nextStates = { ...workspaceStates, [current.id]: current };
    setWorkspaceStates(nextStates);
    setSavedTemplates(nextTemplates);
    return { snapshot, store };
  }

  function currentWorkspaceState(
    nameOverride = workspaceName,
  ): RuntimeWorkspace {
    return createCurrentWorkspaceState({
      activeWorkspaceId,
      name: nameOverride,
      layers,
      activeLayerId,
      layoutMode,
      fixedGrid,
      globalSeconds,
      sessions,
      templateSlots,
    });
  }

  function createWorkspaceTab() {
    const current = currentWorkspaceState();
    const nextState = prepareCreateWorkspaceTab({
      current,
      workspaceTabs,
      workspaceStates,
      savedWorkspaces,
      createId,
    });

    setWorkspaceTabs(nextState.nextTabs);
    setWorkspaceStates(nextState.nextStates);
    setActiveWorkspaceId(nextState.activeWorkspaceId);
    applyWorkspaceSnapshot(nextState.activeSnapshot);
    writeWorkspaceStore(savedWorkspaces, nextState.activeWorkspaceId);
    writeWorkspaceSessionStore(
      nextState.nextTabs,
      nextState.activeWorkspaceId,
      savedWorkspaces,
    );
  }

  function selectWorkspace(id: string) {
    if (id === activeWorkspaceId) return;

    const current = currentWorkspaceState();
    const nextState = prepareSelectWorkspaceTab({
      id,
      activeWorkspaceId,
      current,
      workspaceTabs,
      workspaceStates,
      savedWorkspaces,
    });

    setWorkspaceStates(nextState.nextStates);
    setActiveWorkspaceId(nextState.activeWorkspaceId);
    applyWorkspaceSnapshot(nextState.activeSnapshot);
    writeWorkspaceStore(savedWorkspaces, nextState.activeWorkspaceId);
    writeWorkspaceSessionStore(
      workspaceTabs,
      nextState.activeWorkspaceId,
      savedWorkspaces,
    );
  }

  function beginWorkspaceRename(tab: WorkspaceTab) {
    setEditingWorkspaceId(tab.id);
    setEditingWorkspaceName(limitLayoutName(tab.name));
  }

  function commitWorkspaceRename() {
    if (!editingWorkspaceId) return;

    const nextName = limitLayoutName(editingWorkspaceName).trim();
    if (!nextName) {
      setEditingWorkspaceId(null);
      return;
    }

    if (
      hasDuplicateLayoutName(
        nextName,
        editingWorkspaceId,
        workspaceTabs,
        savedWorkspaces,
      )
    ) {
      toast.error("Layout names must be unique");
      setEditingWorkspaceId(null);
      return;
    }

    const current = currentWorkspaceState(
      editingWorkspaceId === activeWorkspaceId ? nextName : workspaceName,
    );
    const nextState = prepareWorkspaceRename({
      editingWorkspaceId,
      activeWorkspaceId,
      nextName,
      current,
      workspaceTabs,
      workspaceStates,
      savedWorkspaces,
    });

    setWorkspaceTabs(nextState.nextTabs);
    setWorkspaceStates(nextState.nextStates);
    setEditingWorkspaceId(null);
  }

  function closeWorkspaceTab(id: string) {
    const current = currentWorkspaceState();
    const nextState = prepareCloseWorkspaceTab({
      id,
      current,
      workspaceTabs,
      workspaceStates,
      savedWorkspaces,
      createId,
    });

    setWorkspaceTabs(nextState.nextTabs);
    setWorkspaceStates(nextState.nextStates);
    setActiveWorkspaceId(nextState.activeWorkspaceId);
    applyWorkspaceSnapshot(nextState.activeSnapshot);
    writeWorkspaceStore(savedWorkspaces, nextState.activeWorkspaceId);
    writeWorkspaceSessionStore(
      nextState.nextTabs,
      nextState.activeWorkspaceId,
      savedWorkspaces,
    );
  }

  function openSavedWorkspaces(ids: string[]) {
    const current = currentWorkspaceState();
    const nextState = prepareOpenSavedWorkspaces({
      ids,
      current,
      workspaceTabs,
      workspaceStates,
      savedWorkspaces,
    });

    if (!nextState) return;

    setWorkspaceTabs(nextState.nextTabs);
    setWorkspaceStates(nextState.nextStates);
    setActiveWorkspaceId(nextState.activeWorkspaceId);
    applyWorkspaceSnapshot(nextState.activeSnapshot);
    writeWorkspaceStore(savedWorkspaces, nextState.activeWorkspaceId);
    writeWorkspaceSessionStore(
      nextState.nextTabs,
      nextState.activeWorkspaceId,
      savedWorkspaces,
    );
    setIsLayoutsOpen(false);
  }

  function openSavedTemplates(ids: string[]) {
    const current = currentWorkspaceState();
    const nextState = prepareOpenSavedTemplates({
      ids,
      current,
      workspaceTabs,
      workspaceStates,
      savedWorkspaces,
      savedTemplates,
      createId,
    });

    if (!nextState) return;

    setWorkspaceTabs(nextState.nextTabs);
    setWorkspaceStates(nextState.nextStates);
    setActiveWorkspaceId(nextState.activeWorkspaceId);
    applyWorkspaceSnapshot(nextState.activeSnapshot);
    writeWorkspaceStore(savedWorkspaces, nextState.activeWorkspaceId);
    writeWorkspaceSessionStore(
      nextState.nextTabs,
      nextState.activeWorkspaceId,
      savedWorkspaces,
    );
    setIsLayoutsOpen(false);
  }

  function deleteSavedWorkspace(id: string) {
    const { nextSaved, deleted } = deleteSavedWorkspaceRecord({
      id,
      savedWorkspaces,
    });

    writeWorkspaceStore(nextSaved, activeWorkspaceId);
    setSavedWorkspaces(nextSaved);
    writeWorkspaceSessionStore(workspaceTabs, activeWorkspaceId, nextSaved);
    if (deleted) toast.success(`Deleted ${deleted.name}`);
  }

  function deleteSavedTemplate(id: string) {
    const { nextTemplates, deleted } = deleteSavedTemplateRecord({
      id,
      savedTemplates,
    });

    writeWorkspaceTemplateStore(nextTemplates);
    setSavedTemplates(nextTemplates);
    if (deleted) toast.success(`Deleted ${deleted.name}`);
  }

  function applyWorkspaceSnapshot(
    snapshot: SerializedWorkspace | RuntimeWorkspace,
  ) {
    const nextState = prepareWorkspaceSnapshotApply(snapshot);

    setLayers(nextState.layers);
    setActiveLayerId(nextState.activeLayerId);
    setLayoutMode(nextState.layoutMode);
    setFixedGrid(nextState.fixedGrid);
    setGlobalSeconds(nextState.globalSeconds);
    setTemplateSlots(nextState.templateSlots);
    setSessions(nextState.sessions);
    setGalleryIndexes(nextState.galleryIndexes);
    setSelectedId(nextState.selectedId);
    setMaximizedId(nextState.maximizedId);
    setPendingTemplateSlotId(nextState.pendingTemplateSlotId);
    void hydrateRuntimeItems(nextState.hydrateSessions);
  }

  return {
    openSaveDialog,
    saveLayoutAs,
    saveTemplateAs,
    createWorkspaceTab,
    selectWorkspace,
    beginWorkspaceRename,
    commitWorkspaceRename,
    closeWorkspaceTab,
    openSavedWorkspaces,
    openSavedTemplates,
    deleteSavedWorkspace,
    deleteSavedTemplate,
    applyWorkspaceSnapshot,
  };
}
