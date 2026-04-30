"use client";

import dynamic from "next/dynamic";
import {
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { accountStateFromUser } from "./workbench/account-actions";
import {
  clearLocalFileCache,
  estimateLocalFileCacheStorage,
  formatLocalFileCacheStorageStatus,
  isLocalFileCacheSupported,
  type LocalFileByteCacheConfirmation,
  type LocalFileCacheStorageStatus,
} from "@/lib/local-uploads/file-cache";
import type { LocalObjectUrlRegistry } from "@/lib/local-uploads/object-urls";
import { createLazySupabaseBrowserClient } from "@/lib/supabase/browser-lazy";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { DEFAULT_FIXED_GRID, type FixedGrid } from "@/lib/viewer/layout";
import { moveTimerIndex, togglePaused } from "@/lib/viewer/timer";
import { DEFAULT_WORKSPACE_LAYERS } from "@/lib/viewer/workspaces";
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
  MAX_LAYOUT_NAME_LENGTH,
} from "./workbench/types";
import {
  createId,
  limitLayoutName,
  sessionFileCount,
} from "./workbench/helpers";
import {
  cloudSaveBlockReason,
  readStoredSaveTarget,
  writeStoredSaveTarget,
  type CloudShareTarget,
  type CloudUsageState,
  type SaveTarget,
} from "./workbench/cloud-save-state";
import { useCloudLibraryActions } from "./workbench/cloud-library-actions";
import { useSharedViewerUrlActions } from "./workbench/shared-viewer-url-actions";
import { visibleUrlRuntimeHydrationCandidates } from "./workbench/runtime-hydration-actions";
import {
  activeLayerFreeRects as deriveActiveLayerFreeRects,
  availableSeparateSourceSlots as deriveAvailableSeparateSourceSlots,
  deriveLayerStats,
  selectedActiveLayerSession,
  visibleFixedEmptySlots,
} from "./workbench/selection-state";
import { useSourceRuntimeHandlers } from "./workbench/source-runtime-handlers";
import { HiddenUiRevealButton } from "./workbench/hidden-ui-reveal-button";
import {
  restoreWorkspaceBootstrap,
  writeWorkspaceSessionStore,
} from "./workbench/workspace-state";
import { loadViewerCloudLibraryFromAccount } from "./workbench/workspace-sync-actions";
import { useWorkspaceHandlers } from "./workbench/workspace-handler-actions";
import { useLayoutHandlers } from "./workbench/layout-handler-actions";
import {
  HIDDEN_UI_REVEAL_TIMEOUT_MS,
  advanceSessionTimers,
  hasActiveSessionTimers,
  keyboardTimerMoveDirection,
  moveActiveKeyboardSessionTimer,
} from "./workbench/workbench-effect-state";
import { WorkbenchHeader } from "./workbench/workbench-header";
import { WorkbenchStage } from "./workbench/workbench-stage";
import {
  WorkbenchChrome,
  type WorkbenchPanelComponents,
} from "./workbench/workbench-chrome";
import {
  createWorkbenchOverlayIntentPreload,
  scheduleDeferredWorkbenchTask,
  WORKBENCH_AUTH_BOOTSTRAP_DELAY_MS,
} from "./workbench/workbench-preload";

