import { FilePlus, Save, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { libraryCommandButtonClass, sectionLabelClass } from "./dialog-styles";
import { sourceFileLibraryMetadata } from "./library-metadata";
import type { WorkspaceTab } from "./types";
import { MAX_OPEN_WORKSPACE_TABS } from "./workspace-actions";

export type WorkspaceStats = {
  sourceCount: number;
  fileCount: number;
};

const EMPTY_WORKSPACE_STATS: WorkspaceStats = {
  sourceCount: 0,
  fileCount: 0,
};

export function WorkspaceDialogContent({
  workspaceTabs,
  openWorkspaceStats,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspaceTab,
  onCloseWorkspaceTab,
  onCloseWorkspaceTabs,
  onImportJson,
  onSaveCurrentLayout,
}: {
  workspaceTabs: WorkspaceTab[];
  openWorkspaceStats: Record<string, WorkspaceStats>;
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspaceTab: () => void;
  onCloseWorkspaceTab: (id: string) => void;
  onCloseWorkspaceTabs: (ids: string[]) => void;
  onImportJson: () => void;
  onSaveCurrentLayout: () => void;
}) {
  const isAtTabLimit = workspaceTabs.length >= MAX_OPEN_WORKSPACE_TABS;

  function closeAllOpenLayouts() {
    onCloseWorkspaceTabs(workspaceTabs.map((tab) => tab.id));
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          onClick={onSaveCurrentLayout}
          className={libraryCommandButtonClass}
        >
          <Save />
          <span className="min-w-0 truncate">Save layout</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onImportJson}
          className={libraryCommandButtonClass}
        >
          <Upload />
          <span className="min-w-0 truncate">Import JSON</span>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="destructive"
          disabled={!workspaceTabs.length}
          onClick={closeAllOpenLayouts}
          className={libraryCommandButtonClass}
        >
          <span className="min-w-0 truncate">Close all</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isAtTabLimit}
          onClick={onCreateWorkspaceTab}
          title={
            isAtTabLimit
              ? `Maximum ${MAX_OPEN_WORKSPACE_TABS} open layouts`
              : "New blank"
          }
          className={libraryCommandButtonClass}
        >
          <FilePlus />
          <span className="min-w-0 truncate">New blank</span>
        </Button>
      </div>
      <section className="grid gap-2">
        <h2 className={sectionLabelClass}>Open layouts</h2>
        <div className="grid content-start gap-1.5">
          {workspaceTabs.map((tab) => (
            <OpenWorkspaceRow
              key={tab.id}
              tab={tab}
              stats={openWorkspaceStats[tab.id] ?? EMPTY_WORKSPACE_STATS}
              isActive={tab.id === activeWorkspaceId}
              onSelectWorkspace={onSelectWorkspace}
              onCloseWorkspaceTab={onCloseWorkspaceTab}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function OpenWorkspaceRow({
  tab,
  stats,
  isActive,
  onSelectWorkspace,
  onCloseWorkspaceTab,
}: {
  tab: WorkspaceTab;
  stats: WorkspaceStats;
  isActive: boolean;
  onSelectWorkspace: (id: string) => void;
  onCloseWorkspaceTab: (id: string) => void;
}) {
  const metadata = sourceFileLibraryMetadata(
    stats.sourceCount,
    stats.fileCount,
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "grid min-w-0 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border/70 bg-background/65 p-2 text-left",
        isActive && "border-primary/55 bg-primary-soft/30",
      )}
      onClick={(event) => {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          target.closest("[data-workspace-row-action]")
        ) {
          return;
        }
        onSelectWorkspace(tab.id);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelectWorkspace(tab.id);
      }}
    >
      <div className="min-w-0">
        <span
          className="text-wrap-anywhere line-clamp-2 font-medium"
          title={tab.name}
        >
          {tab.name}
        </span>
        <span
          className="block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] leading-4 text-muted-foreground tabular-nums"
          title={metadata.title}
        >
          {metadata.visible}
        </span>
      </div>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label={`Close ${tab.name}`}
        title={`Close ${tab.name}`}
        onClick={() => onCloseWorkspaceTab(tab.id)}
        data-workspace-row-action
        className="h-12 w-12 shrink-0 rounded-xl md:h-10 md:w-10"
      >
        <X />
      </Button>
    </div>
  );
}
