"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { LocalObjectUrlRegistry } from "@/lib/local-uploads/object-urls";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { DEFAULT_FIXED_GRID, type FixedGrid } from "@/lib/viewer/layout";
import { DEFAULT_WORKSPACE_LAYERS } from "@/lib/viewer/workspaces";
import {
  FeedWorkbenchRender,
  loadWorkbenchOverlays,
  type FeedWorkbenchRenderProps,
} from "./feed-workbench-render";
import type {
  AccountState,
  FeedSession,
  FreeDragState,
  LayoutMode,
  RedditInputMode,
  RedditListingSort,
  RedditTimeRange,
  RuntimeWorkspace,
  SaveKind,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  SourceGroupingMode,
  WorkspaceLayer,
  WorkspaceTab,
  WorkspaceTemplateSlot,
} from "./workbench/types";
import {
  DEFAULT_REDDIT_MEDIA_LIMIT,
  DEFAULT_TIMER_SECONDS,
  FALLBACK_INITIAL_WORKSPACE_ID,
} from "./workbench/types";
import { createId } from "./workbench/helpers";
import {
  cloudSaveBlockReason,
  readStoredSaveTarget,
  type CloudShareTarget,
  type CloudUsageState,
  type SaveTarget,
} from "./workbench/cloud-save-state";
import { useCloudLibraryActions } from "./workbench/cloud-library-actions";
import { useSharedViewerUrlActions } from "./workbench/shared-viewer-url-actions";
import { useOpenWorkspaceStats } from "./workbench/feed-workbench-open-workspace-stats";
import {
  activeLayerFreeRects as deriveActiveLayerFreeRects,
  activeLayerHasLayoutContent,
  availableSeparateSourceSlots as deriveAvailableSeparateSourceSlots,
  deriveLayerStats,
  selectedActiveLayerSession,
  visibleFixedEmptySlots,
} from "./workbench/selection-state";
import { useSourceRuntimeHandlers } from "./workbench/source-runtime-handlers";
import { loadViewerCloudLibraryFromAccount } from "./workbench/workspace-sync-actions";
import { useWorkspaceHandlers } from "./workbench/workspace-handler-actions";
import { useLayoutHandlers } from "./workbench/layout-handler-actions";
import { useFeedWorkbenchEffects } from "./workbench/feed-workbench-effects";
import { useFeedWorkbenchLocalCache } from "./workbench/feed-workbench-local-cache";
import {
  useWorkbenchOverlayActionWrappers,
  useWorkbenchOverlayMounting,
} from "./workbench/feed-workbench-overlay-actions";
import { useSelectedSessionTimerControls } from "./workbench/feed-workbench-selection-actions";
import {
  setAllSessionSourcesOrderRandomized,
  toggleSessionOrderRandomized,
} from "./workbench/source-order-state";
import type { WorkbenchPanelComponents } from "./workbench/workbench-chrome";

