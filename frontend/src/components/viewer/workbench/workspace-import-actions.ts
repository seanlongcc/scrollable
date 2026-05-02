import type { Dispatch, SetStateAction } from "react";

import { toast } from "@/lib/toast";
import {
  layoutWithLocalSourcesAsEmptyBoxes,
  workspaceHasLocalSources,
} from "./cloud-save-state";
import { limitLayoutName } from "./helpers";
import { localFilesOmittedDescription } from "./json-export-actions";
import type {
  RuntimeWorkspace,
  SerializedWorkspace,
  WorkspaceTab,
} from "./types";
import { writeWorkspaceSessionStore } from "./workspace-state";
import { toRuntimeWorkspace } from "./workspace-transform-helpers";

type ImportCurrentWorkspaceJsonInput = {
  activeWorkspaceId: string;
  workspaceName: string;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  setWorkspaceTabs: Dispatch<SetStateAction<WorkspaceTab[]>>;
  setWorkspaceStates: Dispatch<
    SetStateAction<Record<string, RuntimeWorkspace>>
  >;
  setEditingWorkspaceId: Dispatch<SetStateAction<string | null>>;
  setEditingWorkspaceName: Dispatch<SetStateAction<string>>;
  applyWorkspaceSnapshot: (snapshot: RuntimeWorkspace) => void;
};

export function importCurrentWorkspaceJsonFile({
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
}: ImportCurrentWorkspaceJsonInput) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as {
        type?: string;
        item?: SerializedWorkspace;
      };
      if (parsed.type !== "scrollable.layout.v1" || !parsed.item) {
        toast.error("Import a layout JSON for Workspace.");
        return;
      }

      const hasLocalSources = workspaceHasLocalSources(parsed.item);
      const imported = layoutWithLocalSourcesAsEmptyBoxes(parsed.item);
      const name = limitLayoutName(
        imported.name || workspaceName || "Imported layout",
      );
      const current = toRuntimeWorkspace({
        ...imported,
        id: activeWorkspaceId,
        name,
      });
      const nextTabs = workspaceTabs.map((tab) =>
        tab.id === activeWorkspaceId ? { ...tab, name } : tab,
      );
      const nextStates = { ...workspaceStates, [activeWorkspaceId]: current };

      setWorkspaceTabs(nextTabs);
      setWorkspaceStates(nextStates);
      setEditingWorkspaceId(null);
      setEditingWorkspaceName("");
      applyWorkspaceSnapshot(current);
      writeWorkspaceSessionStore(nextTabs, activeWorkspaceId, savedWorkspaces);

      if (hasLocalSources) {
        toast.warning("Imported layout without local files", {
          description: localFilesOmittedDescription(),
        });
        return;
      }

      toast.success("Imported layout");
    } catch {
      toast.error("Could not import JSON.");
    }
  };
  input.click();
}
