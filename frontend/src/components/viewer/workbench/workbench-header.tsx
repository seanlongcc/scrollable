import { FolderOpen, Save, Trash2, UserCircle } from "lucide-react";

import { SiteLogo } from "@/components/site-logo";
import { Button } from "@/components/ui/button";
import type { FixedGrid } from "@/lib/viewer/layout";
import type { LayoutMode, WorkspaceTab } from "./types";
import { WorkbenchToolbar, type GlobalTimerAction } from "./workbench-toolbar";
import { WorkspaceTabs } from "./workspace-tabs";

export function WorkbenchHeader({
  layoutMode,
  layoutModeLocked,
  fixedGrid,
  globalSeconds,
  hasRunningSessionTimer,
  showDuplicateButton,
  showAllInfo,
  isClearDisabled,
  accountButtonLabel,
  accountButtonTitle,
  workspaceTabs,
  activeWorkspaceId,
  editingWorkspaceId,
  editingWorkspaceName,
  maxLayoutNameLength,
  onLayoutModeChange,
  onFixedGridChange,
  onGlobalTimerSecondsChange,
  onGlobalTimerAction,
  onDuplicateSelectedSource,
  onToggleShowAllInfo,
  onHideUi,
  onAddSource,
  onOpenLayouts,
  onOpenSaveDialog,
  onOpenClearDialog,
  onOpenAccount,
  onSelectWorkspace,
  onBeginWorkspaceRename,
  onEditingWorkspaceNameChange,
  onCommitWorkspaceRename,
  onCancelWorkspaceRename,
  onCloseWorkspaceTab,
  onCreateWorkspaceTab,
}: {
  layoutMode: LayoutMode;
  layoutModeLocked: boolean;
  fixedGrid: FixedGrid;
  globalSeconds: number;
  hasRunningSessionTimer: boolean;
  showDuplicateButton: boolean;
  showAllInfo: boolean;
  isClearDisabled: boolean;
  accountButtonLabel: string;
  accountButtonTitle: string;
  workspaceTabs: WorkspaceTab[];
  activeWorkspaceId: string;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;
  maxLayoutNameLength: number;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onFixedGridChange: (patch: Partial<FixedGrid>) => void;
  onGlobalTimerSecondsChange: (seconds: number) => void;
  onGlobalTimerAction: (action: GlobalTimerAction) => void;
  onDuplicateSelectedSource: () => void;
  onToggleShowAllInfo: () => void;
  onHideUi: () => void;
  onAddSource: () => void;
  onOpenLayouts: () => void;
  onOpenSaveDialog: () => void;
  onOpenClearDialog: () => void;
  onOpenAccount: () => void;
  onSelectWorkspace: (id: string) => void;
  onBeginWorkspaceRename: (tab: WorkspaceTab) => void;
  onEditingWorkspaceNameChange: (name: string) => void;
  onCommitWorkspaceRename: () => void;
  onCancelWorkspaceRename: () => void;
  onCloseWorkspaceTab: (id: string) => void;
  onCreateWorkspaceTab: () => void;
}) {
  return (
    <header className="border-b border-border bg-surface/95 px-3 pt-2 pb-0 shadow-[0_1px_0_rgba(255,255,255,0.025)] backdrop-blur md:px-4">
      <div className="grid gap-2 min-[1360px]:grid-cols-[minmax(21rem,1fr)_auto_minmax(12rem,1fr)] min-[1360px]:items-center">
        <div className="flex min-w-0 items-center justify-center min-[1360px]:justify-start">
          <SiteLogo />
        </div>

        <WorkbenchToolbar
          layoutMode={layoutMode}
          layoutModeLocked={layoutModeLocked}
          fixedGrid={fixedGrid}
          globalSeconds={globalSeconds}
          hasRunningSessionTimer={hasRunningSessionTimer}
          showDuplicateButton={showDuplicateButton}
          showAllInfo={showAllInfo}
          onLayoutModeChange={onLayoutModeChange}
          onFixedGridChange={onFixedGridChange}
          onGlobalTimerSecondsChange={onGlobalTimerSecondsChange}
          onGlobalTimerAction={onGlobalTimerAction}
          onDuplicateSelectedSource={onDuplicateSelectedSource}
          onToggleShowAllInfo={onToggleShowAllInfo}
          onHideUi={onHideUi}
          onAddSource={onAddSource}
        />

        <div className="flex flex-wrap items-center justify-center gap-2 min-[1360px]:justify-end">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Open layouts"
            onClick={onOpenLayouts}
          >
            <FolderOpen />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onOpenSaveDialog}
            aria-label="Save layout"
          >
            <Save />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onOpenClearDialog}
            aria-label="Clear layout"
            disabled={isClearDisabled}
          >
            <Trash2 />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={accountButtonLabel}
            title={accountButtonTitle}
            onClick={onOpenAccount}
          >
            <UserCircle />
          </Button>
        </div>
      </div>

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
    </header>
  );
}
