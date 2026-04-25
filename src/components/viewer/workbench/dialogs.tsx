import { FolderOpen, LogOut, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AccountState,
  LayoutMode,
  LibraryKind,
  SaveKind,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
} from "./types";
import { MAX_LAYOUT_NAME_LENGTH } from "./types";
import {
  limitLayoutName,
  workspaceFileCount,
  workspaceLayerSummaries,
} from "./helpers";

export function accountStateFromUser(
  user: { email?: string | null } | null,
): AccountState {
  if (!user) return { status: "signed-out" };

  return {
    status: "signed-in",
    email: user.email ?? "Signed-in account",
  };
}

export function LayoutDialog({
  open,
  onOpenChange,
  workspaces,
  templates,
  onOpenWorkspaces,
  onOpenTemplates,
  onDeleteWorkspace,
  onDeleteTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: SerializedWorkspace[];
  templates: SerializedWorkspaceTemplate[];
  onOpenWorkspaces: (ids: string[]) => void;
  onOpenTemplates: (ids: string[]) => void;
  onDeleteWorkspace: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [libraryKind, setLibraryKind] = useState<LibraryKind>("layouts");
  const sortedWorkspaces = [...workspaces].sort((first, second) =>
    second.updatedAt.localeCompare(first.updatedAt),
  );
  const sortedTemplates = [...templates].sort((first, second) =>
    second.updatedAt.localeCompare(first.updatedAt),
  );
  const visibleIds = new Set(workspaces.map((workspace) => workspace.id));
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.has(id));
  const selectedCount = visibleSelectedIds.length;
  const visibleTemplateIds = new Set(templates.map((template) => template.id));
  const visibleSelectedTemplateIds = selectedTemplateIds.filter((id) =>
    visibleTemplateIds.has(id),
  );
  const selectedTemplateCount = visibleSelectedTemplateIds.length;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSelectedIds([]);
      setSelectedTemplateIds([]);
      setLibraryKind("layouts");
    }
    onOpenChange(nextOpen);
  }

  function toggleSelection(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return current.includes(id) ? current : [...current, id];
      return current.filter((currentId) => currentId !== id);
    });
  }

  function openSelectedLayouts() {
    const selected = sortedWorkspaces
      .filter((workspace) => visibleSelectedIds.includes(workspace.id))
      .map((workspace) => workspace.id);

    onOpenWorkspaces(selected);
  }

  function toggleTemplateSelection(id: string, checked: boolean) {
    setSelectedTemplateIds((current) => {
      if (checked) return current.includes(id) ? current : [...current, id];
      return current.filter((currentId) => currentId !== id);
    });
  }

  function openSelectedTemplates() {
    const selected = sortedTemplates
      .filter((template) => visibleSelectedTemplateIds.includes(template.id))
      .map((template) => template.id);

    onOpenTemplates(selected);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[min(94vw,34rem)] gap-3 overflow-y-auto overflow-x-hidden border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)]">
        <DialogHeader className="pr-8">
          <DialogTitle>Saved layouts</DialogTitle>
          <DialogDescription className="sr-only">
            Browse saved metadata-only layouts and templates.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={libraryKind}
          onValueChange={(value) => setLibraryKind(value as LibraryKind)}
          className="gap-3"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="layouts">Layouts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="layouts" className="grid gap-3">
            <div
              role="group"
              aria-label="Saved layouts list"
              className="grid h-[min(23.25rem,52dvh)] content-start gap-1.5 overflow-y-auto overscroll-contain pr-1"
            >
              {sortedWorkspaces.length ? (
                sortedWorkspaces.map((workspace) => {
                  const layerSummaries = workspaceLayerSummaries(workspace);
                  const sourceCount = workspace.sessions.length;
                  const fileCount = workspaceFileCount(workspace);

                  return (
                    <label
                      key={workspace.id}
                      className="grid h-12 min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 transition-colors hover:bg-muted/45"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(workspace.id)}
                        onChange={(event) =>
                          toggleSelection(workspace.id, event.target.checked)
                        }
                        aria-label={`Select ${workspace.name}`}
                        className="mt-0.5 size-4 accent-primary"
                      />
                      <div className="min-w-0 leading-tight">
                        <div
                          className="truncate font-medium"
                          title={workspace.name}
                        >
                          {workspace.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {workspace.layoutMode} · {layerSummaries.length} layer
                          {layerSummaries.length === 1 ? "" : "s"} ·{" "}
                          {sourceCount} source{sourceCount === 1 ? "" : "s"} ·{" "}
                          {fileCount} file{fileCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="destructive"
                        onClick={(event) => {
                          event.preventDefault();
                          onDeleteWorkspace(workspace.id);
                        }}
                        aria-label={`Delete ${workspace.name}`}
                      >
                        <Trash2 />
                      </Button>
                    </label>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No saved layouts yet. Use Save layout first.
                </div>
              )}
            </div>
            {sortedWorkspaces.length ? (
              <Button
                type="button"
                onClick={openSelectedLayouts}
                disabled={selectedCount === 0}
                className="w-full"
              >
                <FolderOpen />
                Open selected layouts
              </Button>
            ) : null}
          </TabsContent>
          <TabsContent value="templates" className="grid gap-3">
            <div
              role="group"
              aria-label="Saved templates list"
              className="grid h-[min(23.25rem,52dvh)] content-start gap-1.5 overflow-y-auto overscroll-contain pr-1"
            >
              {sortedTemplates.length ? (
                sortedTemplates.map((template) => {
                  const layerCount = template.layers.length;
                  const boxCount = template.slots.length;

                  return (
                    <label
                      key={template.id}
                      className="grid h-12 min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 transition-colors hover:bg-muted/45"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTemplateIds.includes(template.id)}
                        onChange={(event) =>
                          toggleTemplateSelection(
                            template.id,
                            event.target.checked,
                          )
                        }
                        aria-label={`Select ${template.name}`}
                        className="mt-0.5 size-4 accent-primary"
                      />
                      <div className="min-w-0 leading-tight">
                        <div
                          className="truncate font-medium"
                          title={template.name}
                        >
                          {template.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          free template · {layerCount} layer
                          {layerCount === 1 ? "" : "s"} · {boxCount} box
                          {boxCount === 1 ? "" : "es"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="destructive"
                        onClick={(event) => {
                          event.preventDefault();
                          onDeleteTemplate(template.id);
                        }}
                        aria-label={`Delete ${template.name}`}
                      >
                        <Trash2 />
                      </Button>
                    </label>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No saved templates yet. Save a free layout as a template
                  first.
                </div>
              )}
            </div>
            {sortedTemplates.length ? (
              <Button
                type="button"
                onClick={openSelectedTemplates}
                disabled={selectedTemplateCount === 0}
                className="w-full"
              >
                <FolderOpen />
                Open selected templates
              </Button>
            ) : null}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function SaveLayoutDialog({
  open,
  onOpenChange,
  name,
  layoutMode,
  saveKind,
  error,
  onNameChange,
  onSaveKindChange,
  onSaveLayout,
  onSaveTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  layoutMode: LayoutMode;
  saveKind: SaveKind;
  error: string | null;
  onNameChange: (name: string) => void;
  onSaveKindChange: (kind: SaveKind) => void;
  onSaveLayout: () => void;
  onSaveTemplate: () => void;
}) {
  const activeSaveKind = layoutMode === "free" ? saveKind : "layout";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,24rem)] border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)]">
        <DialogHeader>
          <DialogTitle>Save layout as</DialogTitle>
          <DialogDescription className="sr-only">
            Name the current layout and save its configuration metadata.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (activeSaveKind === "template") {
              onSaveTemplate();
            } else {
              onSaveLayout();
            }
          }}
        >
          {layoutMode === "free" ? (
            <Tabs
              value={activeSaveKind}
              onValueChange={(value) => onSaveKindChange(value as SaveKind)}
              className="gap-2"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="template">Template</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
          <Label className="grid gap-1 text-sm">
            {activeSaveKind === "template" ? "Template name" : "Layout name"}
            <Input
              value={name}
              onChange={(event) =>
                onNameChange(limitLayoutName(event.target.value))
              }
              maxLength={MAX_LAYOUT_NAME_LENGTH}
              aria-invalid={error ? true : undefined}
            />
          </Label>
          {error ? (
            <div className="text-xs text-destructive">{error}</div>
          ) : null}
          <Button type="submit" title="Save as layout">
            <Save />
            {activeSaveKind === "template"
              ? "Save as template"
              : "Save as layout"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClearLayoutDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,24rem)] border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)]">
        <DialogHeader>
          <DialogTitle>Clear layout?</DialogTitle>
          <DialogDescription>
            Remove all sources from the current layout.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            aria-label="Confirm clear layout"
          >
            <Trash2 />
            Clear
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AccountDialog({
  open,
  onOpenChange,
  account,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountState;
  onSignOut: () => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,24rem)] border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)]">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription className="sr-only">
            View account status and sign-in actions.
          </DialogDescription>
        </DialogHeader>
        {account.status === "signed-in" ? (
          <div className="grid gap-3">
            <div className="grid gap-1 rounded-lg border border-border bg-surface p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Signed in
              </p>
              <p className="break-all text-sm font-medium">{account.email}</p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void onSignOut()}
            >
              <LogOut />
              Log out
            </Button>
          </div>
        ) : account.status === "loading" ? (
          <p className="text-sm text-muted-foreground">Checking account...</p>
        ) : (
          <SignInPanel next="/" />
        )}
      </DialogContent>
    </Dialog>
  );
}
