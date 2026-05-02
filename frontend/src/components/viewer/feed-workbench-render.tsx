"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type {
  ChangeEvent,
  Dispatch,
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
} from "react";

import type {
  LocalFileByteCacheConfirmation,
  LocalFileCacheStorageStatus,
} from "@/lib/local-uploads/file-cache";
import { cn } from "@/lib/utils";
import type { FixedGrid, FreeRect } from "@/lib/viewer/layout";
import { HiddenUiRevealButton } from "./workbench/hidden-ui-reveal-button";
import type { LayerStats } from "./workbench/selection-state";
import type {
  CloudShareTarget,
  CloudUsageState,
  SaveTarget,
} from "./workbench/cloud-save-state";
import type {
  AccountState,
  FeedSession,
  FreeDragState,
  LayoutMode,
  RedditInputMode,
  RedditListingSort,
  RedditTimeRange,
  SaveKind,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  SourceGroupingMode,
  WorkspaceLayer,
  WorkspaceTab,
  WorkspaceTemplateSlot,
} from "./workbench/types";
import { MAX_LAYOUT_NAME_LENGTH } from "./workbench/types";
import { limitLayoutName } from "./workbench/helpers";
import { WorkbenchChrome } from "./workbench/workbench-chrome";
import type { WorkbenchPanelComponents } from "./workbench/workbench-chrome";
import { WorkbenchHeader } from "./workbench/workbench-header";
import { WorkbenchStage } from "./workbench/workbench-stage";
import type {
  SourceDialogProps,
  SourceKind,
} from "./workbench/source-add-dialog";
import type { GlobalTimerAction } from "./workbench/workbench-toolbar";

export const loadWorkbenchOverlays = () =>
  import("./workbench/workbench-overlays");
const WorkbenchOverlays = dynamic(
  () => loadWorkbenchOverlays().then((module) => module.WorkbenchOverlays),
  { ssr: false },
);
const SourceDialog = dynamic<SourceDialogProps>(
  () =>
    import("./workbench/source-add-dialog").then(
      (module) => module.SourceDialog,
    ),
  { ssr: false },
);

