import { Cloud, FolderOpen, Monitor, Save, Upload, X } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  anchoredDialogClass,
  emptyStateClass,
  libraryCommandButtonClass,
  libraryListClass,
  libraryTabsListClass,
  libraryTabTriggerClass,
  sectionLabelClass,
} from "./dialog-styles";
import {
  SavedLibraryBulkActions,
  SavedLibraryRow,
} from "./cloud-save-dialog-parts";
import type { SaveTarget } from "./cloud-save-state";
import { serializedMetadataBytes } from "./cloud-save-state";
import { workspaceFileCount } from "./helpers";
import {
  layoutLibraryMetadata,
  sourceFileLibraryMetadata,
  templateLibraryMetadata,
} from "./library-metadata";
import type {
  LibraryKind,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";

export type WorkspaceStats = {
  sourceCount: number;
  fileCount: number;
};

const EMPTY_WORKSPACE_STATS: WorkspaceStats = {
  sourceCount: 0,
  fileCount: 0,
};

export function LayoutDialog({
  open,
  onOpenChange,
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
  onUploadWorkspaceToCloud = () => undefined,
  onUploadTemplateToCloud = () => undefined,
  onShareCloudItem = () => undefined,
  onExportJson = () => undefined,
  onImportJson = () => undefined,
  workspaceTabs,
  openWorkspaceStats,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspaceTab,
  onCloseWorkspaceTab,
  onSaveCurrentLayout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  onUploadWorkspaceToCloud?: (id: string) => void;
  onUploadTemplateToCloud?: (id: string) => void;
  onShareCloudItem?: (kind: "layout" | "template", id: string) => void;
  onExportJson?: (
    kind: "layout" | "template",
    id: string,
    target: SaveTarget,
  ) => void;
  onImportJson?: (target: SaveTarget) => void;
  workspaceTabs: WorkspaceTab[];
  openWorkspaceStats: Record<string, WorkspaceStats>;
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspaceTab: () => void;
  onCloseWorkspaceTab: (id: string) => void;
  onSaveCurrentLayout: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [libraryKind, setLibraryKind] = useState<LibraryKind>("layouts");
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
  const visibleIds = new Set(activeWorkspaces.map((workspace) => workspace.id));
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.has(id));
  const selectedCount = visibleSelectedIds.length;
  const visibleTemplateIds = new Set(
    activeTemplates.map((template) => template.id),
  );
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

  function selectAllLayouts() {
    setSelectedIds((current) => [
      ...current.filter((id) => !visibleIds.has(id)),
      ...sortedWorkspaces.map((workspace) => workspace.id),
    ]);
  }

  function deleteSelectedLayouts() {
    for (const id of visibleSelectedIds) {
      onDeleteWorkspace(id, storageTarget);
    }
    setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)));
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
    setSelectedTemplateIds((current) => [
      ...current.filter((id) => !visibleTemplateIds.has(id)),
      ...sortedTemplates.map((template) => template.id),
    ]);
  }

  function deleteSelectedTemplates() {
    for (const id of visibleSelectedTemplateIds) {
      onDeleteTemplate(id, storageTarget);
    }
    setSelectedTemplateIds((current) =>
      current.filter((id) => !visibleTemplateIds.has(id)),
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={anchoredDialogClass} showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="font-semibold">Library</DialogTitle>
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
            Browse saved metadata-only layouts and templates.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(9.75rem,1fr))] gap-2">
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
            onClick={() => onImportJson(storageTarget)}
            className={libraryCommandButtonClass}
          >
            <Upload />
            <span className="min-w-0 truncate">Import JSON</span>
          </Button>
        </div>
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
        <Button
          type="button"
          variant="outline"
          onClick={onCreateWorkspaceTab}
          className={libraryCommandButtonClass}
        >
          <FolderOpen />
          <span className="min-w-0 truncate">New blank</span>
        </Button>
        <section className="grid gap-2">
          <h2 className={sectionLabelClass}>Open layouts</h2>
          <div className="grid gap-1">
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
        <Tabs
          value={libraryKind}
          onValueChange={(value) => setLibraryKind(value as LibraryKind)}
          className="gap-3"
        >
          <TabsList className={libraryTabsListClass}>
            <TabsTrigger value="layouts" className={libraryTabTriggerClass}>
              Layouts
            </TabsTrigger>
            <TabsTrigger value="templates" className={libraryTabTriggerClass}>
              Templates
            </TabsTrigger>
          </TabsList>
          <TabsContent value="layouts" className="grid gap-3">
            <div
              role="group"
              aria-label="Saved layouts list"
              className={libraryListClass}
            >
              {sortedWorkspaces.length ? (
                sortedWorkspaces.map((workspace) => {
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
                      onExportJson={onExportJson}
                      onDelete={(id) => onDeleteWorkspace(id, storageTarget)}
                    />
                  );
                })
              ) : (
                <div className={emptyStateClass}>
                  No {storageTarget} layouts yet. Use Save layout first.
                </div>
              )}
            </div>
            {sortedWorkspaces.length ? (
              <SavedLibraryBulkActions
                kind="layouts"
                selectedCount={selectedCount}
                hasItems={sortedWorkspaces.length > 0}
                onSelectAll={selectAllLayouts}
                onOpenSelected={openSelectedLayouts}
                onDeleteSelected={deleteSelectedLayouts}
              />
            ) : null}
          </TabsContent>
          <TabsContent value="templates" className="grid gap-3">
            <div
              role="group"
              aria-label="Saved templates list"
              className={libraryListClass}
            >
              {sortedTemplates.length ? (
                sortedTemplates.map((template) => {
                  const layerCount = template.layers.length;
                  const boxCount = template.slots.length;

                  return (
                    <SavedLibraryRow
                      key={template.id}
                      id={template.id}
                      name={template.name}
                      checked={selectedTemplateIds.includes(template.id)}
                      target={storageTarget}
                      kind="template"
                      metadata={templateLibraryMetadata(layerCount, boxCount)}
                      bytes={serializedMetadataBytes(template)}
                      onCheckedChange={toggleTemplateSelection}
                      onOpen={(id) => onOpenTemplates([id])}
                      onUploadToCloud={onUploadTemplateToCloud}
                      onShare={onShareCloudItem}
                      onExportJson={onExportJson}
                      onDelete={(id) => onDeleteTemplate(id, storageTarget)}
                    />
                  );
                })
              ) : (
                <div className={emptyStateClass}>
                  No {storageTarget} templates yet. Save a free layout as a
                  template first.
                </div>
              )}
            </div>
            {sortedTemplates.length ? (
              <SavedLibraryBulkActions
                kind="templates"
                selectedCount={selectedTemplateCount}
                hasItems={sortedTemplates.length > 0}
                onSelectAll={selectAllTemplates}
                onOpenSelected={openSelectedTemplates}
                onDeleteSelected={deleteSelectedTemplates}
              />
            ) : null}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
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
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-1.5">
      <Button
        type="button"
        variant={isActive ? "default" : "outline"}
        className="h-auto min-h-12 min-w-0 justify-start rounded-2xl px-2.5 py-1.5 text-left"
        onClick={() => onSelectWorkspace(tab.id)}
      >
        <span className="min-w-0">
          <span
            className="text-wrap-anywhere line-clamp-2 font-medium"
            title={tab.name}
          >
            {tab.name}
          </span>
          <span
            className={cn(
              "block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] leading-4 tabular-nums",
              isActive ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
            title={metadata.title}
          >
            {metadata.visible}
          </span>
        </span>
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label={`Close ${tab.name}`}
        title={`Close ${tab.name}`}
        onClick={() => onCloseWorkspaceTab(tab.id)}
        className="h-12 w-12 shrink-0 rounded-2xl md:w-10"
      >
        <X />
      </Button>
    </div>
  );
}
