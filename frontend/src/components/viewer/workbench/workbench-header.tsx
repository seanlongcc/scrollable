import { SiteLogo } from "@/components/site-logo";
import type { WorkspaceTab } from "./types";
import { WorkspaceTabs } from "./workspace-tabs";

export function WorkbenchHeader({
  workspaceTabs,
  activeWorkspaceId,
  editingWorkspaceId,
  editingWorkspaceName,
  maxLayoutNameLength,
  onSelectWorkspace,
  onBeginWorkspaceRename,
  onEditingWorkspaceNameChange,
  onCommitWorkspaceRename,
  onCancelWorkspaceRename,
  onCloseWorkspaceTab,
  onCreateWorkspaceTab,
}: {
  workspaceTabs: WorkspaceTab[];
  activeWorkspaceId: string;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;
  maxLayoutNameLength: number;
  onSelectWorkspace: (id: string) => void;
  onBeginWorkspaceRename: (tab: WorkspaceTab) => void;
  onEditingWorkspaceNameChange: (name: string) => void;
  onCommitWorkspaceRename: () => void;
  onCancelWorkspaceRename: () => void;
  onCloseWorkspaceTab: (id: string) => void;
  onCreateWorkspaceTab: () => void;
}) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 md:px-4">
      <div className="pointer-events-auto hidden w-full grid-cols-[minmax(19rem,30vw)_minmax(0,40vw)_minmax(19rem,30vw)] items-center gap-7 md:grid">
        <SiteLogo className="h-auto shrink-0 px-0 text-4xl leading-none" />
        <WorkspaceTabs
          tabs={workspaceTabs}
          activeWorkspaceId={activeWorkspaceId}
          editingWorkspaceId={editingWorkspaceId}
          editingWorkspaceName={editingWorkspaceName}
          maxNameLength={maxLayoutNameLength}
          onSelectWorkspace={onSelectWorkspace}
          onBeginWorkspaceRename={onBeginWorkspaceRename}
          onEditingWorkspaceNameChange={onEditingWorkspaceNameChange}
          onCommitWorkspaceRename={onCommitWorkspaceRename}
          onCancelWorkspaceRename={onCancelWorkspaceRename}
          onCloseWorkspaceTab={onCloseWorkspaceTab}
          onCreateWorkspaceTab={onCreateWorkspaceTab}
        />
        <div aria-hidden="true" />
      </div>
    </header>
  );
}