export function FeedWorkbench({
  initialWorkspaceId = FALLBACK_INITIAL_WORKSPACE_ID,
  workbenchPanelComponents,
}: {
  initialWorkspaceId?: string;
  workbenchPanelComponents?: WorkbenchPanelComponents;
} = {}) {
  const initialWorkspace = useMemo(
    () => ({ id: initialWorkspaceId, name: "Untitled layout" }),
    [initialWorkspaceId],
  );
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTab[]>([
    initialWorkspace,
  ]);
  const [workspaceStates, setWorkspaceStates] = useState<
    Record<string, RuntimeWorkspace>
  >({});
  const [savedWorkspaces, setSavedWorkspaces] = useState<
    Record<string, SerializedWorkspace>
  >({});
  const [savedTemplates, setSavedTemplates] = useState<
    Record<string, SerializedWorkspaceTemplate>
  >({});
  const [cloudWorkspaces, setCloudWorkspaces] = useState<
    Record<string, SerializedWorkspace>
  >({});
  const [cloudTemplates, setCloudTemplates] = useState<
    Record<string, SerializedWorkspaceTemplate>
  >({});
  const [cloudUsage, setCloudUsage] = useState<CloudUsageState>(() =>
    getSupabaseEnv() ? { status: "loading" } : { status: "unconfigured" },
  );
  const [libraryStorageTarget, setLibraryStorageTarget] =
    useState<SaveTarget>("local");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    initialWorkspace.id,
  );

  const [redditUrls, setRedditUrls] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [redditInputMode, setRedditInputMode] =
    useState<RedditInputMode>("subreddit");
  const [subredditName, setSubredditName] = useState("");
  const [redditSort, setRedditSort] = useState<RedditListingSort>("top");
  const [redditTimeRange, setRedditTimeRange] =
    useState<RedditTimeRange>("week");
  const [redditLimit, setRedditLimit] = useState(DEFAULT_REDDIT_MEDIA_LIMIT);
  const [globalSeconds, setGlobalSeconds] = useState(DEFAULT_TIMER_SECONDS);
  const [globalAudioEnabled, setGlobalAudioEnabled] = useState(false);
  const [finishVideoBeforeAdvance, setFinishVideoBeforeAdvance] =
    useState(false);
  const [randomVideoStart, setRandomVideoStart] = useState(false);
  const [globalOrderRandomized, setGlobalOrderRandomized] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("fixed");
  const [fixedGrid, setFixedGrid] = useState<FixedGrid>(DEFAULT_FIXED_GRID);
  const [layers, setLayers] = useState<WorkspaceLayer[]>(() =>
    DEFAULT_WORKSPACE_LAYERS.map((layer) => ({ ...layer })),
  );
  const [activeLayerId, setActiveLayerId] = useState("layer-1");
  const [sessions, setSessions] = useState<FeedSession[]>([]);
  const [galleryIndexes, setGalleryIndexes] = useState<Record<string, number>>(
    {},
  );
  const [videoPositions, setVideoPositions] = useState<Record<string, number>>(
    {},
  );
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>(
    {},
  );
  const [finishedVideoKeys, setFinishedVideoKeys] = useState<
    Record<string, boolean>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const [pendingFixedSlot, setPendingFixedSlot] = useState<number | null>(null);
  const [pendingTemplateSlotId, setPendingTemplateSlotId] = useState<
    string | null
  >(null);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isLayoutsOpen, setIsLayoutsOpen] = useState(false);
  const [layoutDialogView, setLayoutDialogView] = useState<
    "library" | "workspace"
  >("library");
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [account, setAccount] = useState<AccountState>(() =>
    getSupabaseEnv() ? { status: "loading" } : { status: "unconfigured" },
  );
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState(initialWorkspace.name);
  const [saveKind, setSaveKind] = useState<SaveKind>("layout");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(
    null,
  );
  const [editingWorkspaceName, setEditingWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [saveTarget, setSaveTarget] =
    useState<SaveTarget>(readStoredSaveTarget);
  const [cloudShareTarget, setCloudShareTarget] =
    useState<CloudShareTarget | null>(null);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [isDesktopWorkbenchCollapsed, setIsDesktopWorkbenchCollapsed] =
    useState(false);
  const [isUiRevealVisible, setIsUiRevealVisible] = useState(true);
  const [showAllInfo, setShowAllInfo] = useState(false);
  const [sourceGroupingMode, setSourceGroupingMode] =
    useState<SourceGroupingMode>("stacked");
  const [freeDrag, setFreeDrag] = useState<FreeDragState | null>(null);
  const [templateSlots, setTemplateSlots] = useState<WorkspaceTemplateSlot[]>(
    [],
  );
  const registryRef = useRef<LocalObjectUrlRegistry | null>(null);
  const freeGridRef = useRef<HTMLDivElement | null>(null);
  const {
    hasMountedOverlays,
    preloadWorkbenchOverlays,
    showWorkbenchOverlays,
  } = useWorkbenchOverlayMounting(loadWorkbenchOverlays);
  const {
    canCacheLocalFiles,
    largeLocalByteCachePrompt,
    localCacheStorageFullStatus,
    localCacheStatus,
    confirmLargeLocalByteCache,
    answerLargeLocalByteCachePrompt,
    refreshLocalCacheStatus,
    refreshLocalCacheStatusForCurrentLayout,
    clearLocalCache,
    setLocalCacheStorageFullStatus,
    setLocalCacheStorageFullStatusWithOverlay,
  } = useFeedWorkbenchLocalCache({
    sessions,
    showWorkbenchOverlays,
  });

  const workspaceName =
    workspaceTabs.find((tab) => tab.id === activeWorkspaceId)?.name ??
    "Layout 1";
  const visibleFixedCells = fixedGrid.columns * fixedGrid.rows;
  const activeLayerFreeRects = useMemo(
    () =>
      deriveActiveLayerFreeRects({
        sessions,
        templateSlots,
        activeLayerId,
      }),
    [activeLayerId, sessions, templateSlots],
  );
  const layoutModeLocked = sessions.length > 0 || templateSlots.length > 0;
  const selected = useMemo(
    () =>
      selectedActiveLayerSession({
        sessions,
        activeLayerId,
        selectedId,
      }),
    [activeLayerId, selectedId, sessions],
  );
  const maximized = useMemo(
    () => sessions.find((session) => session.id === maximizedId),
    [maximizedId, sessions],
  );
  const editingSource = useMemo(
    () => sessions.find((session) => session.id === editingSourceId) ?? null,
    [editingSourceId, sessions],
  );
  const visibleEmptySlots = useMemo(
    () =>
      visibleFixedEmptySlots({
        sessions,
        activeLayerId,
        visibleFixedCells,
      }),
    [activeLayerId, sessions, visibleFixedCells],
  );
  const availableSeparateSourceSlots = useMemo(
    () =>
      deriveAvailableSeparateSourceSlots({
        layoutMode,
        visibleEmptySlots,
        activeLayerFreeRects,
        pendingTemplateSlotId,
      }),
    [
      activeLayerFreeRects,
      layoutMode,
      pendingTemplateSlotId,
      visibleEmptySlots,
    ],
  );
  const canCloneOrFillSelectedSource = Boolean(
    selected?.items.length &&
    (layoutMode === "fixed"
      ? visibleEmptySlots.length
      : availableSeparateSourceSlots),
  );
  const accountButtonLabel =
    account.status === "signed-in" ? "Account" : "Sign in";
  const accountButtonTitle =
    account.status === "signed-in" ? account.email : accountButtonLabel;
  const isClearDisabled = !activeLayerHasLayoutContent({
    sessions,
    templateSlots,
    activeLayerId,
  });
  const layerStats = useMemo(
    () => deriveLayerStats({ layers, sessions }),
    [layers, sessions],
  );
  const openWorkspaceStats = useOpenWorkspaceStats({
    activeWorkspaceId,
    savedWorkspaces,
    sessions,
    workspaceStates,
    workspaceTabs,
  });
  const currentLayoutHasLocalSources = sessions.some(
    (session) => session.sourceConfig.kind === "local",
  );
  const cloudBlockReason = cloudSaveBlockReason({
    account,
    usage: cloudUsage,
    hasLocalSources: currentLayoutHasLocalSources,
    isTemplate: layoutMode === "free" && saveKind === "template",
  });
  const rememberVideoPosition = useCallback(
    (key: string, seconds: number, durationSeconds?: number) => {
      setVideoPositions((current) => {
        if (current[key] === seconds) return current;
        return { ...current, [key]: seconds };
      });
      if (durationSeconds !== undefined) {
        setVideoDurations((current) => {
          if (current[key] === durationSeconds) return current;
          return { ...current, [key]: durationSeconds };
        });
      }
    },
    [],
  );
  const rememberVideoFinished = useCallback((key: string) => {
    setFinishedVideoKeys((current) =>
      current[key] ? current : { ...current, [key]: true },
    );
  }, []);
  const refreshCloudLibrary = useCallback(async (isAccountSignedIn = false) => {
    if (!getSupabaseEnv()) {
      setCloudUsage({ status: "unconfigured" });
      return;
    }

    setCloudUsage({ status: "loading" });
    const result = await loadViewerCloudLibraryFromAccount();

    if (result.status === "loaded") {
      setCloudWorkspaces(result.workspaces);
      setCloudTemplates(result.templates);
      setCloudUsage(result.usage);
      return;
    }

    if (result.status === "skipped") {
      setCloudWorkspaces({});
      setCloudTemplates({});
      setCloudUsage(
        result.reason === "unconfigured"
          ? { status: "unconfigured" }
          : isAccountSignedIn
            ? {
                status: "error",
                message: "Cloud session unavailable after sign-in",
              }
            : { status: "signed-out" },
      );
      return;
    }

    setCloudUsage({ status: "error", message: result.error });
  }, []);
  const {
    fetchRedditFeed,
    openUrlSource,
    addLocalFiles,
    addDroppedLocalFiles,
    selectLocalFilesWithHandles,
    selectLocalFolderWithHandles,
    allowLocalFileDrop,
    replaceLocalSessionFiles,
    requestLocalCacheAccess,
    openSourcePanel,
    openEditSource,
    updateSession,
    saveRedditSourceEdit,
    saveUrlSourceEdit,
    saveLocalSourceEdit,
    hydrateRuntimeItems,
  } = useSourceRuntimeHandlers({
    redditInputMode,
    subredditName,
    redditSort,
    redditTimeRange,
    redditUrls,
    redditLimit,
    sourceGroupingMode,
    availableSeparateSourceSlots,
    urlValue,
    urlTitle,
    activeLayerId,
    globalSeconds,
    globalOrderRandomized,
    pendingFixedSlot,
    pendingTemplateSlotId,
    templateSlots,
    layoutMode,
    sessions,
    canCacheLocalFiles,
    confirmLargeLocalByteCache,
    onLocalCacheStorageFull: setLocalCacheStorageFullStatusWithOverlay,
    visibleFixedCells,
    registryRef,
    createId,
    setIsLoading,
    setIsSourceOpen,
    setUrlValue,
    setUrlTitle,
    setRedditUrls,
    setRedditInputMode,
    setSubredditName,
    setRedditSort,
    setRedditTimeRange,
    setRedditLimit,
    setSessions,
    setSelectedId,
    setEditingSourceId,
    setPendingFixedSlot,
    setPendingTemplateSlotId,
    setTemplateSlots,
  });
  const randomizeSelectedSource = useCallback(() => {
    if (!selected) return;
    updateSession(selected.id, toggleSessionOrderRandomized);
  }, [selected, updateSession]);
  const setGlobalSourceOrderRandomized = useCallback((enabled: boolean) => {
    setGlobalOrderRandomized(enabled);
    setSessions((current) =>
      setAllSessionSourcesOrderRandomized(current, enabled),
    );
  }, []);
  const setSelectedSourceAudioEnabled = useCallback(
    (enabled: boolean) => {
      if (!selected) return;
      updateSession(selected.id, (session) => ({
        ...session,
        isAudioEnabled: enabled,
      }));
    },
    [selected, updateSession],
  );
  const setSelectedSourceFinishVideoBeforeAdvance = useCallback(
    (enabled: boolean) => {
      if (!selected) return;
      updateSession(selected.id, (session) => ({
        ...session,
        finishVideoBeforeAdvance: enabled,
      }));
    },
    [selected, updateSession],
  );
  const setSelectedSourceRandomVideoStart = useCallback(
    (enabled: boolean) => {
      if (!selected) return;
      updateSession(selected.id, (session) => ({
        ...session,
        randomVideoStart: enabled,
      }));
    },
    [selected, updateSession],
  );
  const setAllSourcesAudioEnabled = useCallback((enabled: boolean) => {
    setGlobalAudioEnabled(enabled);
    setSessions((current) =>
      current.map((session) =>
        session.isAudioEnabled === enabled
          ? session
          : { ...session, isAudioEnabled: enabled },
      ),
    );
  }, []);
  const {
    setCloudShareTargetWithOverlay,
    openSourcePanelWithOverlay,
    openEditSourceWithOverlay,
  } = useWorkbenchOverlayActionWrappers({
    openEditSource,
    openSourcePanel,
    setCloudShareTarget,
    showWorkbenchOverlays,
  });
  const {
    openSaveDialog,
    saveLayoutAs,
    saveTemplateAs,
    createWorkspaceTab,
    selectWorkspace,
    beginWorkspaceRename,
    commitWorkspaceRename,
    closeWorkspaceTab,
    closeWorkspaceTabs,
    openSavedWorkspaces,
    openSavedTemplates,
    deleteSavedWorkspace,
    deleteSavedTemplate,
    renameSavedWorkspace,
    renameSavedTemplate,
    exportCurrentWorkspaceJson,
    importCurrentWorkspaceJson,
    applyWorkspaceSnapshot,
  } = useWorkspaceHandlers({
    workspaceName,
    saveName,
    activeWorkspaceId,
    workspaceTabs,
    workspaceStates,
    savedWorkspaces,
    savedTemplates,
    cloudWorkspaces,
    cloudTemplates,
    saveTarget,
    libraryStorageTarget,
    account,
    editingWorkspaceId,
    editingWorkspaceName,
    layers,
    activeLayerId,
    layoutMode,
    fixedGrid,
    globalSeconds,
    sessions,
    templateSlots,
    createId,
    hydrateRuntimeItems,
    getLocalCacheStatusMessage: async () => {
      const status = await refreshLocalCacheStatusForCurrentLayout();
      if (!status) return null;
      return status.freeLabel
        ? `${status.label} · ${status.freeLabel}`
        : status.label;
    },
    setSaveName,
    setSaveKind,
    setSaveError,
    setIsSaveOpen,
    setIsLayoutsOpen,
    setWorkspaceTabs,
    setWorkspaceStates,
    setSavedWorkspaces,
    setSavedTemplates,
    setCloudWorkspaces,
    setCloudTemplates,
    setCloudUsage,
    setActiveWorkspaceId,
    setEditingWorkspaceId,
    setEditingWorkspaceName,
    setLayers,
    setActiveLayerId,
    setLayoutMode,
    setFixedGrid,
    setGlobalSeconds,
    setTemplateSlots,
    setSessions,
    setGalleryIndexes,
    setSelectedId,
    setMaximizedId,
    setPendingTemplateSlotId,
  });
  const {
    updateFixedGrid,
    changeLayoutMode,
    removeSession,
    removeTemplateSlot,
    beginFreeDrag,
    commitFreeDrag,
    updateFreeDrag,
    changeGallery,
    setGlobalTimerSeconds,
    setViewTimerSeconds,
    setViewTimerMode,
    runGlobalAction,
    cloneSelectedSource,
    fillSelectedSourceSpace,
    selectLayer,
    clearCurrentLayout,
    signOut,
  } = useLayoutHandlers({
    layoutMode,
    layoutModeLocked,
    activeLayerId,
    layers,
    sessions,
    templateSlots,
    galleryIndexes,
    videoPositions,
    selected: selected ?? null,
    selectedId,
    maximizedId,
    pendingTemplateSlotId,
    visibleFixedCells,
    globalSeconds,
    freeDrag,
    freeGridRef,
    createId,
    setFixedGrid,
    setLayoutMode,
    setSessions,
    setTemplateSlots,
    setGalleryIndexes,
    setVideoPositions,
    setSelectedId,
    setMaximizedId,
    setPendingFixedSlot,
    setPendingTemplateSlotId,
    setFreeDrag,
    setGlobalSeconds,
    setLayers,
    setActiveLayerId,
    setIsClearOpen,
    setAccount,
  });
  const {
    uploadWorkspaceToCloud,
    uploadTemplateToCloud,
    exportSavedJson,
    importSavedJson,
    shareCloudItem,
    regenerateCloudShareLink,
    disableCloudShareLink,
  } = useCloudLibraryActions({
    activeWorkspaceId,
    workspaceTabs,
    savedWorkspaces,
    savedTemplates,
    cloudWorkspaces,
    cloudTemplates,
    createId,
    setSavedWorkspaces,
    setSavedTemplates,
    setCloudWorkspaces,
    setCloudTemplates,
    setCloudUsage,
    setLibraryStorageTarget,
    setCloudShareTarget: setCloudShareTargetWithOverlay,
  });

  useSharedViewerUrlActions({
    activeWorkspaceId,
    workspaceName,
    layers,
    activeLayerId,
    layoutMode,
    fixedGrid,
    globalSeconds,
    sessions,
    templateSlots,
    workspaceTabs,
    workspaceStates,
    savedWorkspaces,
    savedTemplates,
    createId,
    applyWorkspaceSnapshot,
    setWorkspaceTabs,
    setWorkspaceStates,
    setActiveWorkspaceId,
    setSavedWorkspaces,
    setSavedTemplates,
  });

  const activeKeyboardSessionId = maximizedId ?? selected?.id ?? null;
  useFeedWorkbenchEffects({
    accountStatus: account.status,
    activeKeyboardSessionId,
    activeLayerId,
    applyWorkspaceSnapshot,
    commitFreeDrag,
    freeDrag,
    galleryIndexes,
    hydrateRuntimeItems,
    initialWorkspace,
    isUiHidden,
    layoutMode,
    refreshCloudLibrary,
    registryRef,
    saveTarget,
    sessions,
    finishVideoBeforeAdvance,
    finishedVideoKeys,
    setAccount,
    setActiveWorkspaceId,
    setCloudTemplates,
    setCloudUsage,
    setCloudWorkspaces,
    setIsUiHidden,
    setIsUiRevealVisible,
    setSavedTemplates,
    setSavedWorkspaces,
    setSessions,
    setWorkspaceStates,
    setWorkspaceTabs,
    updateFreeDrag,
    visibleFixedCells,
  });

  const isAnySheetOpen =
    isSourceOpen ||
    isLayoutsOpen ||
    isAccountOpen ||
    isSaveOpen ||
    isClearOpen ||
    Boolean(editingSource) ||
    Boolean(largeLocalByteCachePrompt) ||
    Boolean(localCacheStorageFullStatus) ||
    Boolean(cloudShareTarget);

  const shouldMountOverlays = isAnySheetOpen || hasMountedOverlays;

  const {
    moveSelectedSource,
    toggleSelectedSourcePaused,
    restartSelectedSource,
    setSelectedTimerMode,
    setSelectedTimerSeconds,
  } = useSelectedSessionTimerControls({
    selected: selected ?? null,
    updateSession,
    setViewTimerMode,
    setViewTimerSeconds,
  });

  const renderProps = {
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
    globalAudioEnabled,
    globalSeconds,
    finishVideoBeforeAdvance,
    randomVideoStart,
    globalOrderRandomized,
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
    maximized: maximized ?? null,
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
    refreshLocalCacheStatus,
    refreshLocalCacheStatusForCurrentLayout,
    regenerateCloudShareLink,
    rememberVideoPosition,
    rememberVideoFinished,
    removeSession,
    randomizeSelectedSource,
    setGlobalSourceOrderRandomized,
    removeTemplateSlot,
    replaceLocalSessionFiles,
    requestLocalCacheAccess,
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
    renameSavedTemplate,
    renameSavedWorkspace,
    selectLayer,
    selectLocalFilesWithHandles,
    selectLocalFolderWithHandles,
    selectWorkspace,
    selected: selected ?? null,
    selectedId,
    sessions,
    setCloudShareTargetWithOverlay,
    setEditingSourceId,
    setEditingWorkspaceId,
    setEditingWorkspaceName,
    setGlobalTimerSeconds,
    setGlobalAudioEnabled: setAllSourcesAudioEnabled,
    setFinishVideoBeforeAdvance,
    setRandomVideoStart,
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
    setSelectedSourceAudioEnabled,
    setSelectedSourceFinishVideoBeforeAdvance,
    setSelectedSourceRandomVideoStart,
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
    updateSession,
    uploadTemplateToCloud,
    uploadWorkspaceToCloud,
    urlTitle,
    urlValue,
    videoDurations,
    videoPositions,
    visibleFixedCells,
    workspaceName,
    workspaceTabs,
    workbenchPanelComponents,
  } satisfies FeedWorkbenchRenderProps;

  return <FeedWorkbenchRender {...renderProps} />;
}
