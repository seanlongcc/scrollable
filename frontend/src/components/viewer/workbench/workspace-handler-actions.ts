import { pruneLocalFileCacheSets } from "@/lib/local-uploads/file-cache";
import { toast } from "@/lib/toast";
import {
  serializeWorkspace,
  serializeWorkspaceTemplate,
} from "@/lib/viewer/workspaces";
import { hasDuplicateLayoutName, limitLayoutName } from "./helpers";
import {
  cloudLibraryUsage,
  layoutWithLocalSourcesAsEmptyBoxes,
  serializedMetadataBytes,
  workspaceHasLocalSources,
  type SaveTarget,
} from "./cloud-save-state";
import type { WorkspaceHandlersInput } from "./workspace-handler-types";
import {
  downloadScrollableJson,
  localFilesOmittedDescription,
} from "./json-export-actions";
import type {
  RuntimeWorkspace,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";
import {
  deleteSavedTemplateRecord,
  deleteSavedWorkspaceRecord,
  prepareCloseWorkspaceTab,
  prepareCloseWorkspaceTabs,
  prepareCreateWorkspaceTab,
  prepareOpenSavedTemplates,
  prepareOpenSavedWorkspaces,
  prepareSelectWorkspaceTab,
  prepareWorkspaceRename,
  prepareWorkspaceSnapshotApply,
  MAX_OPEN_WORKSPACE_TABS,
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
  validateLayoutSaveName,
  validateTemplateSaveName,
} from "./workspace-save-state";
import {
  localCacheSetIdsFromWorkspacesAndSessions,
  workspaceStatesForSavedWorkspace,
  workspaceTabsForSavedWorkspace,
} from "./workspace-save-as-actions";
import {
  prepareSavedTemplateRename,
  prepareSavedWorkspaceRename,
} from "./workspace-rename-actions";
import { importCurrentWorkspaceJsonFile } from "./workspace-import-actions";
import {
  deleteViewerCloudItem,
  renameViewerCloudItem,
  upsertViewerSessionToAccount,
  upsertViewerTemplateToAccount,
} from "./workspace-sync-actions";

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

      const snapshotId = targetWorkspaces[activeWorkspaceId]
        ? createId()
        : activeWorkspaceId;
      const current = currentWorkspaceState(validation.name, snapshotId);
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
      const nextTabs = activeWorkspaceTabsForSave(snapshot.id, snapshot.name);
      setWorkspaceTabs(nextTabs);
      setWorkspaceStates(activeWorkspaceStatesForSave(current));
      setActiveWorkspaceId(snapshot.id);
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

    const snapshotId = targetWorkspaces[activeWorkspaceId]
      ? createId()
      : activeWorkspaceId;
    const nextTabs = activeWorkspaceTabsForSave(snapshotId, validation.name);
    const { nextSaved } = persistCurrentWorkspace(
      validation.name,
      nextTabs,
      snapshotId,
    );

    const cacheStatus = await getLocalCacheStatusMessage();
    toast.success(
      ["Layout saved locally", cacheStatus].filter(Boolean).join(" · "),
    );
    setActiveWorkspaceId(snapshotId);
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

      const snapshotId = targetTemplates[activeWorkspaceId]
        ? createId()
        : activeWorkspaceId;
      const current = currentWorkspaceState(workspaceName);
      const snapshot = serializeWorkspaceTemplate({
        ...current,
        id: snapshotId,
        name: validation.name,
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

    const snapshotId = targetTemplates[activeWorkspaceId]
      ? createId()
      : activeWorkspaceId;
    persistCurrentTemplate(validation.name, snapshotId);
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

  function importCurrentWorkspaceJson() {
    importCurrentWorkspaceJsonFile({
      activeWorkspaceId,
      workspaceName,
      workspaceTabs,
      workspaceStates,
      savedWorkspaces,
      setWorkspaceTabs,
      setWorkspaceStates,
      setEditingWorkspaceId,
      setEditingWorkspaceName,
      applyWorkspaceSnapshot,
    });
  }

  function persistCurrentWorkspace(
    nameOverride = workspaceName,
    tabsOverride = workspaceTabs,
    idOverride = activeWorkspaceId,
  ) {
    const current = currentWorkspaceState(nameOverride, idOverride);
    const { snapshot, nextSaved, store } = persistWorkspaceSnapshot(
      current,
      savedWorkspaces,
    );
    const nextStates = activeWorkspaceStatesForSave(current);
    setWorkspaceTabs(tabsOverride);
    setWorkspaceStates(nextStates);
    setSavedWorkspaces(nextSaved);
    writeWorkspaceSessionStore(tabsOverride, current.id, nextSaved);
    return { snapshot, nextSaved, store };
  }

  function persistCurrentTemplate(
    nameOverride = workspaceName,
    idOverride = activeWorkspaceId,
  ) {
    const current = currentWorkspaceState(workspaceName);
    const templateSource = { ...current, id: idOverride, name: nameOverride };
    const { snapshot, nextTemplates, store } = persistTemplateSnapshot(
      templateSource,
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
    idOverride = activeWorkspaceId,
  ): RuntimeWorkspace {
    return createCurrentWorkspaceState({
      activeWorkspaceId: idOverride,
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

  function activeWorkspaceTabsForSave(id: string, name: string) {
    return workspaceTabsForSavedWorkspace({
      workspaceTabs,
      activeWorkspaceId,
      id,
      name,
    });
  }

  function activeWorkspaceStatesForSave(current: RuntimeWorkspace) {
    return workspaceStatesForSavedWorkspace({
      workspaceStates,
      activeWorkspaceId,
      current,
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
    if (!nextState) {
      toast.error(`Maximum ${MAX_OPEN_WORKSPACE_TABS} open layouts`);
      return;
    }

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

  function closeWorkspaceTabs(ids: string[]) {
    const current = currentWorkspaceState();
    const nextState = prepareCloseWorkspaceTabs({
      ids,
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

    if (!nextState) {
      toast.error(`Maximum ${MAX_OPEN_WORKSPACE_TABS} open layouts`);
      return;
    }

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

    if (!nextState) {
      toast.error(`Maximum ${MAX_OPEN_WORKSPACE_TABS} open layouts`);
      return;
    }

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

  async function renameSavedWorkspace({
    id,
    name,
    target = "local",
  }: {
    id: string;
    name: string;
    target?: SaveTarget;
  }) {
    const sourceWorkspaces =
      target === "cloud" ? cloudWorkspaces : savedWorkspaces;
    const prepared = prepareSavedWorkspaceRename({
      id,
      name,
      workspaceTabs,
      workspaceStates,
      savedWorkspaces: sourceWorkspaces,
    });
    if (!prepared.ok) return prepared.error;

    const { renamed, nextTabs, nextStates } = prepared.value;

    if (target === "cloud") {
      const result = await renameViewerCloudItem({
        kind: "layout",
        id,
        name: renamed.name,
        metadataBytes: serializedMetadataBytes(renamed),
      });
      if (result.status === "error") {
        toast.error(result.error);
        return result.error;
      }

      const nextCloudWorkspaces = { ...cloudWorkspaces, [id]: renamed };
      setCloudWorkspaces(nextCloudWorkspaces);
      updateCloudUsage(nextCloudWorkspaces, cloudTemplates);
      setWorkspaceTabs(nextTabs);
      setWorkspaceStates(nextStates);
      toast.success("Layout renamed");
      return null;
    }

    const nextSaved = { ...savedWorkspaces, [id]: renamed };
    writeWorkspaceStore(nextSaved, activeWorkspaceId);
    writeWorkspaceSessionStore(nextTabs, activeWorkspaceId, nextSaved);
    setSavedWorkspaces(nextSaved);
    setWorkspaceTabs(nextTabs);
    setWorkspaceStates(nextStates);
    toast.success("Layout renamed");
    return null;
  }

  async function renameSavedTemplate({
    id,
    name,
    target = "local",
  }: {
    id: string;
    name: string;
    target?: SaveTarget;
  }) {
    const sourceTemplates =
      target === "cloud" ? cloudTemplates : savedTemplates;
    const prepared = prepareSavedTemplateRename({
      id,
      name,
      savedTemplates: sourceTemplates,
    });
    if (!prepared.ok) return prepared.error;

    const { renamed } = prepared.value;

    if (target === "cloud") {
      const result = await renameViewerCloudItem({
        kind: "template",
        id,
        name: renamed.name,
        metadataBytes: serializedMetadataBytes(renamed),
      });
      if (result.status === "error") {
        toast.error(result.error);
        return result.error;
      }

      const nextCloudTemplates = { ...cloudTemplates, [id]: renamed };
      setCloudTemplates(nextCloudTemplates);
      updateCloudUsage(cloudWorkspaces, nextCloudTemplates);
      toast.success("Template renamed");
      return null;
    }

    const nextTemplates = { ...savedTemplates, [id]: renamed };
    writeWorkspaceTemplateStore(nextTemplates);
    setSavedTemplates(nextTemplates);
    toast.success("Template renamed");
    return null;
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
    closeWorkspaceTabs,
    openSavedWorkspaces,
    openSavedTemplates,
    deleteSavedWorkspace,
    deleteSavedTemplate,
    renameSavedWorkspace,
    renameSavedTemplate,
    exportCurrentWorkspaceJson,
    importCurrentWorkspaceJson,
    applyWorkspaceSnapshot,
  };
}
