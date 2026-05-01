import { useMemo } from "react";

import { sessionFileCount } from "./helpers";
import type {
  FeedSession,
  RuntimeWorkspace,
  SerializedWorkspace,
  WorkspaceTab,
} from "./types";

export function useOpenWorkspaceStats({
  activeWorkspaceId,
  savedWorkspaces,
  sessions,
  workspaceStates,
  workspaceTabs,
}: {
  activeWorkspaceId: string;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  sessions: FeedSession[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  workspaceTabs: WorkspaceTab[];
}) {
  return useMemo(
    () =>
      Object.fromEntries(
        workspaceTabs.map((tab) => {
          const tabSessions =
            tab.id === activeWorkspaceId
              ? sessions
              : (workspaceStates[tab.id]?.sessions ??
                savedWorkspaces[tab.id]?.sessions ??
                []);

          return [
            tab.id,
            {
              sourceCount: tabSessions.length,
              fileCount: tabSessions.reduce(
                (count, session) => count + sessionFileCount(session),
                0,
              ),
            },
          ];
        }),
      ),
    [
      activeWorkspaceId,
      savedWorkspaces,
      sessions,
      workspaceStates,
      workspaceTabs,
    ],
  );
}
