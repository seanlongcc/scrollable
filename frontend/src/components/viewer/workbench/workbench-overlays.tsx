import type {
  ChangeEvent,
  Dispatch,
  DragEvent as ReactDragEvent,
  SetStateAction,
} from "react";
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
import { EditSourceDialog, SourceDialog } from "./source-dialogs";
import type {
  CloudShareTarget,
  CloudUsageState,
  SaveTarget,
} from "./cloud-save-state";
import type {
  AccountState,
  FeedSession,
  LayoutMode,
  RedditInputMode,
  RedditListingSort,
  RedditTimeRange,
  SaveKind,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  SourceGroupingMode,
  WorkspaceTab,
} from "./types";

export function WorkbenchOverlays({
  isSourceOpen,
  onSourceOpenChange,
  urlValue,
  urlTitle,
  redditUrls,
  redditInputMode,
  subredditName,
  redditSort,
  redditTimeRange,
  redditLimit,
  isLoading,
  sourceGroupingMode,
  setUrlValue,
  setUrlTitle,
  setRedditUrls,
  setRedditInputMode,
  setSubredditName,
  setRedditSort,
  setRedditTimeRange,
  setRedditLimit,
  setSourceGroupingMode,
  openUrlSource,
  fetchRedditFeed,
  addLocalFiles,
  selectLocalFilesWithHandles,
  selectLocalFolderWithHandles,
  addDroppedLocalFiles,
  allowLocalFileDrop,
  largeLocalByteCachePrompt,
  onLargeLocalByteCacheOpenChange,
  onConfirmLargeLocalByteCache,
  localCacheStorageFullStatus,
  onLocalCacheStorageFullOpenChange,
  onClearLocalCache,
  isLayoutsOpen,
  setIsLayoutsOpen,
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
  uploadWorkspaceToCloud,
  uploadTemplateToCloud,
  shareCloudItem,
  regenerateCloudShareLink,
  disableCloudShareLink,
  exportSavedJson,
  importSavedJson,
  workspaceTabs,
  openWorkspaceStats,
  activeWorkspaceId,
  selectWorkspace,
  createWorkspaceTab,
  closeWorkspaceTab,
  openSaveDialog,
  isSaveOpen,
  setIsSaveOpen,
  saveName,
  layoutMode,
  saveKind,
  saveTarget,
  saveError,
  localCacheStatus,
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
  isSourceOpen: boolean;
  onSourceOpenChange: (open: boolean) => void;
  urlValue: string;
  urlTitle: string;
  redditUrls: string;
  redditInputMode: RedditInputMode;
  subredditName: string;
  redditSort: RedditListingSort;
  redditTimeRange: RedditTimeRange;
  redditLimit: number;
  isLoading: boolean;
  sourceGroupingMode: SourceGroupingMode;
  setUrlValue: Dispatch<SetStateAction<string>>;
  setUrlTitle: Dispatch<SetStateAction<string>>;
  setRedditUrls: Dispatch<SetStateAction<string>>;
  setRedditInputMode: Dispatch<SetStateAction<RedditInputMode>>;
  setSubredditName: Dispatch<SetStateAction<string>>;
  setRedditSort: Dispatch<SetStateAction<RedditListingSort>>;
  setRedditTimeRange: Dispatch<SetStateAction<RedditTimeRange>>;
  setRedditLimit: Dispatch<SetStateAction<number>>;
  setSourceGroupingMode: Dispatch<SetStateAction<SourceGroupingMode>>;
  openUrlSource: () => void;
  fetchRedditFeed: () => void;
  addLocalFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  selectLocalFilesWithHandles: () => Promise<boolean>;
  selectLocalFolderWithHandles: () => Promise<boolean>;
  addDroppedLocalFiles: (event: ReactDragEvent<HTMLElement>) => void;
  allowLocalFileDrop: (event: ReactDragEvent<HTMLElement>) => void;
  largeLocalByteCachePrompt: LocalFileByteCacheConfirmation | null;
  onLargeLocalByteCacheOpenChange: (open: boolean) => void;
  onConfirmLargeLocalByteCache: () => void;
  localCacheStorageFullStatus: LocalFileCacheStorageStatus | null;
  onLocalCacheStorageFullOpenChange: (open: boolean) => void;
  onClearLocalCache: () => void | Promise<void>;
  isLayoutsOpen: boolean;
  setIsLayoutsOpen: Dispatch<SetStateAction<boolean>>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  cloudWorkspaces: Record<string, SerializedWorkspace>;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
  cloudTemplates: Record<string, SerializedWorkspaceTemplate>;
  libraryStorageTarget: SaveTarget;
  setLibraryStorageTarget: Dispatch<SetStateAction<SaveTarget>>;
  openSavedWorkspaces: (ids: string[]) => void;
  openSavedTemplates: (ids: string[]) => void;
  deleteSavedWorkspace: (id: string, target?: SaveTarget) => void;
  deleteSavedTemplate: (id: string, target?: SaveTarget) => void;
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
  openSaveDialog: () => void;
  isSaveOpen: boolean;
  setIsSaveOpen: Dispatch<SetStateAction<boolean>>;
  saveName: string;
  layoutMode: LayoutMode;
  saveKind: SaveKind;
  saveTarget: SaveTarget;
  saveError: string | null;
  localCacheStatus: LocalFileCacheStorageStatus | null;
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
      <SourceDialog
        open={isSourceOpen}
        onOpenChange={onSourceOpenChange}
        urlValue={urlValue}
        urlTitle={urlTitle}
        redditUrls={redditUrls}
        redditInputMode={redditInputMode}
        subredditName={subredditName}
        redditSort={redditSort}
        redditTimeRange={redditTimeRange}
        redditLimit={redditLimit}
        isLoading={isLoading}
        sourceGroupingMode={sourceGroupingMode}
        setUrlValue={setUrlValue}
        setUrlTitle={setUrlTitle}
        setRedditUrls={setRedditUrls}
        setRedditInputMode={setRedditInputMode}
        setSubredditName={setSubredditName}
        setRedditSort={setRedditSort}
        setRedditTimeRange={setRedditTimeRange}
        setRedditLimit={setRedditLimit}
        setSourceGroupingMode={setSourceGroupingMode}
        openUrlSource={openUrlSource}
        fetchRedditFeed={fetchRedditFeed}
        addLocalFiles={addLocalFiles}
        selectLocalFilesWithHandles={selectLocalFilesWithHandles}
        selectLocalFolderWithHandles={selectLocalFolderWithHandles}
        addDroppedLocalFiles={addDroppedLocalFiles}
        allowLocalFileDrop={allowLocalFileDrop}
      />
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
          localWorkspaces={Object.values(savedWorkspaces)}
          cloudWorkspaces={Object.values(cloudWorkspaces)}
          localTemplates={Object.values(savedTemplates)}
          cloudTemplates={Object.values(cloudTemplates)}
          storageTarget={libraryStorageTarget}
          onStorageTargetChange={setLibraryStorageTarget}
          onOpenWorkspaces={openSavedWorkspaces}
          onOpenTemplates={openSavedTemplates}
          onDeleteWorkspace={deleteSavedWorkspace}
          onDeleteTemplate={deleteSavedTemplate}
          onUploadWorkspaceToCloud={uploadWorkspaceToCloud}
          onUploadTemplateToCloud={uploadTemplateToCloud}
          onShareCloudItem={(kind, id) => {
            const item =
              kind === "layout" ? cloudWorkspaces[id] : cloudTemplates[id];
            if (!item) return;
            shareCloudItem({ kind, id, name: item.name });
          }}
          onExportJson={exportSavedJson}
          onImportJson={importSavedJson}
          workspaceTabs={workspaceTabs}
          openWorkspaceStats={openWorkspaceStats}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={selectWorkspace}
          onCreateWorkspaceTab={createWorkspaceTab}
          onCloseWorkspaceTab={closeWorkspaceTab}
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