export type FeedWorkbenchRenderProps = {
  account: AccountState;
  accountButtonLabel: string;
  accountButtonTitle: string;
  activeLayerId: string;
  activeWorkspaceId: string;
  addDroppedLocalFiles: (event: ReactDragEvent<HTMLElement>) => void;
  addLocalFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  allowLocalFileDrop: (event: ReactDragEvent<HTMLElement>) => void;
  answerLargeLocalByteCachePrompt: (confirmed: boolean) => void;
  beginFreeDrag: (
    event: ReactPointerEvent<HTMLButtonElement>,
    target: { id: string; freeRect: FreeRect },
    mode: "move" | "resize",
    targetType?: FreeDragState["targetType"],
  ) => void;
  beginWorkspaceRename: (tab: WorkspaceTab) => void;
  canCloneOrFillSelectedSource: boolean;
  changeGallery: (itemId: string, direction: 1 | -1) => void;
  changeLayoutMode: (mode: LayoutMode) => void;
  clearCurrentLayout: () => void;
  clearLocalCache: () => void | Promise<void>;
  closeWorkspaceTab: (id: string) => void;
  closeWorkspaceTabs: (ids: string[]) => void;
  cloneSelectedSource: () => void;
  cloudBlockReason: string | null;
  cloudShareTarget: CloudShareTarget | null;
  cloudTemplates: Record<string, SerializedWorkspaceTemplate>;
  cloudUsage: CloudUsageState;
  cloudWorkspaces: Record<string, SerializedWorkspace>;
  commitWorkspaceRename: () => void;
  createWorkspaceTab: () => void;
  currentLayoutHasLocalSources: boolean;
  deleteSavedTemplate: (id: string, target?: SaveTarget) => void;
  deleteSavedWorkspace: (id: string, target?: SaveTarget) => void;
  disableCloudShareLink: (target: CloudShareTarget) => void;
  editingSource: FeedSession | null;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;
  exportCurrentWorkspaceJson: () => void;
  exportSavedJson: (
    kind: "layout" | "template",
    id: string,
    target: SaveTarget,
  ) => void;
  fetchRedditFeed: () => void;
  fillSelectedSourceSpace: () => void;
  fixedGrid: FixedGrid;
  freeDrag: FreeDragState | null;
  freeGridRef: RefObject<HTMLDivElement | null>;
  galleryIndexes: Record<string, number>;
  globalSeconds: number;
  importCurrentWorkspaceJson: () => void;
  importSavedJson: (target: SaveTarget) => void;
  isAccountOpen: boolean;
  isAnySheetOpen: boolean;
  isClearDisabled: boolean;
  isClearOpen: boolean;
  isDesktopWorkbenchCollapsed: boolean;
  isLayoutsOpen: boolean;
  isLoading: boolean;
  isSaveOpen: boolean;
  isSourceOpen: boolean;
  isUiHidden: boolean;
  isUiRevealVisible: boolean;
  largeLocalByteCachePrompt: LocalFileByteCacheConfirmation | null;
  layerStats: LayerStats[];
  layers: WorkspaceLayer[];
  layoutMode: LayoutMode;
  layoutModeLocked: boolean;
  layoutDialogView: "library" | "workspace";
  libraryStorageTarget: SaveTarget;
  localCacheStatus: LocalFileCacheStorageStatus | null;
  localCacheStorageFullStatus: LocalFileCacheStorageStatus | null;
  maximized: FeedSession | null;
  moveSelectedSource: (direction: 1 | -1) => void;
  openEditSourceWithOverlay: (id: string) => void;
  openSavedTemplates: (ids: string[]) => void;
  openSavedWorkspaces: (ids: string[]) => void;
  openSaveDialog: () => void;
  openSourcePanelWithOverlay: (
    fixedSlot?: number | null,
    templateSlotId?: string | null,
  ) => void;
  openUrlSource: () => void;
  openWorkspaceStats: Record<
    string,
    { sourceCount: number; fileCount: number }
  >;
  preloadWorkbenchOverlays: () => void;
  redditInputMode: RedditInputMode;
  redditLimit: number;
  redditSort: RedditListingSort;
  redditTimeRange: RedditTimeRange;
  redditUrls: string;
  regenerateCloudShareLink: (target: CloudShareTarget) => void;
  rememberVideoPosition: (key: string, seconds: number) => void;
  removeSession: (id: string) => void;
  removeTemplateSlot: (id: string) => void;
  replaceLocalSessionFiles: (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  requestLocalCacheAccess: (id: string) => void;
  refreshLocalCacheStatus: () => Promise<LocalFileCacheStorageStatus>;
  refreshLocalCacheStatusForCurrentLayout: () => Promise<LocalFileCacheStorageStatus | null>;
  renameSavedTemplate: (input: {
    id: string;
    name: string;
    target?: SaveTarget;
  }) => Promise<string | null>;
  renameSavedWorkspace: (input: {
    id: string;
    name: string;
    target?: SaveTarget;
  }) => Promise<string | null>;
  restartSelectedSource: () => void;
  runGlobalAction: (action: GlobalTimerAction) => void;
  saveError: string | null;
  saveKind: SaveKind;
  saveLayoutAs: () => void;
  saveLocalSourceEdit: (id: string, files: File[]) => void;
  saveName: string;
  saveRedditSourceEdit: (
    id: string,
    urls: string[],
    limit: number,
    hiddenItemIds: string[],
    unhiddenItemHashes: string[],
  ) => void;
  saveTarget: SaveTarget;
  saveTemplateAs: () => void;
  saveUrlSourceEdit: (id: string, url: string, title?: string) => void;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
  selectLayer: (id: string) => void;
  selectLocalFilesWithHandles: () => Promise<boolean>;
  selectLocalFolderWithHandles: () => Promise<boolean>;
  selectWorkspace: (id: string) => void;
  selected: FeedSession | null;
  selectedId: string | null;
  sessions: FeedSession[];
  setCloudShareTargetWithOverlay: Dispatch<
    SetStateAction<CloudShareTarget | null>
  >;
  setEditingSourceId: Dispatch<SetStateAction<string | null>>;
  setEditingWorkspaceId: Dispatch<SetStateAction<string | null>>;
  setEditingWorkspaceName: Dispatch<SetStateAction<string>>;
  setIsAccountOpen: Dispatch<SetStateAction<boolean>>;
  setIsClearOpen: Dispatch<SetStateAction<boolean>>;
  setIsDesktopWorkbenchCollapsed: Dispatch<SetStateAction<boolean>>;
  setLayoutDialogView: Dispatch<SetStateAction<"library" | "workspace">>;
  setIsLayoutsOpen: Dispatch<SetStateAction<boolean>>;
  setIsSaveOpen: Dispatch<SetStateAction<boolean>>;
  setIsSourceOpen: Dispatch<SetStateAction<boolean>>;
  setIsUiHidden: Dispatch<SetStateAction<boolean>>;
  setIsUiRevealVisible: Dispatch<SetStateAction<boolean>>;
  setLibraryStorageTarget: Dispatch<SetStateAction<SaveTarget>>;
  setGlobalTimerSeconds: (seconds: number) => void;
  setLocalCacheStorageFullStatus: Dispatch<
    SetStateAction<LocalFileCacheStorageStatus | null>
  >;
  setMaximizedId: Dispatch<SetStateAction<string | null>>;
  setPendingFixedSlot: Dispatch<SetStateAction<number | null>>;
  setPendingTemplateSlotId: Dispatch<SetStateAction<string | null>>;
  setRedditInputMode: Dispatch<SetStateAction<RedditInputMode>>;
  setRedditLimit: Dispatch<SetStateAction<number>>;
  setRedditSort: Dispatch<SetStateAction<RedditListingSort>>;
  setRedditTimeRange: Dispatch<SetStateAction<RedditTimeRange>>;
  setRedditUrls: Dispatch<SetStateAction<string>>;
  setSaveError: Dispatch<SetStateAction<string | null>>;
  setSaveKind: Dispatch<SetStateAction<SaveKind>>;
  setSaveName: Dispatch<SetStateAction<string>>;
  setSaveTarget: Dispatch<SetStateAction<SaveTarget>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setSelectedTimerMode: (mode: FeedSession["timerMode"]) => void;
  setSelectedTimerSeconds: (seconds: number) => void;
  setShowAllInfo: Dispatch<SetStateAction<boolean>>;
  setSourceGroupingMode: Dispatch<SetStateAction<SourceGroupingMode>>;
  setSubredditName: Dispatch<SetStateAction<string>>;
  setUrlTitle: Dispatch<SetStateAction<string>>;
  setUrlValue: Dispatch<SetStateAction<string>>;
  setViewTimerMode: (id: string, mode: FeedSession["timerMode"]) => void;
  setViewTimerSeconds: (id: string, value: number) => void;
  shareCloudItem: (target: CloudShareTarget) => void;
  shouldMountOverlays: boolean;
  showAllInfo: boolean;
  showWorkbenchOverlays: () => void;
  signOut: () => void;
  sourceGroupingMode: SourceGroupingMode;
  subredditName: string;
  templateSlots: WorkspaceTemplateSlot[];
  toggleSelectedSourcePaused: () => void;
  updateFixedGrid: (patch: Partial<FixedGrid>) => void;
  updateFreeRect: (id: string, patch: Partial<FreeRect>) => void;
  updateSession: (
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) => void;
  uploadTemplateToCloud: (id: string) => void;
  uploadWorkspaceToCloud: (id: string) => void;
  urlTitle: string;
  urlValue: string;
  videoPositions: Record<string, number>;
  visibleFixedCells: number;
  workspaceName: string;
  workspaceTabs: WorkspaceTab[];
  workbenchPanelComponents?: WorkbenchPanelComponents;
};

export function FeedWorkbenchRender(props: FeedWorkbenchRenderProps) {
  const {
    account,
    accountButtonLabel,
    accountButtonTitle,
    activeLayerId,
    activeWorkspaceId,
    addDroppedLocalFiles,
    addLocalFiles,
    allowLocalFileDrop,
    answerLargeLocalByteCachePrompt,
    beginFreeDrag,
    beginWorkspaceRename,
    canCloneOrFillSelectedSource,
    changeGallery,
    changeLayoutMode,
    clearCurrentLayout,
    clearLocalCache,
    closeWorkspaceTab,
    closeWorkspaceTabs,
    cloneSelectedSource,
    cloudBlockReason,
    cloudShareTarget,
    cloudTemplates,
    cloudUsage,
    cloudWorkspaces,
    commitWorkspaceRename,
    createWorkspaceTab,
    currentLayoutHasLocalSources,
    deleteSavedTemplate,
    deleteSavedWorkspace,
    disableCloudShareLink,
    editingSource,
    editingWorkspaceId,
    editingWorkspaceName,
    exportCurrentWorkspaceJson,
    exportSavedJson,
    fetchRedditFeed,
    fillSelectedSourceSpace,
    fixedGrid,
    freeDrag,
    freeGridRef,
    galleryIndexes,
    globalSeconds,
    importCurrentWorkspaceJson,
    importSavedJson,
    isAccountOpen,
    isAnySheetOpen,
    isClearDisabled,
    isClearOpen,
    isDesktopWorkbenchCollapsed,
    isLayoutsOpen,
    isLoading,
    isSaveOpen,
    isSourceOpen,
    isUiHidden,
    isUiRevealVisible,
    largeLocalByteCachePrompt,
    layerStats,
    layers,
    layoutMode,
    layoutModeLocked,
    layoutDialogView,
    libraryStorageTarget,
    localCacheStatus,
    localCacheStorageFullStatus,
    maximized,
    moveSelectedSource,
    openEditSourceWithOverlay,
    openSavedTemplates,
    openSavedWorkspaces,
    openSaveDialog,
    openSourcePanelWithOverlay,
    openUrlSource,
    openWorkspaceStats,
    preloadWorkbenchOverlays,
    redditInputMode,
    redditLimit,
    redditSort,
    redditTimeRange,
    redditUrls,
    regenerateCloudShareLink,
    rememberVideoPosition,
    removeSession,
    removeTemplateSlot,
    replaceLocalSessionFiles,
    requestLocalCacheAccess,
    refreshLocalCacheStatus,
    refreshLocalCacheStatusForCurrentLayout,
    renameSavedTemplate,
    renameSavedWorkspace,
    restartSelectedSource,
    runGlobalAction,
    saveError,
    saveKind,
    saveLayoutAs,
    saveLocalSourceEdit,
    saveName,
    saveRedditSourceEdit,
    saveTarget,
    saveTemplateAs,
    saveUrlSourceEdit,
    savedTemplates,
    savedWorkspaces,
    selectLayer,
    selectLocalFilesWithHandles,
    selectLocalFolderWithHandles,
    selectWorkspace,
    selected,
    selectedId,
    sessions,
    setCloudShareTargetWithOverlay,
    setEditingSourceId,
    setEditingWorkspaceId,
    setEditingWorkspaceName,
    setIsAccountOpen,
    setIsClearOpen,
    setIsDesktopWorkbenchCollapsed,
    setLayoutDialogView,
    setIsLayoutsOpen,
    setIsSaveOpen,
    setIsSourceOpen,
    setIsUiHidden,
    setIsUiRevealVisible,
    setLibraryStorageTarget,
    setGlobalTimerSeconds,
    setLocalCacheStorageFullStatus,
    setMaximizedId,
    setPendingFixedSlot,
    setPendingTemplateSlotId,
    setRedditInputMode,
    setRedditLimit,
    setRedditSort,
    setRedditTimeRange,
    setRedditUrls,
    setSaveError,
    setSaveKind,
    setSaveName,
    setSaveTarget,
    setSelectedId,
    setSelectedTimerMode,
    setSelectedTimerSeconds,
    setShowAllInfo,
    setSourceGroupingMode,
    setSubredditName,
    setUrlTitle,
    setUrlValue,
    setViewTimerMode,
    setViewTimerSeconds,
    shareCloudItem,
    shouldMountOverlays,
    showAllInfo,
    showWorkbenchOverlays,
    signOut,
    sourceGroupingMode,
    subredditName,
    templateSlots,
    toggleSelectedSourcePaused,
    updateFixedGrid,
    updateFreeRect,
    updateSession,
    uploadTemplateToCloud,
    uploadWorkspaceToCloud,
    urlTitle,
    urlValue,
    videoPositions,
    visibleFixedCells,
    workspaceName,
    workspaceTabs,
    workbenchPanelComponents,
  } = props;
  const [sourceKind, setSourceKind] = useState<SourceKind>("local");

  return (
    <main
      className={cn(
        "grid h-dvh grid-rows-[1fr] overflow-hidden bg-background text-foreground",
        (isUiHidden || maximized) && "select-none",
      )}
    >
      {isUiHidden ? (
        <HiddenUiRevealButton
          isVisible={isUiRevealVisible}
          onReveal={() => {
            setIsUiRevealVisible(true);
            setIsUiHidden(false);
          }}
        />
      ) : !maximized ? (
        <WorkbenchHeader
          workspaceTabs={workspaceTabs}
          activeWorkspaceId={activeWorkspaceId}
          editingWorkspaceId={editingWorkspaceId}
          editingWorkspaceName={editingWorkspaceName}
          maxLayoutNameLength={MAX_LAYOUT_NAME_LENGTH}
          onSelectWorkspace={selectWorkspace}
          onBeginWorkspaceRename={beginWorkspaceRename}
          onEditingWorkspaceNameChange={(value) =>
            setEditingWorkspaceName(limitLayoutName(value))
          }
          onCommitWorkspaceRename={commitWorkspaceRename}
          onCancelWorkspaceRename={() => setEditingWorkspaceId(null)}
          onCloseWorkspaceTab={closeWorkspaceTab}
          onCreateWorkspaceTab={createWorkspaceTab}
        />
      ) : null}

      {isSourceOpen ? (
        <SourceDialog
          open={isSourceOpen}
          onOpenChange={(open) => {
            setIsSourceOpen(open);
            if (!open) {
              setPendingFixedSlot(null);
              setPendingTemplateSlotId(null);
            }
          }}
          sourceKind={sourceKind}
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
          setSourceKind={setSourceKind}
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
      ) : null}

      {shouldMountOverlays ? (
        <WorkbenchOverlays
          largeLocalByteCachePrompt={largeLocalByteCachePrompt}
          onLargeLocalByteCacheOpenChange={(open) => {
            if (!open) answerLargeLocalByteCachePrompt(false);
          }}
          onConfirmLargeLocalByteCache={() =>
            answerLargeLocalByteCachePrompt(true)
          }
          localCacheStorageFullStatus={localCacheStorageFullStatus}
          onLocalCacheStorageFullOpenChange={(open) => {
            if (!open) setLocalCacheStorageFullStatus(null);
          }}
          onClearLocalCache={clearLocalCache}
          isLayoutsOpen={isLayoutsOpen}
          setIsLayoutsOpen={setIsLayoutsOpen}
          layoutDialogView={layoutDialogView}
          savedWorkspaces={savedWorkspaces}
          cloudWorkspaces={cloudWorkspaces}
          savedTemplates={savedTemplates}
          cloudTemplates={cloudTemplates}
          libraryStorageTarget={libraryStorageTarget}
          setLibraryStorageTarget={setLibraryStorageTarget}
          openSavedWorkspaces={openSavedWorkspaces}
          openSavedTemplates={openSavedTemplates}
          deleteSavedWorkspace={deleteSavedWorkspace}
          deleteSavedTemplate={deleteSavedTemplate}
          renameSavedWorkspace={renameSavedWorkspace}
          renameSavedTemplate={renameSavedTemplate}
          uploadWorkspaceToCloud={uploadWorkspaceToCloud}
          uploadTemplateToCloud={uploadTemplateToCloud}
          shareCloudItem={shareCloudItem}
          regenerateCloudShareLink={regenerateCloudShareLink}
          disableCloudShareLink={disableCloudShareLink}
          exportSavedJson={exportSavedJson}
          importCurrentWorkspaceJson={importCurrentWorkspaceJson}
          importSavedJson={importSavedJson}
          workspaceTabs={workspaceTabs}
          openWorkspaceStats={openWorkspaceStats}
          activeWorkspaceId={activeWorkspaceId}
          selectWorkspace={selectWorkspace}
          createWorkspaceTab={createWorkspaceTab}
          closeWorkspaceTab={closeWorkspaceTab}
          closeWorkspaceTabs={closeWorkspaceTabs}
          openSaveDialog={() => {
            showWorkbenchOverlays();
            setIsLayoutsOpen(false);
            if (account.status !== "signed-in") setSaveTarget("local");
            openSaveDialog();
            void refreshLocalCacheStatusForCurrentLayout();
          }}
          isSaveOpen={isSaveOpen}
          setIsSaveOpen={setIsSaveOpen}
          saveName={saveName}
          layoutMode={layoutMode}
          saveKind={saveKind}
          saveTarget={saveTarget}
          saveError={saveError}
          localCacheStatus={localCacheStatus}
          hasLocalSources={currentLayoutHasLocalSources}
          cloudUsage={cloudUsage}
          cloudBlockReason={saveTarget === "cloud" ? cloudBlockReason : null}
          setSaveName={setSaveName}
          setSaveError={setSaveError}
          setSaveKind={setSaveKind}
          setSaveTarget={setSaveTarget}
          saveLayoutAs={saveLayoutAs}
          saveTemplateAs={saveTemplateAs}
          isClearOpen={isClearOpen}
          setIsClearOpen={setIsClearOpen}
          clearCurrentLayout={clearCurrentLayout}
          editingSource={editingSource}
          setEditingSourceId={setEditingSourceId}
          saveRedditSourceEdit={saveRedditSourceEdit}
          saveUrlSourceEdit={saveUrlSourceEdit}
          saveLocalSourceEdit={saveLocalSourceEdit}
          isAccountOpen={isAccountOpen}
          setIsAccountOpen={setIsAccountOpen}
          account={account}
          cloudShareTarget={cloudShareTarget}
          setCloudShareTarget={setCloudShareTargetWithOverlay}
          signOut={signOut}
          onRefreshLocalCacheStatus={async () => {
            await refreshLocalCacheStatus();
          }}
        />
      ) : null}

      <WorkbenchStage
        maximized={maximized}
        sessions={sessions}
        galleryIndexes={galleryIndexes}
        videoPositions={videoPositions}
        isUiHidden={isUiHidden}
        isDesktopWorkbenchCollapsed={isDesktopWorkbenchCollapsed}
        showAllInfo={showAllInfo}
        setMaximizedId={setMaximizedId}
        changeGallery={changeGallery}
        rememberVideoPosition={rememberVideoPosition}
        updateSession={updateSession}
        setViewTimerMode={setViewTimerMode}
        setViewTimerSeconds={setViewTimerSeconds}
        replaceLocalSessionFiles={replaceLocalSessionFiles}
        requestLocalCacheAccess={requestLocalCacheAccess}
        openEditSource={openEditSourceWithOverlay}
        layoutMode={layoutMode}
        layers={layers}
        activeLayerId={activeLayerId}
        fixedGrid={fixedGrid}
        visibleFixedCells={visibleFixedCells}
        selectedId={selectedId}
        openSourcePanel={openSourcePanelWithOverlay}
        setSelectedId={setSelectedId}
        removeSession={removeSession}
        freeGridRef={freeGridRef}
        templateSlots={templateSlots}
        freeDrag={freeDrag}
        removeTemplateSlot={removeTemplateSlot}
        beginFreeDrag={beginFreeDrag}
      />
      {!isUiHidden && !maximized ? (
        <WorkbenchChrome
          workspaceName={workspaceName}
          layoutMode={layoutMode}
          layoutModeLocked={layoutModeLocked}
          fixedGrid={fixedGrid}
          globalSeconds={globalSeconds}
          hasRunningSessionTimer={sessions.some(
            (session) => !session.timer.isPaused,
          )}
          selected={selected}
          canCloneOrFillSelectedSource={canCloneOrFillSelectedSource}
          showAllInfo={showAllInfo}
          isClearDisabled={isClearDisabled}
          isAnySheetOpen={isAnySheetOpen}
          isDesktopWorkbenchCollapsed={isDesktopWorkbenchCollapsed}
          layers={layers}
          layerStats={layerStats}
          activeLayerId={activeLayerId}
          accountButtonLabel={accountButtonLabel}
          accountButtonTitle={accountButtonTitle}
          onLayoutModeChange={changeLayoutMode}
          onFixedGridChange={updateFixedGrid}
          onGlobalTimerSecondsChange={setGlobalTimerSeconds}
          onGlobalTimerAction={runGlobalAction}
          onCloneSelectedSource={cloneSelectedSource}
          onFillSelectedSourceSpace={fillSelectedSourceSpace}
          onRemoveSelectedSource={() => {
            if (selected) removeSession(selected.id);
          }}
          onSelectedTimerModeChange={setSelectedTimerMode}
          onSelectedTimerSecondsChange={setSelectedTimerSeconds}
          onSelectedMove={moveSelectedSource}
          onSelectedTogglePaused={toggleSelectedSourcePaused}
          onSelectedRestart={restartSelectedSource}
          onEditSelectedSource={() => {
            if (selected) openEditSourceWithOverlay(selected.id);
          }}
          onOpenSatellite={() => {
            if (selected) setMaximizedId(selected.id);
          }}
          onToggleShowAllInfo={() => setShowAllInfo((current) => !current)}
          onHideUi={() => {
            setIsUiRevealVisible(true);
            setIsUiHidden(true);
          }}
          onAddSource={() => openSourcePanelWithOverlay()}
          onOpenLibrary={() => {
            showWorkbenchOverlays();
            setLayoutDialogView("library");
            setIsLayoutsOpen(true);
          }}
          onOpenWorkspace={() => {
            showWorkbenchOverlays();
            setLayoutDialogView("workspace");
            setIsLayoutsOpen(true);
          }}
          onOpenSaveDialog={() => {
            showWorkbenchOverlays();
            if (account.status !== "signed-in") setSaveTarget("local");
            openSaveDialog();
            void refreshLocalCacheStatusForCurrentLayout();
          }}
          onImportJson={() => importSavedJson(libraryStorageTarget)}
          onExportCurrentJson={exportCurrentWorkspaceJson}
          onOpenClearDialog={() => {
            showWorkbenchOverlays();
            setIsClearOpen(true);
          }}
          onOpenAccount={() => {
            showWorkbenchOverlays();
            setIsAccountOpen(true);
            void refreshLocalCacheStatus();
          }}
          onPreloadOverlays={preloadWorkbenchOverlays}
          workbenchPanelComponents={workbenchPanelComponents}
          onDesktopWorkbenchCollapsedChange={setIsDesktopWorkbenchCollapsed}
          onSelectLayer={selectLayer}
          onFreeRectChange={updateFreeRect}
        />
      ) : null}
    </main>
  );
}
