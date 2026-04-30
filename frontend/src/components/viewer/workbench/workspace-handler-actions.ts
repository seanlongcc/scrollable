import type { Dispatch, SetStateAction } from "react";

import { pruneLocalFileCacheSets } from "@/lib/local-uploads/file-cache";
import { toast } from "@/lib/toast";
import type { FixedGrid } from "@/lib/viewer/layout";
import {
  serializeWorkspace,
  serializeWorkspaceTemplate,
} from "@/lib/viewer/workspaces";
import { hasDuplicateLayoutName, limitLayoutName } from "./helpers";
import {
  cloudLibraryUsage,
  layoutWithLocalSourcesAsEmptyBoxes,
  workspaceHasLocalSources,
  type CloudUsageState,
  type SaveTarget,
} from "./cloud-save-state";
import {
  downloadScrollableJson,
  localFilesOmittedDescription,
} from "./json-export-actions";
import type {
  AccountState,
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
  deleteViewerCloudItem,
  upsertViewerSessionToAccount,
  upsertViewerTemplateToAccount,
} from "./workspace-sync-actions";

type WorkspaceHandlersInput = {
  workspaceName: string;
  saveName: string;
  activeWorkspaceId: string;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
  cloudWorkspaces: Record<string, SerializedWorkspace>;
  cloudTemplates: Record<string, SerializedWorkspaceTemplate>;
  saveTarget: SaveTarget;
  libraryStorageTarget: SaveTarget;
  account: AccountState;
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
  getLocalCacheStatusMessage: () => Promise<string | null>;
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
  setCloudWorkspaces: Dispatch<
    SetStateAction<Record<string, SerializedWorkspace>>
  >;
  setCloudTemplates: Dispatch<
    SetStateAction<Record<string, SerializedWorkspaceTemplate>>
  >;
  setCloudUsage: Dispatch<SetStateAction<CloudUsageState>>;
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
  cloudWorkspaces,
  cloudTemplates,
  saveTarget,
  libraryStorageTarget,
  account,
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
  getLocalCacheStatusMessage,
  setSaveName,
  setSaveKind,
  setSaveError,
  setIsSaveOpen,
  setIsLayoutsOpen,
  setWorkspaceTabs,
  setWorkspaceStates,
  setSavedWorkspaces,
  setSavedTemplates,
  setCloudWorkspaces,
  setCloudTemplates,
  setCloudUsage,
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
    const targetWorkspaces =
      saveTarget === "cloud" ? cloudWorkspaces : savedWorkspaces;
    const validation = validateLayoutSaveName({
      name: saveName,
      activeWorkspaceId,
      workspaceTabs,
      savedWorkspaces: targetWorkspaces,
    });
    if (!validation.ok) {
      setSaveError(validation.error);
      return;
    }

    if (saveTarget === "cloud") {
      if (account.status !== "signed-in") {
        setSaveError("Sign in to save to Cloud.");
        return;
      }

      const current = currentWorkspaceState(validation.name);
      const serialized = serializeWorkspace(current);
      const hasLocalSources = workspaceHasLocalSources(serialized);
      const snapshot = layoutWithLocalSourcesAsEmptyBoxes(serialized);

      const result = await upsertViewerSessionToAccount({
        workspace: snapshot,
      });
      if (result.status === "error") {
        setSaveError(result.error);
        toast.error(result.error);
        return;
      }
      if (result.status === "skipped") {
        setSaveError("Sign in to save to Cloud.");
        return;
      }

      const nextCloudWorkspaces = {
        ...cloudWorkspaces,
        [snapshot.id]: snapshot,
      };
      setCloudWorkspaces(nextCloudWorkspaces);
      updateCloudUsage(nextCloudWorkspaces, cloudTemplates);
      if (hasLocalSources) {
        toast.warning("Saved to Cloud without local files", {
          description: localFilesOmittedDescription(),
        });
      } else {
        toast.success("Layout saved to Cloud");
      }
      setIsSaveOpen(false);
      return;
    }

    const nextTabs = renameActiveWorkspaceTab({
      workspaceTabs,
      activeWorkspaceId,
      name: validation.name,
    });
    const { nextSaved } = persistCurrentWorkspace(validation.name, nextTabs);

    const cacheStatus = await getLocalCacheStatusMessage();
    toast.success(
      ["Layout saved locally", cacheStatus].filter(Boolean).join(" · "),
    );
    void pruneLocalFileCacheSets(
      localCacheSetIdsFromWorkspacesAndSessions(nextSaved, sessions),
    );
    setIsSaveOpen(false);
  }

  async function saveTemplateAs() {
    const targetTemplates =
      saveTarget === "cloud" ? cloudTemplates : savedTemplates;
    const validation = validateTemplateSaveName({
      name: saveName,
      activeWorkspaceId,
      layoutMode,
      savedTemplates: targetTemplates,
    });
    if (!validation.ok) {
      setSaveError(validation.error);
      return;
    }

    if (saveTarget === "cloud") {
      if (account.status !== "signed-in") {
        setSaveError("Sign in to save to Cloud.");
        return;
      }

      const current = currentWorkspaceState(validation.name);
      const snapshot = serializeWorkspaceTemplate({
        ...current,
        templateSlots,
      });
      const result = await upsertViewerTemplateToAccount({
        template: snapshot,
      });
      if (result.status === "error") {
        setSaveError(result.error);
        toast.error(result.error);
        return;
      }
      if (result.status === "skipped") {
        setSaveError("Sign in to save to Cloud.");
        return;
      }

      const nextCloudTemplates = {
        ...cloudTemplates,
        [snapshot.id]: snapshot,
      };
      setCloudTemplates(nextCloudTemplates);
      updateCloudUsage(cloudWorkspaces, nextCloudTemplates);
      toast.success("Template saved to Cloud");
      setIsSaveOpen(false);
      return;
    }

    persistCurrentTemplate(validation.name);
    toast.success("Template saved locally");
    setIsSaveOpen(false);
  }

  function exportCurrentWorkspaceJson() {
    const serialized = serializeWorkspace(currentWorkspaceState());
    const hasLocalSources = workspaceHasLocalSources(serialized);
    const exportItem = layoutWithLocalSourcesAsEmptyBoxes(serialized);

    downloadScrollableJson({
      kind: "layout",
      name: exportItem.name,
      item: exportItem,
    });
    if (hasLocalSources) {
      toast.warning("Exported JSON without local files", {
        description: localFilesOmittedDescription(),
      });
      return;
    }

    toast.success("Exported layout JSON");
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
    return { snapshot, nextSaved, store };
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

  function updateCloudUsage(
    nextCloudWorkspaces: Record<string, SerializedWorkspace>,
    nextCloudTemplates: Record<string, SerializedWorkspaceTemplate>,
  ) {
    setCloudUsage((current) =>
      cloudLibraryUsage({
        workspaces: Object.values(nextCloudWorkspaces),
        templates: Object.values(nextCloudTemplates),
        quotaBytes: current.status === "ready" ? current.quotaBytes : undefined,
        isUnlimited: current.status === "ready" ? current.isUnlimited : false,
      }),
    );
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
    const sourceWorkspaces =
      libraryStorageTarget === "cloud" ? cloudWorkspaces : savedWorkspaces;
    const nextState = prepareOpenSavedWorkspaces({
      ids,
      current,
      workspaceTabs,
      workspaceStates,
      savedWorkspaces: sourceWorkspaces,
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
    const sourceTemplates =
      libraryStorageTarget === "cloud" ? cloudTemplates : savedTemplates;
    const nextState = prepareOpenSavedTemplates({
      ids,
      current,
      workspaceTabs,
      workspaceStates,
      savedWorkspaces,
      savedTemplates: sourceTemplates,
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

  async function deleteSavedWorkspace(
    id: string,
    target: SaveTarget = "local",
  ) {
    if (target === "cloud") {
      const deleted = cloudWorkspaces[id];
      const result = await deleteViewerCloudItem({ kind: "layout", id });
      if (result.status === "error") {
        toast.error(result.error);
        return;
      }

      const nextCloudWorkspaces = { ...cloudWorkspaces };
      delete nextCloudWorkspaces[id];
      setCloudWorkspaces(nextCloudWorkspaces);
      updateCloudUsage(nextCloudWorkspaces, cloudTemplates);
      if (deleted) toast.success(`Deleted ${deleted.name}`);
      return;
    }

    const { nextSaved, deleted } = deleteSavedWorkspaceRecord({
      id,
      savedWorkspaces,
    });

    writeWorkspaceStore(nextSaved, activeWorkspaceId);
    setSavedWorkspaces(nextSaved);
    writeWorkspaceSessionStore(workspaceTabs, activeWorkspaceId, nextSaved);
    void pruneLocalFileCacheSets(
      localCacheSetIdsFromWorkspacesAndSessions(nextSaved, sessions),
    );
    if (deleted) toast.success(`Deleted ${deleted.name}`);
  }

  async function deleteSavedTemplate(id: string, target: SaveTarget = "local") {
    if (target === "cloud") {
      const deleted = cloudTemplates[id];
      const result = await deleteViewerCloudItem({ kind: "template", id });
      if (result.status === "error") {
        toast.error(result.error);
        return;
      }

      const nextCloudTemplates = { ...cloudTemplates };
      delete nextCloudTemplates[id];
      setCloudTemplates(nextCloudTemplates);
      updateCloudUsage(cloudWorkspaces, nextCloudTemplates);
      if (deleted) toast.success(`Deleted ${deleted.name}`);
      return;
    }

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
    exportCurrentWorkspaceJson,
    applyWorkspaceSnapshot,
  };
}

function localCacheSetIdsFromWorkspacesAndSessions(
  savedWorkspaces: Record<string, SerializedWorkspace>,
  sessions: FeedSession[],
) {
  const ids = new Set<string>();

  for (const workspace of Object.values(savedWorkspaces)) {
    for (const session of workspace.sessions) {
      const sourceConfig = session.sourceConfig;
      if (sourceConfig.kind === "local" && sourceConfig.cacheSetId) {
        ids.add(sourceConfig.cacheSetId);
      }
    }
  }

  for (const session of sessions) {
    const sourceConfig = session.sourceConfig;
    if (sourceConfig.kind === "local" && sourceConfig.cacheSetId) {
      ids.add(sourceConfig.cacheSetId);
    }
  }

  return ids;
}
