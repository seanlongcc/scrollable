import {
  Cloud,
  Database,
  Download,
  FolderOpen,
  LogOut,
  Monitor,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { Button } from "@/components/ui/button";
import type { LocalFileCacheStorageStatus } from "@/lib/local-uploads/file-cache";
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
import type {
  AccountState,
  LayoutMode,
  LibraryKind,
  SaveKind,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";
import { MAX_LAYOUT_NAME_LENGTH } from "./types";
import { limitLayoutName, workspaceFileCount } from "./helpers";
import type { CloudUsageState, SaveTarget } from "./cloud-save-state";
import {
  cloudCountLabel,
  cloudUsageLabel,
  serializedMetadataBytes,
} from "./cloud-save-state";
import {
  CloudUsageMeter,
  SavedLibraryRow,
  StorageBadge,
} from "./cloud-save-dialog-parts";
export { accountStateFromUser } from "./account-actions";
export { ShareLinkDialog } from "./cloud-save-dialog-parts";

type WorkspaceStats = {
  sourceCount: number;
  fileCount: number;
};

const EMPTY_WORKSPACE_STATS: WorkspaceStats = {
  sourceCount: 0,
  fileCount: 0,
};

const anchoredDialogClass =
  "top-auto bottom-0 left-0 max-h-[82dvh] w-full max-w-none translate-x-0 translate-y-0 content-start gap-3 overflow-y-auto overflow-x-hidden rounded-t-3xl border border-border/70 bg-surface text-popover-foreground shadow-[0_-22px_74px_rgba(0,0,0,0.62)] sm:max-w-none md:top-[7.25rem] md:right-auto md:bottom-auto md:left-3 md:h-auto md:max-h-[calc(100dvh-8rem)] md:w-[19rem] md:max-w-[19rem] md:translate-x-0 md:translate-y-0 md:rounded-2xl md:shadow-[0_24px_80px_rgba(0,0,0,0.72)]";

const centeredDialogClass =
  "top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 content-start overflow-y-auto rounded-t-3xl border border-border/70 bg-surface text-popover-foreground shadow-[0_-22px_74px_rgba(0,0,0,0.62)] sm:max-w-none md:top-1/2 md:bottom-auto md:left-1/2 md:h-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:shadow-[0_24px_80px_rgba(0,0,0,0.72)]";

const sectionLabelClass =
  "font-mono text-[10px] font-semibold tracking-normal text-muted-foreground uppercase";

const libraryTabsListClass =
  "grid min-h-14 w-full grid-cols-2 rounded-2xl border border-border/70 bg-background/70 p-1 md:min-h-0 md:h-9";

const libraryTabTriggerClass = "min-h-12 rounded-xl md:min-h-0";

const libraryListClass =
  "grid max-h-[min(16rem,38dvh)] content-start gap-1.5 overflow-y-auto overscroll-contain pr-1";

const emptyStateClass =
  "rounded-2xl border border-dashed border-border/70 bg-background/55 p-3 text-sm text-muted-foreground";

const metadataBlockClass =
  "rounded-2xl border border-border/70 bg-background/65 p-3 text-sm text-muted-foreground";

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
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={onSaveCurrentLayout}>
            <Save />
            Save layout
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onImportJson(storageTarget)}
          >
            <Download />
            Import JSON
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
        <Button type="button" variant="outline" onClick={onCreateWorkspaceTab}>
          <FolderOpen />
          New blank
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
                      metadata={`${workspace.layoutMode} · ${sourceCount} source${sourceCount === 1 ? "" : "s"} · ${fileCount} file${fileCount === 1 ? "" : "s"}`}
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
                      metadata={`free template · ${layerCount} layer${layerCount === 1 ? "" : "s"} · ${boxCount} box${boxCount === 1 ? "" : "es"}`}
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
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-1.5">
      <Button
        type="button"
        variant={isActive ? "default" : "outline"}
        className="h-auto min-h-12 min-w-0 justify-start rounded-2xl px-2.5 py-1.5 text-left"
        onClick={() => onSelectWorkspace(tab.id)}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{tab.name}</span>
          <span
            className={cn(
              "block truncate font-mono text-[11px] leading-4",
              isActive ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {stats.sourceCount} source{stats.sourceCount === 1 ? "" : "s"} ·{" "}
            {stats.fileCount} file{stats.fileCount === 1 ? "" : "s"}
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
        className="hidden h-12 w-10 shrink-0 rounded-2xl md:inline-flex"
      >
        <X />
      </Button>
    </div>
  );
}

export function SaveLayoutDialog({
  open,
  onOpenChange,
  name,
  layoutMode,
  saveKind,
  saveTarget = "local",
  error,
  localCacheStatus,
  account = { status: "signed-out" },
  cloudUsage = { status: "signed-out" },
  cloudBlockReason = null,
  onNameChange,
  onSaveKindChange,
  onSaveTargetChange = () => undefined,
  onSaveLayout,
  onSaveTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  layoutMode: LayoutMode;
  saveKind: SaveKind;
  saveTarget?: SaveTarget;
  error: string | null;
  localCacheStatus: LocalFileCacheStorageStatus | null;
  account?: AccountState;
  cloudUsage?: CloudUsageState;
  cloudBlockReason?: string | null;
  onNameChange: (name: string) => void;
  onSaveKindChange: (kind: SaveKind) => void;
  onSaveTargetChange?: (target: SaveTarget) => void;
  onSaveLayout: () => void;
  onSaveTemplate: () => void;
}) {
  const activeSaveKind = layoutMode === "free" ? saveKind : "layout";
  const isCloud = saveTarget === "cloud";
  const submitDisabled = isCloud && Boolean(cloudBlockReason);
  const submitLabel = isCloud
    ? "Save to Cloud"
    : activeSaveKind === "template"
      ? "Save as template"
      : "Save as layout";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          centeredDialogClass,
          "max-h-[82dvh] md:w-[min(92vw,24rem)] md:max-w-[24rem]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-semibold">Save layout as</DialogTitle>
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
              <TabsList className={libraryTabsListClass}>
                <TabsTrigger value="layout" className={libraryTabTriggerClass}>
                  Layout
                </TabsTrigger>
                <TabsTrigger
                  value="template"
                  className={libraryTabTriggerClass}
                >
                  Template
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
          <Tabs
            value={saveTarget}
            onValueChange={(value) => onSaveTargetChange(value as SaveTarget)}
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
          <Label className="grid gap-1.5 text-sm font-medium">
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
          {isCloud ? (
            <div
              className={cn(
                "rounded-2xl border border-border/70 bg-background/65 p-3 text-sm",
                cloudBlockReason
                  ? "border-destructive/45 bg-destructive/10 text-destructive"
                  : "text-muted-foreground",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={sectionLabelClass}>Cloud metadata</span>
                <StorageBadge target="cloud" />
              </div>
              <div className="mt-1 font-mono text-[11px]">
                {cloudBlockReason ?? cloudUsageLabel(cloudUsage)}
              </div>
              {account.status === "signed-in" &&
              cloudUsage.status === "ready" &&
              !cloudBlockReason ? (
                <CloudUsageMeter usage={cloudUsage} className="mt-2" />
              ) : null}
            </div>
          ) : localCacheStatus ? (
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3 font-mono text-[11px] text-muted-foreground">
              <div>{localCacheStatus.label}</div>
              {localCacheStatus.freeLabel ? (
                <div>{localCacheStatus.freeLabel}</div>
              ) : null}
            </div>
          ) : null}
          <Button type="submit" title={submitLabel} disabled={submitDisabled}>
            <Save />
            {submitLabel}
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
      <DialogContent
        className={cn(
          centeredDialogClass,
          "h-auto md:w-[min(92vw,24rem)] md:max-w-[24rem]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-semibold">Clear layout?</DialogTitle>
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

export function LargeLocalCacheDialog({
  open,
  totalBytes,
  fileCount,
  storageStatus,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  totalBytes: number;
  fileCount: number;
  storageStatus?: LocalFileCacheStorageStatus;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          centeredDialogClass,
          "md:w-[min(92vw,26rem)] md:max-w-[26rem]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-semibold">
            Copy local files to browser storage?
          </DialogTitle>
          <DialogDescription>
            This will copy about {formatLocalCacheBytes(totalBytes)} into
            browser storage for auto-restore. Continue?
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {fileCount} file{fileCount === 1 ? "" : "s"} will be cached. Firefox
          may duplicate large local uploads because persistent file handles are
          unavailable.
        </p>
        {storageStatus ? (
          <LocalCacheStatusBlock status={storageStatus} />
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            <Database />
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LocalCacheStorageFullDialog({
  open,
  status,
  onOpenChange,
  onClearCache,
}: {
  open: boolean;
  status: LocalFileCacheStorageStatus | null;
  onOpenChange: (open: boolean) => void;
  onClearCache: () => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          centeredDialogClass,
          "md:w-[min(92vw,26rem)] md:max-w-[26rem]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-semibold">
            Local file cache full
          </DialogTitle>
          <DialogDescription>
            Browser storage is full, so these files will need manual reload
            after refresh.
          </DialogDescription>
        </DialogHeader>
        {status ? <LocalCacheStatusBlock status={status} /> : null}
        <div className="grid gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={onClearCache}
          >
            <Trash2 />
            Clear local media cache
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
  localCacheStatus,
  cloudUsage = { status: "signed-out" },
  onRefreshLocalCacheStatus,
  onClearLocalCache,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountState;
  localCacheStatus: LocalFileCacheStorageStatus | null;
  cloudUsage?: CloudUsageState;
  onRefreshLocalCacheStatus: () => void | Promise<void>;
  onClearLocalCache: () => void | Promise<void>;
  onSignOut: () => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={anchoredDialogClass} showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="font-semibold">Account</DialogTitle>
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
            View account status and sign-in actions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5 rounded-2xl border border-border/70 bg-background/65 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className={sectionLabelClass}>Local media cache</p>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Refresh local cache status"
                aria-label="Refresh local cache status"
                onClick={() => void onRefreshLocalCacheStatus()}
                className="size-11 min-h-11 min-w-11 text-muted-foreground md:size-8 md:min-h-0 md:min-w-0"
              >
                <RefreshCw />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Clear local media cache"
                aria-label="Clear local media cache"
                onClick={() => void onClearLocalCache()}
                className="size-11 min-h-11 min-w-11 text-destructive hover:bg-destructive/15 hover:text-destructive md:size-8 md:min-h-0 md:min-w-0"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
          {localCacheStatus ? (
            <LocalCacheStatusLine status={localCacheStatus} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Local cache usage unavailable
            </p>
          )}
        </div>
        <div className="grid gap-2 rounded-2xl border border-border/70 bg-background/65 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className={sectionLabelClass}>Cloud metadata</p>
            <StorageBadge target="cloud" />
          </div>
          <p className="font-mono text-[11px] leading-4 text-muted-foreground">
            {cloudUsageLabel(cloudUsage)}
          </p>
          <CloudUsageMeter usage={cloudUsage} />
          <p className="text-xs text-muted-foreground">
            {cloudCountLabel(cloudUsage)}
          </p>
        </div>
        {account.status === "signed-in" ? (
          <div className="grid gap-3">
            <div className={cn(metadataBlockClass, "grid gap-1")}>
              <p className={sectionLabelClass}>Signed in</p>
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

function LocalCacheStatusBlock({
  status,
}: {
  status: LocalFileCacheStorageStatus;
}) {
  return (
    <div className={metadataBlockClass}>
      <div>{status.label}</div>
      {status.freeLabel ? <div>{status.freeLabel}</div> : null}
    </div>
  );
}

function LocalCacheStatusLine({
  status,
}: {
  status: LocalFileCacheStorageStatus;
}) {
  return (
    <p className="font-mono text-[11px] leading-4 text-muted-foreground">
      <span>{status.label}</span>
      {status.freeLabel ? (
        <span className="text-muted-foreground/80"> · {status.freeLabel}</span>
      ) : null}
    </p>
  );
}

function formatLocalCacheBytes(bytes: number) {
  const gibibytes = bytes / 1024 ** 3;
  return `${gibibytes >= 10 ? gibibytes.toFixed(0) : gibibytes.toFixed(1)} GB`;
}
