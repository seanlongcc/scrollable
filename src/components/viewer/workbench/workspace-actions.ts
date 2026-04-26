import { createEmptyWorkspace } from "@/lib/viewer/workspaces";

import type { RuntimeWorkspace, SerializedWorkspace } from "./types";
import type { WorkspaceTab } from "./types";
import { nextLayoutName, toRuntimeWorkspace } from "./helpers";
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
