import type { Dispatch, SetStateAction } from "react";
import type {
  LocalFileByteCacheConfirmation,
  LocalFileCacheStorageStatus,
} from "@/lib/local-uploads/file-cache";

import {
  AccountDialog,
  ClearLayoutDialog,
  LargeLocalCacheDialog,
  LocalCacheStorageFullDialog,
  LayoutDialog,
  SaveLayoutDialog,
  ShareLinkDialog,
} from "./dialogs";
import { EditSourceDialog } from "./source-dialogs";
import type {
  CloudShareTarget,
  CloudUsageState,
  SaveTarget,
} from "./cloud-save-state";
import type {
  AccountState,
  FeedSession,
  LayoutMode,
  LibraryOpenTarget,
  SaveKind,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";

export function WorkbenchOverlays({
  largeLocalByteCachePrompt,
  onLargeLocalByteCacheOpenChange,
  onConfirmLargeLocalByteCache,
  localCacheStorageFullStatus,
  onLocalCacheStorageFullOpenChange,
  onClearLocalCache,
  isLayoutsOpen,
  setIsLayoutsOpen,
  layoutDialogView,
  savedWorkspaces,
  cloudWorkspaces,
  savedTemplates,
  cloudTemplates,
  libraryStorageTarget,
  setLibraryStorageTarget,
  openSavedWorkspaces,
  openSavedTemplates,
  deleteSavedWorkspace,
  deleteSavedTemplate,
  renameSavedWorkspace,
  renameSavedTemplate,
  uploadWorkspaceToCloud,
  uploadTemplateToCloud,
  shareCloudItem,
  regenerateCloudShareLink,
  disableCloudShareLink,
  exportSavedJson,
  importCurrentWorkspaceJson,
  importSavedJson,
  workspaceTabs,
  openWorkspaceStats,
  activeWorkspaceId,
  selectWorkspace,
  createWorkspaceTab,
  closeWorkspaceTab,
  closeWorkspaceTabs,
  openSaveDialog,
  isSaveOpen,
  setIsSaveOpen,
  saveName,
  layoutMode,
  saveKind,
  saveTarget,
  saveError,
  localCacheStatus,
  hasLocalSources,
  cloudUsage,
  cloudBlockReason,
  setSaveName,
  setSaveError,
  setSaveKind,
  setSaveTarget,
  saveLayoutAs,
  saveTemplateAs,
  isClearOpen,
  setIsClearOpen,
  clearCurrentLayout,
  editingSource,
  setEditingSourceId,
  saveRedditSourceEdit,
  saveUrlSourceEdit,
  saveLocalSourceEdit,
  isAccountOpen,
  setIsAccountOpen,
  account,
  cloudShareTarget,
  setCloudShareTarget,
  signOut,
  onRefreshLocalCacheStatus,
}: {
  largeLocalByteCachePrompt: LocalFileByteCacheConfirmation | null;
  onLargeLocalByteCacheOpenChange: (open: boolean) => void;
  onConfirmLargeLocalByteCache: () => void;
  localCacheStorageFullStatus: LocalFileCacheStorageStatus | null;
  onLocalCacheStorageFullOpenChange: (open: boolean) => void;
  onClearLocalCache: () => void | Promise<void>;
  isLayoutsOpen: boolean;
  setIsLayoutsOpen: Dispatch<SetStateAction<boolean>>;
  layoutDialogView: "library" | "workspace";
  savedWorkspaces: Record<string, SerializedWorkspace>;
  cloudWorkspaces: Record<string, SerializedWorkspace>;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
  cloudTemplates: Record<string, SerializedWorkspaceTemplate>;
  libraryStorageTarget: SaveTarget;
  setLibraryStorageTarget: Dispatch<SetStateAction<SaveTarget>>;
  openSavedWorkspaces: (ids: string[], target: LibraryOpenTarget) => void;
  openSavedTemplates: (ids: string[], target: LibraryOpenTarget) => void;
  deleteSavedWorkspace: (id: string, target?: SaveTarget) => void;
  deleteSavedTemplate: (id: string, target?: SaveTarget) => void;
  renameSavedWorkspace: (input: {
    id: string;
    name: string;
    target?: SaveTarget;
  }) => Promise<string | null>;
  renameSavedTemplate: (input: {
    id: string;
    name: string;
    target?: SaveTarget;
  }) => Promise<string | null>;
  uploadWorkspaceToCloud: (id: string) => void;
  uploadTemplateToCloud: (id: string) => void;
  shareCloudItem: (target: CloudShareTarget) => void;
  regenerateCloudShareLink: (target: CloudShareTarget) => void;
  disableCloudShareLink: (target: CloudShareTarget) => void;
  exportSavedJson: (
    kind: "layout" | "template",
    id: string,
    target: SaveTarget,
  ) => void;
  importCurrentWorkspaceJson: () => void;
  importSavedJson: (target: SaveTarget) => void;
  workspaceTabs: WorkspaceTab[];
  openWorkspaceStats: Record<
    string,
    { sourceCount: number; fileCount: number }
  >;
  activeWorkspaceId: string;
  selectWorkspace: (id: string) => void;
  createWorkspaceTab: () => void;
  closeWorkspaceTab: (id: string) => void;
  closeWorkspaceTabs: (ids: string[]) => void;
  openSaveDialog: () => void;
  isSaveOpen: boolean;
  setIsSaveOpen: Dispatch<SetStateAction<boolean>>;
  saveName: string;
  layoutMode: LayoutMode;
  saveKind: SaveKind;
  saveTarget: SaveTarget;
  saveError: string | null;
  localCacheStatus: LocalFileCacheStorageStatus | null;
  hasLocalSources: boolean;
  cloudUsage: CloudUsageState;
  cloudBlockReason: string | null;
  setSaveName: Dispatch<SetStateAction<string>>;
  setSaveError: Dispatch<SetStateAction<string | null>>;
  setSaveKind: Dispatch<SetStateAction<SaveKind>>;
  setSaveTarget: Dispatch<SetStateAction<SaveTarget>>;
  saveLayoutAs: () => void;
  saveTemplateAs: () => void;
  isClearOpen: boolean;
  setIsClearOpen: Dispatch<SetStateAction<boolean>>;
  clearCurrentLayout: () => void;
  editingSource: FeedSession | null;
  setEditingSourceId: Dispatch<SetStateAction<string | null>>;
  saveRedditSourceEdit: (
    id: string,
    urls: string[],
    limit: number,
    hiddenItemIds: string[],
    unhiddenItemHashes: string[],
  ) => void;
  saveUrlSourceEdit: (id: string, url: string, title?: string) => void;
  saveLocalSourceEdit: (id: string, files: File[]) => void;
  isAccountOpen: boolean;
  setIsAccountOpen: Dispatch<SetStateAction<boolean>>;
  account: AccountState;
  cloudShareTarget: CloudShareTarget | null;
  setCloudShareTarget: Dispatch<SetStateAction<CloudShareTarget | null>>;
  signOut: () => void;
  onRefreshLocalCacheStatus: () => void | Promise<void>;
}) {
  return (
    <>
      <LargeLocalCacheDialog
        open={Boolean(largeLocalByteCachePrompt)}
        totalBytes={largeLocalByteCachePrompt?.totalBytes ?? 0}
        fileCount={largeLocalByteCachePrompt?.fileCount ?? 0}
        storageStatus={largeLocalByteCachePrompt?.storageStatus}
        onOpenChange={onLargeLocalByteCacheOpenChange}
        onConfirm={onConfirmLargeLocalByteCache}
      />
      <LocalCacheStorageFullDialog
        open={Boolean(localCacheStorageFullStatus)}
        status={localCacheStorageFullStatus}
        onOpenChange={onLocalCacheStorageFullOpenChange}
        onClearCache={onClearLocalCache}
      />
      {isLayoutsOpen ? (
        <LayoutDialog
          open={isLayoutsOpen}
          onOpenChange={setIsLayoutsOpen}
          view={layoutDialogView}
          localWorkspaces={Object.values(savedWorkspaces)}
          cloudWorkspaces={Object.values(cloudWorkspaces)}
          localTemplates={Object.values(savedTemplates)}
          cloudTemplates={Object.values(cloudTemplates)}
          account={account}
          storageTarget={libraryStorageTarget}
          onStorageTargetChange={setLibraryStorageTarget}
          onOpenWorkspaces={openSavedWorkspaces}
          onOpenTemplates={openSavedTemplates}
          onDeleteWorkspace={deleteSavedWorkspace}
          onDeleteTemplate={deleteSavedTemplate}
          onRenameWorkspace={(id, name, target) =>
            renameSavedWorkspace({ id, name, target })
          }
          onRenameTemplate={(id, name, target) =>
            renameSavedTemplate({ id, name, target })
          }
          onUploadWorkspaceToCloud={uploadWorkspaceToCloud}
          onUploadTemplateToCloud={uploadTemplateToCloud}
          onShareCloudItem={(kind, id) => {
            const item =
              kind === "layout" ? cloudWorkspaces[id] : cloudTemplates[id];
            if (!item) return;
            shareCloudItem({ kind, id, name: item.name });
          }}
          onExportJson={exportSavedJson}
          onImportCurrentWorkspaceJson={importCurrentWorkspaceJson}
          onImportJson={importSavedJson}
          workspaceTabs={workspaceTabs}
          openWorkspaceStats={openWorkspaceStats}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={selectWorkspace}
          onCreateWorkspaceTab={createWorkspaceTab}
          onCloseWorkspaceTab={closeWorkspaceTab}
          onCloseWorkspaceTabs={closeWorkspaceTabs}
          onSaveCurrentLayout={openSaveDialog}
        />
      ) : null}
      <SaveLayoutDialog
        open={isSaveOpen}
        onOpenChange={setIsSaveOpen}
        name={saveName}
        layoutMode={layoutMode}
        saveKind={saveKind}
        saveTarget={saveTarget}
        error={saveError}
        localCacheStatus={localCacheStatus}
        hasLocalSources={hasLocalSources}
        account={account}
        cloudUsage={cloudUsage}
        cloudBlockReason={cloudBlockReason}
        onNameChange={(value) => {
          setSaveName(value);
          setSaveError(null);
        }}
        onSaveKindChange={(value) => {
          setSaveKind(value);
          setSaveError(null);
        }}
        onSaveTargetChange={(value) => {
          setSaveTarget(value);
          setSaveError(null);
        }}
        onSaveLayout={saveLayoutAs}
        onSaveTemplate={saveTemplateAs}
      />
      <ClearLayoutDialog
        open={isClearOpen}
        onOpenChange={setIsClearOpen}
        onConfirm={clearCurrentLayout}
      />
      {editingSource ? (
        <EditSourceDialog
          key={editingSource.id}
          source={editingSource}
          open
          onOpenChange={(open) => {
            if (!open) setEditingSourceId(null);
          }}
          onSaveReddit={saveRedditSourceEdit}
          onSaveUrl={saveUrlSourceEdit}
          onSaveLocal={saveLocalSourceEdit}
        />
      ) : null}
      <AccountDialog
        open={isAccountOpen}
        onOpenChange={setIsAccountOpen}
        account={account}
        localCacheStatus={localCacheStatus}
        cloudUsage={cloudUsage}
        onRefreshLocalCacheStatus={onRefreshLocalCacheStatus}
        onClearLocalCache={onClearLocalCache}
        onSignOut={signOut}
      />
      <ShareLinkDialog
        target={cloudShareTarget}
        onOpenChange={(open) => {
          if (!open) setCloudShareTarget(null);
        }}
        onRegenerate={regenerateCloudShareLink}
        onDisable={disableCloudShareLink}
      />
    </>
  );
}