const loadWorkbenchOverlays = () => import("./workbench/workbench-overlays");
const WorkbenchOverlays = dynamic(
  () => loadWorkbenchOverlays().then((module) => module.WorkbenchOverlays),
  { ssr: false },
);

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const [pendingFixedSlot, setPendingFixedSlot] = useState<number | null>(null);
  const [pendingTemplateSlotId, setPendingTemplateSlotId] = useState<
    string | null
  >(null);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isLayoutsOpen, setIsLayoutsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [hasMountedOverlays, setHasMountedOverlays] = useState(false);
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
  const [canCacheLocalFiles, setCanCacheLocalFiles] = useState(() =>
    isLocalFileCacheSupported(),
  );
  const [largeLocalByteCachePrompt, setLargeLocalByteCachePrompt] =
    useState<LocalFileByteCacheConfirmation | null>(null);
  const [localCacheStorageFullStatus, setLocalCacheStorageFullStatus] =
    useState<LocalFileCacheStorageStatus | null>(null);
  const [localCacheStatus, setLocalCacheStatus] =
    useState<LocalFileCacheStorageStatus | null>(null);
  const preloadWorkbenchOverlays = useMemo(
    () => createWorkbenchOverlayIntentPreload(loadWorkbenchOverlays),
    [],
  );
  const showWorkbenchOverlays = useCallback(() => {
    preloadWorkbenchOverlays();
    setHasMountedOverlays(true);
  }, [preloadWorkbenchOverlays]);
  const largeLocalByteCacheResolverRef = useRef<
    ((confirmed: boolean) => void) | null
  >(null);
  const registryRef = useRef<LocalObjectUrlRegistry | null>(null);
  const freeGridRef = useRef<HTMLDivElement | null>(null);

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
  const isClearDisabled = sessions.length === 0 && templateSlots.length === 0;
  const hasAdvancingTimers = useMemo(
    () => hasActiveSessionTimers(sessions),
    [sessions],
  );
  const layerStats = useMemo(
    () => deriveLayerStats({ layers, sessions }),
    [layers, sessions],
  );
  const openWorkspaceStats = useMemo(
    () =>
      Object.fromEntries(
        workspaceTabs.map((tab) => {
          const tabSessions =
            tab.id === activeWorkspaceId
              ? sessions
              : (workspaceStates[tab.id]?.sessions ??
                savedWorkspaces[tab.id]?.sessions ??
                []);

          return [
            tab.id,
            {
              sourceCount: tabSessions.length,
              fileCount: tabSessions.reduce(
                (count, session) => count + sessionFileCount(session),
                0,
              ),
            },
          ];
        }),
      ),
    [
      activeWorkspaceId,
      savedWorkspaces,
      sessions,
      workspaceStates,
      workspaceTabs,
    ],
  );
  const currentLayoutHasLocalSources = sessions.some(
    (session) => session.sourceConfig.kind === "local",
  );
  const cloudBlockReason = cloudSaveBlockReason({
    account,
    usage: cloudUsage,
    hasLocalSources: currentLayoutHasLocalSources,
    isTemplate: layoutMode === "free" && saveKind === "template",
  });
  const rememberVideoPosition = useCallback((key: string, seconds: number) => {
    setVideoPositions((current) => {
      if (current[key] === seconds) return current;
      return { ...current, [key]: seconds };
    });
  }, []);
  const confirmLargeLocalByteCache = useCallback(
    (confirmation: LocalFileByteCacheConfirmation) =>
      new Promise<boolean>((resolve) => {
        largeLocalByteCacheResolverRef.current = resolve;
        showWorkbenchOverlays();
        setLargeLocalByteCachePrompt(confirmation);
      }),
    [showWorkbenchOverlays],
  );
  const answerLargeLocalByteCachePrompt = useCallback((confirmed: boolean) => {
    largeLocalByteCacheResolverRef.current?.(confirmed);
    largeLocalByteCacheResolverRef.current = null;
    setLargeLocalByteCachePrompt(null);
  }, []);
  const refreshLocalCacheStatus = useCallback(async () => {
    const status = formatLocalFileCacheStorageStatus(
      await estimateLocalFileCacheStorage(),
    );
    setLocalCacheStatus(status);
    return status;
  }, []);
  const refreshLocalCacheStatusForCurrentLayout = useCallback(async () => {
    if (!sessions.some((session) => session.sourceConfig.kind === "local")) {
      setLocalCacheStatus(null);
      return null;
    }

    return refreshLocalCacheStatus();
  }, [refreshLocalCacheStatus, sessions]);
  const clearLocalCache = useCallback(async () => {
    await clearLocalFileCache();
    setLocalCacheStorageFullStatus(null);
    await refreshLocalCacheStatus();
  }, [refreshLocalCacheStatus]);
  const setLocalCacheStorageFullStatusWithOverlay = useCallback(
    (status: LocalFileCacheStorageStatus | null) => {
      if (status) showWorkbenchOverlays();
      setLocalCacheStorageFullStatus(status);
    },
    [showWorkbenchOverlays],
  );
  const setCloudShareTargetWithOverlay = useCallback(
    (target: SetStateAction<CloudShareTarget | null>) => {
      if (typeof target !== "function" && target) {
        showWorkbenchOverlays();
      }
      setCloudShareTarget(target);
    },
    [showWorkbenchOverlays],
  );
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
  const openSourcePanelWithOverlay = useCallback(
    (fixedSlot?: number | null, templateSlotId?: string | null) => {
      showWorkbenchOverlays();
      openSourcePanel(fixedSlot, templateSlotId);
    },
    [openSourcePanel, showWorkbenchOverlays],
  );
  const openEditSourceWithOverlay = useCallback(
    (id: string) => {
      showWorkbenchOverlays();
      openEditSource(id);
    },
    [openEditSource, showWorkbenchOverlays],
  );
  const {
    openSaveDialog,
    saveLayoutAs,
    saveTemplateAs,
    createWorkspaceTab,
    selectWorkspace,
    beginWorkspaceRename,
    commitWorkspaceRename,
    closeWorkspaceTab,
    openSavedWorkspaces,
    openSavedTemplates,
    deleteSavedWorkspace,
    deleteSavedTemplate,
    exportCurrentWorkspaceJson,
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
    updateFreeRect,
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

  useEffect(() => {
    const registry = registryRef;
    return () => registry.current?.revokeAll();
  }, []);

  useEffect(() => {
    writeStoredSaveTarget(saveTarget);
  }, [saveTarget]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCanCacheLocalFiles(isLocalFileCacheSupported());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!getSupabaseEnv()) {
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    function bootstrapAccount() {
      void createLazySupabaseBrowserClient()
        .then((supabase) => {
          if (!isMounted) return;

          void supabase.auth
            .getUser()
            .then(({ data: { user } }) => {
              if (isMounted) setAccount(accountStateFromUser(user));
            })
            .catch(() => {
              if (isMounted) setAccount({ status: "signed-out" });
            });

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted)
              setAccount(accountStateFromUser(session?.user ?? null));
          });
          unsubscribe = () => subscription.unsubscribe();
        })
        .catch(() => {
          if (isMounted) setAccount({ status: "signed-out" });
        });
    }

    const shouldBootstrapImmediately =
      new URLSearchParams(window.location.search).get("signedIn") === "1";
    const cancelBootstrap = shouldBootstrapImmediately
      ? (bootstrapAccount(), () => undefined)
      : scheduleDeferredWorkbenchTask(
          bootstrapAccount,
          WORKBENCH_AUTH_BOOTSTRAP_DELAY_MS,
        );

    return () => {
      isMounted = false;
      cancelBootstrap();
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signedIn") !== "1") return;

    params.delete("signedIn");
    const nextSearch = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`,
    );
    toast.success("Signed in");
  }, []);

  useEffect(() => {
    let frame: number | undefined;

    if (account.status === "signed-in") {
      const refreshFrame = window.requestAnimationFrame(() => {
        void refreshCloudLibrary(true);
      });
      return () => window.cancelAnimationFrame(refreshFrame);
    }

    if (account.status === "signed-out") {
      frame = window.requestAnimationFrame(() => {
        setCloudWorkspaces({});
        setCloudTemplates({});
        setCloudUsage({ status: "signed-out" });
      });
    }

    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [account.status, refreshCloudLibrary]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const bootstrap = restoreWorkspaceBootstrap(initialWorkspace);

      setSavedTemplates(bootstrap.savedTemplates);
      if (
        !bootstrap.savedWorkspaces ||
        !bootstrap.workspaceTabs ||
        !bootstrap.workspaceStates ||
        !bootstrap.activeWorkspace
      ) {
        return;
      }

      setWorkspaceTabs(bootstrap.workspaceTabs);
      setSavedWorkspaces(bootstrap.savedWorkspaces);
      setWorkspaceStates(bootstrap.workspaceStates);
      setActiveWorkspaceId(bootstrap.activeWorkspace.id);
      applyWorkspaceSnapshot(bootstrap.activeWorkspace);
      writeWorkspaceSessionStore(
        bootstrap.workspaceTabs,
        bootstrap.activeWorkspace.id,
        bootstrap.savedWorkspaces,
      );
    });

    return () => window.cancelAnimationFrame(frame);
    // localStorage workspace bootstrap is intentionally one-shot on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasAdvancingTimers) return;

    const interval = window.setInterval(() => {
      setSessions((current) => advanceSessionTimers(current));
    }, 250);

    return () => window.clearInterval(interval);
  }, [hasAdvancingTimers]);

  useEffect(() => {
    if (!freeDrag) return;
    const drag = freeDrag;

    function onPointerMove(event: PointerEvent) {
      updateFreeDrag(event, drag);
    }

    function onPointerUp() {
      commitFreeDrag(drag);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    // Free drag installs pointer listeners only while a drag is active.
    // `updateFreeRect` is a hoisted component helper and intentionally omitted
    // so pointer listeners do not churn during every drag render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeDrag]);

  useEffect(() => {
    if (!isUiHidden) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUiHidden(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isUiHidden]);

  useEffect(() => {
    const visibleUnresolvedUrlSessions = visibleUrlRuntimeHydrationCandidates({
      sessions,
      visibility: {
        activeLayerId,
        layoutMode,
        visibleFixedCells,
      },
    });

    if (!visibleUnresolvedUrlSessions.length) return;

    void hydrateRuntimeItems(visibleUnresolvedUrlSessions);
    // URL hydration is intentionally tied to visibility state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayerId, layoutMode, visibleFixedCells, sessions]);

  const activeKeyboardSessionId = maximizedId ?? selected?.id ?? null;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const direction = keyboardTimerMoveDirection(event);
      if (!direction || !activeKeyboardSessionId) {
        return;
      }

      event.preventDefault();
      setSessions((current) =>
        moveActiveKeyboardSessionTimer({
          sessions: current,
          activeSessionId: activeKeyboardSessionId,
          direction,
        }),
      );
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeKeyboardSessionId]);

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

  const moveSelectedSource = useCallback(
    (direction: 1 | -1) => {
      if (!selected) return;
      updateSession(selected.id, (session) => ({
        ...session,
        timer: moveTimerIndex(session.timer, direction),
      }));
    },
    [selected, updateSession],
  );

  const toggleSelectedSourcePaused = useCallback(() => {
    if (!selected) return;
    updateSession(selected.id, (session) => ({
      ...session,
      timer: togglePaused(session.timer),
    }));
  }, [selected, updateSession]);

  const restartSelectedSource = useCallback(() => {
    if (!selected) return;
    updateSession(selected.id, (session) => ({
      ...session,
      timer: { ...session.timer, elapsedMs: 0 },
    }));
  }, [selected, updateSession]);

  const setSelectedTimerMode = useCallback(
    (mode: FeedSession["timerMode"]) => {
      if (selected) setViewTimerMode(selected.id, mode);
    },
    [selected, setViewTimerMode],
  );

  const setSelectedTimerSeconds = useCallback(
    (seconds: number) => {
      if (selected) setViewTimerSeconds(selected.id, seconds);
    },
    [selected, setViewTimerSeconds],
  );

  useEffect(() => {
    if (!isUiHidden) return;

    let timeoutId: number | undefined;

    function revealTemporarily() {
      setIsUiRevealVisible(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(
        () => setIsUiRevealVisible(false),
        HIDDEN_UI_REVEAL_TIMEOUT_MS,
      );
    }

    revealTemporarily();
    window.addEventListener("pointermove", revealTemporarily);
    window.addEventListener("pointerdown", revealTemporarily);
    window.addEventListener("touchstart", revealTemporarily);
    window.addEventListener("keydown", revealTemporarily);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("pointermove", revealTemporarily);
      window.removeEventListener("pointerdown", revealTemporarily);
      window.removeEventListener("touchstart", revealTemporarily);
      window.removeEventListener("keydown", revealTemporarily);
    };
  }, [isUiHidden]);

  return (
    <main
      className={cn(
        "grid h-dvh grid-rows-[1fr] overflow-hidden bg-background text-foreground",
        (isUiHidden || maximizedId) && "select-none",
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

      {shouldMountOverlays ? (
        <WorkbenchOverlays
          isSourceOpen={isSourceOpen}
          onSourceOpenChange={(open) => {
            setIsSourceOpen(open);
            if (!open) {
              setPendingFixedSlot(null);
              setPendingTemplateSlotId(null);
            }
          }}
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
          uploadWorkspaceToCloud={uploadWorkspaceToCloud}
          uploadTemplateToCloud={uploadTemplateToCloud}
          shareCloudItem={shareCloudItem}
          regenerateCloudShareLink={regenerateCloudShareLink}
          disableCloudShareLink={disableCloudShareLink}
          exportSavedJson={exportSavedJson}
          importSavedJson={importSavedJson}
          workspaceTabs={workspaceTabs}
          openWorkspaceStats={openWorkspaceStats}
          activeWorkspaceId={activeWorkspaceId}
          selectWorkspace={selectWorkspace}
          createWorkspaceTab={createWorkspaceTab}
          closeWorkspaceTab={closeWorkspaceTab}
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
        maximized={maximized ?? null}
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
          selected={selected ?? null}
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
