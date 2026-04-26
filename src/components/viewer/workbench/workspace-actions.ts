import { createEmptyWorkspace } from "@/lib/viewer/workspaces";

import type {
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
}): WorkspaceTabActionState {
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

export function prepareOpenSavedWorkspaces({
  ids,
  current,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
}: {
  ids: string[];
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

  if (!snapshots.length) return null;

  const currentAwareStates = { ...workspaceStates, [current.id]: current };
  const nextTabs = [...workspaceTabs];
  const nextStates = { ...currentAwareStates };

  for (const snapshot of snapshots) {
    nextStates[snapshot.id] = toRuntimeWorkspaceWithLocalRuntime(
      snapshot,
      currentAwareStates[snapshot.id],
    );
    if (!nextTabs.some((tab) => tab.id === snapshot.id)) {
      nextTabs.push({ id: snapshot.id, name: snapshot.name });
    }
  }

  const activeWorkspaceId = snapshots[0].id;
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
  current,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
  savedTemplates,
  createId,
}: {
  ids: string[];
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

  if (!templates.length) return null;

  const currentAwareStates = { ...workspaceStates, [current.id]: current };
  const nextTabs = [...workspaceTabs];
  const nextStates = { ...currentAwareStates };
  let activeWorkspaceId = current.id;

  for (const template of templates) {
    const nextId = createId();
    const name = uniqueWorkspaceName(template.name, nextTabs, savedWorkspaces);
    const workspace = workspaceFromTemplate(template, nextId, name);

    nextTabs.push({ id: nextId, name });
    nextStates[nextId] = workspace;
    activeWorkspaceId = nextId;
  }

  const activeSnapshot = nextStates[activeWorkspaceId];

  return {
    nextTabs,
    nextStates,
    activeWorkspaceId,
    activeSnapshot,
  };
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
