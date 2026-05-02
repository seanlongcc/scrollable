import { Cloud, Monitor, Pencil, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  anchoredDialogClass,
  centeredDialogClass,
  dialogActionButtonClass,
  emptyStateClass,
  libraryListClass,
  libraryTabsListClass,
  libraryTabTriggerClass,
} from "./dialog-styles";
import {
  SavedLibraryBulkActions,
  SavedLibraryRow,
} from "./cloud-save-dialog-parts";
import type { SaveTarget } from "./cloud-save-state";
import { serializedMetadataBytes } from "./cloud-save-state";
import { limitLayoutName, workspaceFileCount } from "./helpers";
import {
  layoutLibraryMetadata,
  templateLibraryMetadata,
} from "./library-metadata";
import type {
  LibraryKind,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";
import {
  WorkspaceDialogContent,
  type WorkspaceStats,
} from "./workspace-dialog-content";

export type { WorkspaceStats };

export function LayoutDialog({
  open,
  onOpenChange,
  view = "library",
  workspaces,
  templates,
  localWorkspaces = workspaces ?? [],
  cloudWorkspaces = [],
  localTemplates = templates ?? [],
  cloudTemplates = [],
  storageTarget = "local",
  onStorageTargetChange = () => undefined,
  onOpenWorkspaces,
  onOpenTemplates,
  onDeleteWorkspace,
  onDeleteTemplate,
  onRenameWorkspace = async () => null,
  onRenameTemplate = async () => null,
  onUploadWorkspaceToCloud = () => undefined,
  onUploadTemplateToCloud = () => undefined,
  onShareCloudItem = () => undefined,
  onExportJson = () => undefined,
  onImportJson = () => undefined,
  onImportCurrentWorkspaceJson = () => undefined,
  workspaceTabs,
  openWorkspaceStats,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspaceTab,
  onCloseWorkspaceTab,
  onCloseWorkspaceTabs = () => undefined,
  onSaveCurrentLayout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view?: "library" | "workspace";
  workspaces?: SerializedWorkspace[];
  templates?: SerializedWorkspaceTemplate[];
  localWorkspaces?: SerializedWorkspace[];
  cloudWorkspaces?: SerializedWorkspace[];
  localTemplates?: SerializedWorkspaceTemplate[];
  cloudTemplates?: SerializedWorkspaceTemplate[];
  storageTarget?: SaveTarget;
  onStorageTargetChange?: (target: SaveTarget) => void;
  onOpenWorkspaces: (ids: string[]) => void;
  onOpenTemplates: (ids: string[]) => void;
  onDeleteWorkspace: (id: string, target?: SaveTarget) => void;
  onDeleteTemplate: (id: string, target?: SaveTarget) => void;
  onRenameWorkspace?: (
    id: string,
    name: string,
    target: SaveTarget,
  ) => Promise<string | null>;
  onRenameTemplate?: (
    id: string,
    name: string,
    target: SaveTarget,
  ) => Promise<string | null>;
  onUploadWorkspaceToCloud?: (id: string) => void;
  onUploadTemplateToCloud?: (id: string) => void;
  onShareCloudItem?: (kind: "layout" | "template", id: string) => void;
  onExportJson?: (
    kind: "layout" | "template",
    id: string,
    target: SaveTarget,
  ) => void;
  onImportJson?: (target: SaveTarget) => void;
  onImportCurrentWorkspaceJson?: () => void;
  workspaceTabs: WorkspaceTab[];
  openWorkspaceStats: Record<string, WorkspaceStats>;
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspaceTab: () => void;
  onCloseWorkspaceTab: (id: string) => void;
  onCloseWorkspaceTabs?: (ids: string[]) => void;
  onSaveCurrentLayout: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [libraryKind, setLibraryKind] = useState<LibraryKind>("layouts");
  const [searchQuery, setSearchQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<{
    kind: "layout" | "template";
    id: string;
    name: string;
    target: SaveTarget;
  } | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const activeWorkspaces =
    storageTarget === "cloud" ? cloudWorkspaces : localWorkspaces;
  const activeTemplates =
    storageTarget === "cloud" ? cloudTemplates : localTemplates;
  const sortedWorkspaces = [...activeWorkspaces].sort((first, second) =>
    second.updatedAt.localeCompare(first.updatedAt),
  );
  const sortedTemplates = [...activeTemplates].sort((first, second) =>
    second.updatedAt.localeCompare(first.updatedAt),
  );
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleWorkspaces = normalizedSearch
    ? sortedWorkspaces.filter((workspace) =>
        workspace.name.toLowerCase().includes(normalizedSearch),
      )
    : sortedWorkspaces;
  const visibleTemplates = normalizedSearch
    ? sortedTemplates.filter((template) =>
        template.name.toLowerCase().includes(normalizedSearch),
      )
    : sortedTemplates;
  const visibleIds = new Set(
    visibleWorkspaces.map((workspace) => workspace.id),
  );
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.has(id));
  const selectedCount = visibleSelectedIds.length;
  const allVisibleLayoutsSelected =
    visibleWorkspaces.length > 0 && selectedCount === visibleWorkspaces.length;
  const visibleTemplateIds = new Set(
    visibleTemplates.map((template) => template.id),
  );
  const visibleSelectedTemplateIds = selectedTemplateIds.filter((id) =>
    visibleTemplateIds.has(id),
  );
  const selectedTemplateCount = visibleSelectedTemplateIds.length;
  const allVisibleTemplatesSelected =
    visibleTemplates.length > 0 &&
    selectedTemplateCount === visibleTemplates.length;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSelectedIds([]);
      setSelectedTemplateIds([]);
      setLibraryKind("layouts");
      setSearchQuery("");
      setRenameTarget(null);
      setRenameDraft("");
      setRenameError(null);
    }
    onOpenChange(nextOpen);
  }

  function openRenameDialog({
    kind,
    id,
    name,
  }: {
    kind: "layout" | "template";
    id: string;
    name: string;
  }) {
    setRenameTarget({ kind, id, name, target: storageTarget });
    setRenameDraft(name);
    setRenameError(null);
  }

  async function submitRename() {
    if (!renameTarget) return;

    const nextName = renameDraft.trim();
    if (!nextName) {
      setRenameError(
        renameTarget.kind === "template"
          ? "Template name is required"
          : "Layout name is required",
      );
      return;
    }

    const error =
      renameTarget.kind === "template"
        ? await onRenameTemplate(renameTarget.id, nextName, renameTarget.target)
        : await onRenameWorkspace(
            renameTarget.id,
            nextName,
            renameTarget.target,
          );

    if (error) {
      setRenameError(error);
      return;
    }

    setRenameTarget(null);
    setRenameDraft("");
    setRenameError(null);
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

  function selectAllLayouts() {
    if (allVisibleLayoutsSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)));
      return;
    }

    setSelectedIds((current) => [
      ...current.filter((id) => !visibleIds.has(id)),
      ...visibleWorkspaces.map((workspace) => workspace.id),
    ]);
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

  function selectAllTemplates() {
    if (allVisibleTemplatesSelected) {
      setSelectedTemplateIds((current) =>
        current.filter((id) => !visibleTemplateIds.has(id)),
      );
      return;
    }

    setSelectedTemplateIds((current) => [
      ...current.filter((id) => !visibleTemplateIds.has(id)),
      ...visibleTemplates.map((template) => template.id),
    ]);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className={anchoredDialogClass} showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="font-semibold">
                {view === "workspace" ? "Workspace" : "Library"}
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close dialog"
                  className="size-12 min-h-12 min-w-12 md:size-8 md:min-h-0 md:min-w-0"
                >
                  <X />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription className="sr-only">
              {view === "workspace"
                ? "Manage currently open layouts."
                : "Browse saved metadata-only layouts and templates."}
            </DialogDescription>
          </DialogHeader>
          {view === "workspace" ? (
            <WorkspaceDialogContent
              workspaceTabs={workspaceTabs}
              openWorkspaceStats={openWorkspaceStats}
              activeWorkspaceId={activeWorkspaceId}
              onSelectWorkspace={onSelectWorkspace}
              onCreateWorkspaceTab={onCreateWorkspaceTab}
              onCloseWorkspaceTab={onCloseWorkspaceTab}
              onCloseWorkspaceTabs={onCloseWorkspaceTabs}
              onImportJson={onImportCurrentWorkspaceJson}
              onSaveCurrentLayout={onSaveCurrentLayout}
            />
          ) : (
            <>
              <Tabs
                value={storageTarget}
                onValueChange={(value) => {
                  setSelectedIds([]);
                  setSelectedTemplateIds([]);
                  onStorageTargetChange(value as SaveTarget);
                }}
                className="gap-2"
              >
                <TabsList className={libraryTabsListClass}>
                  <TabsTrigger value="local" className={libraryTabTriggerClass}>
                    <Monitor />
                    Local
                  </TabsTrigger>
                  <TabsTrigger value="cloud" className={libraryTabTriggerClass}>
                    <Cloud />
                    Cloud
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs
                value={libraryKind}
                onValueChange={(value) => setLibraryKind(value as LibraryKind)}
                className="gap-3"
              >
                <TabsList className={libraryTabsListClass}>
                  <TabsTrigger
                    value="layouts"
                    className={libraryTabTriggerClass}
                  >
                    Layouts
                  </TabsTrigger>
                  <TabsTrigger
                    value="templates"
                    className={libraryTabTriggerClass}
                  >
                    Templates
                  </TabsTrigger>
                </TabsList>
                <Input
                  type="search"
                  value={searchQuery}
                  aria-label="Search saved items"
                  placeholder="Search"
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <TabsContent value="layouts" className="grid gap-3">
                  <SavedLibraryBulkActions
                    kind="layouts"
                    selectedCount={selectedCount}
                    hasItems={visibleWorkspaces.length > 0}
                    allSelected={allVisibleLayoutsSelected}
                    onSelectAll={selectAllLayouts}
                    onOpenSelected={openSelectedLayouts}
                    onImportJson={() => onImportJson(storageTarget)}
                  />
                  <div
                    role="group"
                    aria-label="Saved layouts list"
                    className={libraryListClass}
                  >
                    {visibleWorkspaces.length ? (
                      visibleWorkspaces.map((workspace) => {
                        const sourceCount = workspace.sessions.length;
                        const fileCount = workspaceFileCount(workspace);

                        return (
                          <SavedLibraryRow
                            key={workspace.id}
                            id={workspace.id}
                            name={workspace.name}
                            checked={selectedIds.includes(workspace.id)}
                            target={storageTarget}
                            kind="layout"
                            metadata={layoutLibraryMetadata(
                              workspace.layoutMode,
                              sourceCount,
                              fileCount,
                            )}
                            bytes={serializedMetadataBytes(workspace)}
                            onCheckedChange={toggleSelection}
                            onOpen={(id) => onOpenWorkspaces([id])}
                            onUploadToCloud={onUploadWorkspaceToCloud}
                            onShare={onShareCloudItem}
                            onRename={(id) =>
                              openRenameDialog({
                                kind: "layout",
                                id,
                                name: workspace.name,
                              })
                            }
                            onExportJson={onExportJson}
                            onDelete={(id) =>
                              onDeleteWorkspace(id, storageTarget)
                            }
                          />
                        );
                      })
                    ) : (
                      <div className={emptyStateClass}>
                        No matching {storageTarget} layouts.
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="templates" className="grid gap-3">
                  <SavedLibraryBulkActions
                    kind="templates"
                    selectedCount={selectedTemplateCount}
                    hasItems={visibleTemplates.length > 0}
                    allSelected={allVisibleTemplatesSelected}
                    onSelectAll={selectAllTemplates}
                    onOpenSelected={openSelectedTemplates}
                    onImportJson={() => onImportJson(storageTarget)}
                  />
                  <div
                    role="group"
                    aria-label="Saved templates list"
                    className={libraryListClass}
                  >
                    {visibleTemplates.length ? (
                      visibleTemplates.map((template) => {
                        const boxCount = template.slots.length;

                        return (
                          <SavedLibraryRow
                            key={template.id}
                            id={template.id}
                            name={template.name}
                            checked={selectedTemplateIds.includes(template.id)}
                            target={storageTarget}
                            kind="template"
                            metadata={templateLibraryMetadata(boxCount)}
                            bytes={serializedMetadataBytes(template)}
                            onCheckedChange={toggleTemplateSelection}
                            onOpen={(id) => onOpenTemplates([id])}
                            onUploadToCloud={onUploadTemplateToCloud}
                            onShare={onShareCloudItem}
                            onRename={(id) =>
                              openRenameDialog({
                                kind: "template",
                                id,
                                name: template.name,
                              })
                            }
                            onExportJson={onExportJson}
                            onDelete={(id) =>
                              onDeleteTemplate(id, storageTarget)
                            }
                          />
                        );
                      })
                    ) : (
                      <div className={emptyStateClass}>
                        No matching {storageTarget} templates.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
      <RenameSavedItemDialog
        target={renameTarget}
        name={renameDraft}
        error={renameError}
        onNameChange={(value) => {
          setRenameDraft(limitLayoutName(value));
          setRenameError(null);
        }}
        onSubmit={submitRename}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setRenameTarget(null);
            setRenameDraft("");
            setRenameError(null);
          }
        }}
      />
    </>
  );
}

function RenameSavedItemDialog({
  target,
  name,
  error,
  onNameChange,
  onSubmit,
  onOpenChange,
}: {
  target: { kind: "layout" | "template" } | null;
  name: string;
  error: string | null;
  onNameChange: (name: string) => void;
  onSubmit: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const title =
    target?.kind === "template" ? "Rename template" : "Rename layout";
  const label = target?.kind === "template" ? "Template name" : "Layout name";

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          centeredDialogClass,
          "md:w-[min(92vw,24rem)] md:max-w-[24rem]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-semibold">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Rename the saved library item without changing its contents.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <Label className="grid gap-1.5 text-sm font-medium">
            {label}
            <Input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              maxLength={32}
              aria-invalid={error ? true : undefined}
            />
          </Label>
          {error ? (
            <div className="text-wrap-anywhere text-xs text-destructive">
              {error}
            </div>
          ) : null}
          <Button type="submit" className={dialogActionButtonClass}>
            <Pencil />
            <span className="min-w-0 truncate">{title}</span>
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
