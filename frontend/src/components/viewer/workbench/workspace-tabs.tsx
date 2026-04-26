import { Plus, X } from "lucide-react";
import type { KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkspaceTab } from "./types";

export function WorkspaceTabs({
  tabs,
  activeWorkspaceId,
  editingWorkspaceId,
  editingWorkspaceName,
  maxNameLength,
  onSelectWorkspace,
  onBeginWorkspaceRename,
  onEditingWorkspaceNameChange,
  onCommitWorkspaceRename,
  onCancelWorkspaceRename,
  onCloseWorkspaceTab,
  onCreateWorkspaceTab,
}: {
  tabs: WorkspaceTab[];
  activeWorkspaceId: string;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;
  maxNameLength: number;
  onSelectWorkspace: (id: string) => void;
  onBeginWorkspaceRename: (tab: WorkspaceTab) => void;
  onEditingWorkspaceNameChange: (name: string) => void;
  onCommitWorkspaceRename: () => void;
  onCancelWorkspaceRename: () => void;
  onCloseWorkspaceTab: (id: string) => void;
  onCreateWorkspaceTab: () => void;
}) {
  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") onCommitWorkspaceRename();
    if (event.key === "Escape") onCancelWorkspaceRename();
  }

  return (
    <div className="-mb-px mt-4 flex items-center gap-1 overflow-x-auto overflow-y-hidden pb-0">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex h-7 min-w-28 overflow-hidden rounded-t-lg border border-border/70 text-muted-foreground transition",
            tab.id === activeWorkspaceId
              ? "border-primary/50 bg-surface-elevated text-primary"
              : "bg-surface-elevated/50 hover:bg-surface-elevated",
          )}
        >
          {editingWorkspaceId === tab.id ? (
            <input
              aria-label={`Rename ${tab.name}`}
              value={editingWorkspaceName}
              autoFocus
              onChange={(event) =>
                onEditingWorkspaceNameChange(event.target.value)
              }
              maxLength={maxNameLength}
              onBlur={onCommitWorkspaceRename}
              onKeyDown={handleRenameKeyDown}
              className="h-full min-w-0 flex-1 bg-background/70 px-2 text-left text-xs text-foreground outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => onSelectWorkspace(tab.id)}
              onDoubleClick={() => onBeginWorkspaceRename(tab)}
              title={`Open ${tab.name}`}
              className="h-full min-w-0 flex-1 cursor-pointer px-3 text-left text-xs"
            >
              {tab.name}
            </button>
          )}
          <button
            type="button"
            onClick={() => onCloseWorkspaceTab(tab.id)}
            aria-label={`Close ${tab.name}`}
            title={`Close ${tab.name}`}
            className="grid h-full w-7 cursor-pointer place-items-center border-l border-border/70 text-muted-foreground transition hover:bg-surface-elevated hover:text-primary-hover"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        className="mb-1 self-start rounded-md border-border/70 bg-background/80 shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
        onClick={onCreateWorkspaceTab}
        aria-label="New layout"
      >
        <Plus />
      </Button>
    </div>
  );
}
