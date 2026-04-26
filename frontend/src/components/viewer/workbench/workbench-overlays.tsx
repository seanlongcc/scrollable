import type {
  ChangeEvent,
  Dispatch,
  DragEvent as ReactDragEvent,
  SetStateAction,
} from "react";

import {
  AccountDialog,
  ClearLayoutDialog,
  LayoutDialog,
  SaveLayoutDialog,
} from "./dialogs";
import { EditSourceDialog, SourceDialog } from "./source-dialogs";
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
  isLayoutsOpen,
  setIsLayoutsOpen,
  savedWorkspaces,
  savedTemplates,
  openSavedWorkspaces,
  openSavedTemplates,
  deleteSavedWorkspace,
  deleteSavedTemplate,
  isSaveOpen,
  setIsSaveOpen,
  saveName,
  layoutMode,
  saveKind,
  saveError,
  setSaveName,
  setSaveError,
  setSaveKind,
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
  signOut,
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
  isLayoutsOpen: boolean;
  setIsLayoutsOpen: Dispatch<SetStateAction<boolean>>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
  openSavedWorkspaces: (ids: string[]) => void;
  openSavedTemplates: (ids: string[]) => void;
  deleteSavedWorkspace: (id: string) => void;
  deleteSavedTemplate: (id: string) => void;
  isSaveOpen: boolean;
  setIsSaveOpen: Dispatch<SetStateAction<boolean>>;
  saveName: string;
  layoutMode: LayoutMode;
  saveKind: SaveKind;
  saveError: string | null;
  setSaveName: Dispatch<SetStateAction<string>>;
  setSaveError: Dispatch<SetStateAction<string | null>>;
  setSaveKind: Dispatch<SetStateAction<SaveKind>>;
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
  signOut: () => void;
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
      {isLayoutsOpen ? (
        <LayoutDialog
          open={isLayoutsOpen}
          onOpenChange={setIsLayoutsOpen}
          workspaces={Object.values(savedWorkspaces)}
          templates={Object.values(savedTemplates)}
          onOpenWorkspaces={openSavedWorkspaces}
          onOpenTemplates={openSavedTemplates}
          onDeleteWorkspace={deleteSavedWorkspace}
          onDeleteTemplate={deleteSavedTemplate}
        />
      ) : null}
      <SaveLayoutDialog
        open={isSaveOpen}
        onOpenChange={setIsSaveOpen}
        name={saveName}
        layoutMode={layoutMode}
        saveKind={saveKind}
        error={saveError}
        onNameChange={(value) => {
          setSaveName(value);
          setSaveError(null);
        }}
        onSaveKindChange={(value) => {
          setSaveKind(value);
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
        onSignOut={signOut}
      />
    </>
  );
}
