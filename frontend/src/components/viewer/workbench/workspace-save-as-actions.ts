import type {
  FeedSession,
  RuntimeWorkspace,
  SerializedWorkspace,
  WorkspaceTab,
} from "./types";

export function workspaceTabsForSavedWorkspace({
  workspaceTabs,
  activeWorkspaceId,
  id,
  name,
}: {
  workspaceTabs: WorkspaceTab[];
  activeWorkspaceId: string;
  id: string;
  name: string;
}) {
  return workspaceTabs.map((tab) =>
    tab.id === activeWorkspaceId ? { ...tab, id, name } : tab,
  );
}

export function workspaceStatesForSavedWorkspace({
  workspaceStates,
  activeWorkspaceId,
  current,
}: {
  workspaceStates: Record<string, RuntimeWorkspace>;
  activeWorkspaceId: string;
  current: RuntimeWorkspace;
}) {
  const nextStates = { ...workspaceStates };
  if (current.id !== activeWorkspaceId) delete nextStates[activeWorkspaceId];
  nextStates[current.id] = current;
  return nextStates;
}

export function localCacheSetIdsFromWorkspacesAndSessions(
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
