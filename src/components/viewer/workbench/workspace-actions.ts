import type { RuntimeWorkspace, SerializedWorkspace } from "./types";
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
