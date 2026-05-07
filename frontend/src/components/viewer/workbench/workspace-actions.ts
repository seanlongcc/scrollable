import { createEmptyWorkspace } from "@/lib/viewer/workspaces";

import type {
  LibraryOpenTarget,
  RuntimeWorkspace,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";
import {
  nextLayoutName,
  toRuntimeWorkspace,
  toRuntimeWorkspaceWithLocalRuntime,
  uniqueWorkspaceName,
  withFirstLayerActive,
  workspaceFromTemplate,
} from "./helpers";
import {
  type WorkspaceSnapshotState,
  workspaceSnapshotToState,
} from "./workspace-state";

export type WorkspaceSnapshotApplyState = WorkspaceSnapshotState & {
  galleryIndexes: Record<string, number>;
  maximizedId: null;
  pendingTemplateSlotId: null;
  hydrateSessions: WorkspaceSnapshotState["sessions"];
};

export function prepareWorkspaceSnapshotApply(
  snapshot: SerializedWorkspace | RuntimeWorkspace,
): WorkspaceSnapshotApplyState {
  const nextState = workspaceSnapshotToState(snapshot);

  return {
    ...nextState,
    galleryIndexes: {},
    maximizedId: null,
    pendingTemplateSlotId: null,
    hydrateSessions: nextState.sessions,
  };
}

export type WorkspaceTabActionState = {
  nextTabs: WorkspaceTab[];
  nextStates: Record<string, RuntimeWorkspace>;
  activeWorkspaceId: string;
  activeSnapshot: RuntimeWorkspace;
};

export const MAX_OPEN_WORKSPACE_TABS = 20;

export function prepareCreateWorkspaceTab({
  current,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
  createId,
}: {
  current: RuntimeWorkspace;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  createId: () => string;
}): WorkspaceTabActionState | null {
  if (workspaceTabs.length >= MAX_OPEN_WORKSPACE_TABS) return null;

  const nextId = createId();
  const nextName = nextLayoutName(workspaceTabs, savedWorkspaces);
  const empty = toRuntimeWorkspace(createEmptyWorkspace(nextId, nextName));
  const nextTabs = [...workspaceTabs, { id: nextId, name: nextName }];
  const nextStates = {
    ...workspaceStates,
    [current.id]: current,
    [nextId]: empty,
  };

  return {
    nextTabs,
    nextStates,
    activeWorkspaceId: nextId,
    activeSnapshot: empty,
  };
}

export function prepareSelectWorkspaceTab({
  id,
  current,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
}: {
  id: string;
  activeWorkspaceId: string;
  current: RuntimeWorkspace;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
}): WorkspaceTabActionState {
  const snapshot =
    workspaceStates[id] ??
    toRuntimeWorkspace(
      savedWorkspaces[id] ??
        createEmptyWorkspace(
          id,
          workspaceTabs.find((tab) => tab.id === id)?.name ?? "Layout",
        ),
    );
  const nextStates = {
    ...workspaceStates,
    [current.id]: current,
    [id]: snapshot,
  };

  return {
    nextTabs: workspaceTabs,
    nextStates,
    activeWorkspaceId: id,
    activeSnapshot: snapshot,
  };
}

export function prepareWorkspaceRename({
  editingWorkspaceId,
  activeWorkspaceId,
  nextName,
  current,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
}: {
  editingWorkspaceId: string;
  activeWorkspaceId: string;
  nextName: string;
  current: RuntimeWorkspace;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
}) {
  const nextTabs = workspaceTabs.map((tab) =>
    tab.id === editingWorkspaceId ? { ...tab, name: nextName } : tab,
  );
  const renamedWorkspace =
    editingWorkspaceId === activeWorkspaceId
      ? current
      : {
          ...(workspaceStates[editingWorkspaceId] ??
            toRuntimeWorkspace(
              savedWorkspaces[editingWorkspaceId] ??
                createEmptyWorkspace(editingWorkspaceId, nextName),
            )),
          name: nextName,
        };
  const nextStates = {
    ...workspaceStates,
    [current.id]: current,
    [editingWorkspaceId]: renamedWorkspace,
  };

  return { nextTabs, nextStates };
}

export function prepareCloseWorkspaceTab({
  id,
  current,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
  createId,
}: {
  id: string;
  current: RuntimeWorkspace;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  createId: () => string;
}): WorkspaceTabActionState {
  const statesWithCurrent = { ...workspaceStates, [current.id]: current };

  if (workspaceTabs.length <= 1) {
    const nextId = createId();
    const nextTab = { id: nextId, name: "Layout 1" };
    const empty = toRuntimeWorkspace(
      createEmptyWorkspace(nextId, nextTab.name),
    );

    return {
      nextTabs: [nextTab],
      nextStates: { [nextId]: empty },
      activeWorkspaceId: nextId,
      activeSnapshot: empty,
    };
  }

  const closingIndex = workspaceTabs.findIndex((tab) => tab.id === id);
  const nextTabs = workspaceTabs.filter((tab) => tab.id !== id);
  const activeWorkspaceId =
    id === current.id
      ? (nextTabs[Math.max(0, closingIndex - 1)]?.id ?? nextTabs[0].id)
      : current.id;
  const nextStates = { ...statesWithCurrent };

  if (!savedWorkspaces[id]) {
    delete nextStates[id];
  }

  const activeSnapshot =
    nextStates[activeWorkspaceId] ??
    toRuntimeWorkspace(
      savedWorkspaces[activeWorkspaceId] ??
        createEmptyWorkspace(
          activeWorkspaceId,
          nextTabs.find((tab) => tab.id === activeWorkspaceId)?.name ??
            "Layout",
        ),
    );

  return {
    nextTabs,
    nextStates: { ...nextStates, [activeWorkspaceId]: activeSnapshot },
    activeWorkspaceId,
    activeSnapshot,
  };
}

export function prepareCloseWorkspaceTabs({
  ids,
  current,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
  createId,
}: {
  ids: string[];
  current: RuntimeWorkspace;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  createId: () => string;
}): WorkspaceTabActionState {
  const idsToClose = new Set(ids);
  const closingIndexes = workspaceTabs
    .map((tab, index) => (idsToClose.has(tab.id) ? index : -1))
    .filter((index) => index >= 0);

  if (!closingIndexes.length) {
    return {
      nextTabs: workspaceTabs,
      nextStates: { ...workspaceStates, [current.id]: current },
      activeWorkspaceId: current.id,
      activeSnapshot: current,
    };
  }

  const statesWithCurrent = { ...workspaceStates, [current.id]: current };
  const nextTabs = workspaceTabs.filter((tab) => !idsToClose.has(tab.id));

  if (!nextTabs.length) {
    const nextId = createId();
    const nextTab = { id: nextId, name: "Layout 1" };
    const empty = toRuntimeWorkspace(
      createEmptyWorkspace(nextId, nextTab.name),
    );

    return {
      nextTabs: [nextTab],
      nextStates: { [nextId]: empty },
      activeWorkspaceId: nextId,
      activeSnapshot: empty,
    };
  }

  const firstClosingIndex = Math.min(...closingIndexes);
  const activeWorkspaceId = idsToClose.has(current.id)
    ? (nextTabs[Math.max(0, firstClosingIndex - 1)]?.id ?? nextTabs[0].id)
    : current.id;
  const nextStates = { ...statesWithCurrent };

  for (const id of idsToClose) {
    if (!savedWorkspaces[id]) {
      delete nextStates[id];
    }
  }

  const activeSnapshot =
    nextStates[activeWorkspaceId] ??
    toRuntimeWorkspace(
      savedWorkspaces[activeWorkspaceId] ??
        createEmptyWorkspace(
          activeWorkspaceId,
          nextTabs.find((tab) => tab.id === activeWorkspaceId)?.name ??
            "Layout",
        ),
    );

  return {
    nextTabs,
    nextStates: { ...nextStates, [activeWorkspaceId]: activeSnapshot },
    activeWorkspaceId,
    activeSnapshot,
  };
}

export function prepareOpenSavedWorkspaces({
  ids,
  target = "new-tab",
  current,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
}: {
  ids: string[];
  target?: LibraryOpenTarget;
  current: RuntimeWorkspace;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
}): WorkspaceTabActionState | null {
  const snapshots = ids
    .map((id) => savedWorkspaces[id])
    .filter((workspace): workspace is SerializedWorkspace =>
      Boolean(workspace),
    );

  const currentAwareStates = { ...workspaceStates, [current.id]: current };

  if (target === "current-tab") {
    const [firstSnapshot, ...restSnapshots] = snapshots;
    if (!firstSnapshot) return null;

    const activeSnapshot = applyWorkspaceToCurrentLayer(current, firstSnapshot);
    const nextTabs = [...workspaceTabs];
    const nextStates = { ...currentAwareStates, [current.id]: activeSnapshot };

    for (const snapshot of restSnapshots) {
      const isAlreadyOpen = nextTabs.some((tab) => tab.id === snapshot.id);
      if (!isAlreadyOpen && nextTabs.length >= MAX_OPEN_WORKSPACE_TABS) {
        continue;
      }

      nextStates[snapshot.id] = withFirstLayerActive(
        toRuntimeWorkspaceWithLocalRuntime(
          snapshot,
          currentAwareStates[snapshot.id],
        ),
      );
      if (!isAlreadyOpen) {
        nextTabs.push({ id: snapshot.id, name: snapshot.name });
      }
    }

    return {
      nextTabs,
      nextStates,
      activeWorkspaceId: current.id,
      activeSnapshot,
    };
  }

  const nextTabs = [...workspaceTabs];
  const nextStates = { ...currentAwareStates };
  const openedSnapshots: SerializedWorkspace[] = [];

  for (const snapshot of snapshots) {
    const isAlreadyOpen = nextTabs.some((tab) => tab.id === snapshot.id);
    if (!isAlreadyOpen && nextTabs.length >= MAX_OPEN_WORKSPACE_TABS) continue;

    nextStates[snapshot.id] = withFirstLayerActive(
      toRuntimeWorkspaceWithLocalRuntime(
        snapshot,
        currentAwareStates[snapshot.id],
      ),
    );
    if (!isAlreadyOpen) {
      nextTabs.push({ id: snapshot.id, name: snapshot.name });
    }
    openedSnapshots.push(snapshot);
  }

  if (!openedSnapshots.length) return null;

  const activeWorkspaceId = openedSnapshots[0].id;
  const activeSnapshot = nextStates[activeWorkspaceId];

  return {
    nextTabs,
    nextStates,
    activeWorkspaceId,
    activeSnapshot,
  };
}

export function prepareOpenSavedTemplates({
  ids,
  target = "new-tab",
  current,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
  savedTemplates,
  createId,
}: {
  ids: string[];
  target?: LibraryOpenTarget;
  current: RuntimeWorkspace;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
  createId: () => string;
}): WorkspaceTabActionState | null {
  const templates = ids
    .map((id) => savedTemplates[id])
    .filter((template): template is SerializedWorkspaceTemplate =>
      Boolean(template),
    );

  const currentAwareStates = { ...workspaceStates, [current.id]: current };
  const nextTabs = [...workspaceTabs];
  let nextStates = { ...currentAwareStates };
  let activeWorkspaceId = current.id;
  let openedCount = 0;
  const templatesForNewTabs =
    target === "current-tab" ? templates.slice(1) : templates;

  if (target === "current-tab") {
    const template = templates[0];
    if (!template) return null;

    const activeSnapshot = applyTemplateToCurrentLayer(current, template);
    nextStates = { ...nextStates, [current.id]: activeSnapshot };
    openedCount = 1;
  }

  for (const template of templatesForNewTabs) {
    if (nextTabs.length >= MAX_OPEN_WORKSPACE_TABS) break;

    const nextId = createId();
    const name = uniqueWorkspaceName(template.name, nextTabs, savedWorkspaces);
    const workspace = workspaceFromTemplate(template, nextId, name);

    nextTabs.push({ id: nextId, name });
    nextStates[nextId] = workspace;
    activeWorkspaceId = nextId;
    openedCount += 1;
  }

  if (!openedCount) return null;

  const activeSnapshot = nextStates[activeWorkspaceId];

  return {
    nextTabs,
    nextStates,
    activeWorkspaceId,
    activeSnapshot,
  };
}

function applyWorkspaceToCurrentLayer(
  current: RuntimeWorkspace,
  snapshot: SerializedWorkspace,
): RuntimeWorkspace {
  const source = toRuntimeWorkspace(snapshot);
  const targetLayerId = current.activeLayerId;

  return {
    ...current,
    layoutMode: source.layoutMode,
    fixedGrid: source.fixedGrid,
    globalTimerSeconds: source.globalTimerSeconds,
    sessions: [
      ...current.sessions.filter(
        (session) => (session.layerId ?? targetLayerId) !== targetLayerId,
      ),
      ...source.sessions.map((session) => ({
        ...session,
        id: scopedImportedId(
          current.id,
          targetLayerId,
          snapshot.id,
          session.id,
        ),
        layerId: targetLayerId,
        templateSlotId: session.templateSlotId
          ? scopedImportedId(
              current.id,
              targetLayerId,
              snapshot.id,
              session.templateSlotId,
            )
          : undefined,
        runtimeItems: undefined,
        allRuntimeItems: undefined,
        urlResolution: undefined,
        localFiles: undefined,
      })),
    ],
    templateSlots: [
      ...current.templateSlots.filter(
        (slot) => (slot.layerId ?? targetLayerId) !== targetLayerId,
      ),
      ...source.templateSlots.map((slot) => ({
        id: scopedImportedId(current.id, targetLayerId, snapshot.id, slot.id),
        layerId: targetLayerId,
        freeRect: slot.freeRect,
      })),
    ],
    updatedAt: new Date().toISOString(),
  };
}

function applyTemplateToCurrentLayer(
  current: RuntimeWorkspace,
  template: SerializedWorkspaceTemplate,
): RuntimeWorkspace {
  const targetLayerId = current.activeLayerId;

  return {
    ...current,
    layoutMode: "free",
    globalTimerSeconds: template.globalTimerSeconds,
    sessions: current.sessions.filter(
      (session) => (session.layerId ?? targetLayerId) !== targetLayerId,
    ),
    templateSlots: [
      ...current.templateSlots.filter(
        (slot) => (slot.layerId ?? targetLayerId) !== targetLayerId,
      ),
      ...template.slots.map((slot) => ({
        id: scopedImportedId(current.id, targetLayerId, template.id, slot.id),
        layerId: targetLayerId,
        freeRect: slot.freeRect,
      })),
    ],
    updatedAt: new Date().toISOString(),
  };
}

function scopedImportedId(
  workspaceId: string,
  layerId: string,
  sourceId: string,
  itemId: string,
) {
  return `${workspaceId}:${layerId}:${sourceId}:${itemId}`;
}

export function deleteSavedWorkspaceRecord({
  id,
  savedWorkspaces,
}: {
  id: string;
  savedWorkspaces: Record<string, SerializedWorkspace>;
}) {
  const nextSaved = { ...savedWorkspaces };
  const deleted = nextSaved[id];

  delete nextSaved[id];

  return { nextSaved, deleted };
}

export function deleteSavedTemplateRecord({
  id,
  savedTemplates,
}: {
  id: string;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
}) {
  const nextTemplates = { ...savedTemplates };
  const deleted = nextTemplates[id];

  delete nextTemplates[id];

  return { nextTemplates, deleted };
}
