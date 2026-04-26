"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { accountStateFromUser } from "./workbench/account-actions";
import { isLocalFileCacheSupported } from "@/lib/local-uploads/file-cache";
import type { LocalObjectUrlRegistry } from "@/lib/local-uploads/object-urls";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";
import { DEFAULT_FIXED_GRID, type FixedGrid } from "@/lib/viewer/layout";
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
import { createId, limitLayoutName } from "./workbench/helpers";
import { visibleUrlRuntimeHydrationCandidates } from "./workbench/runtime-hydration-actions";
import {
  activeLayerFreeRects as deriveActiveLayerFreeRects,
  availableSeparateSourceSlots as deriveAvailableSeparateSourceSlots,
  deriveLayerStats,
  hiddenFixedSessions as deriveHiddenFixedSessions,
  selectedActiveLayerSession,
  visibleFixedEmptySlots,
} from "./workbench/selection-state";
import { useSourceRuntimeHandlers } from "./workbench/source-runtime-handlers";
import { HiddenUiRevealButton } from "./workbench/hidden-ui-reveal-button";
import {
  restoreWorkspaceBootstrap,
  writeWorkspaceSessionStore,
} from "./workbench/workspace-state";
import { useWorkspaceHandlers } from "./workbench/workspace-handler-actions";
import { useLayoutHandlers } from "./workbench/layout-handler-actions";
import {
  HIDDEN_UI_REVEAL_TIMEOUT_MS,
  advanceSessionTimers,
  keyboardTimerMoveDirection,
  moveActiveKeyboardSessionTimer,
} from "./workbench/workbench-effect-state";
import { WorkbenchHeader } from "./workbench/workbench-header";
import { WorkbenchOverlays } from "./workbench/workbench-overlays";
import { WorkbenchStage } from "./workbench/workbench-stage";

export function FeedWorkbench({
  initialWorkspaceId = FALLBACK_INITIAL_WORKSPACE_ID,
}: {
  initialWorkspaceId?: string;
} = {}) {
  const initialWorkspace = useMemo(
    () => ({ id: initialWorkspaceId, name: "Layout 1" }),
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
  const [layers, setLayers] = useState<WorkspaceLayer[]>([
    { id: "layer-1", name: "Layer 1" },
  ]);
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
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
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
  const hiddenFixedSessions = useMemo(
    () =>
      deriveHiddenFixedSessions({
        sessions,
        activeLayerId,
        layoutMode,
        visibleFixedCells,
      }),
    [activeLayerId, layoutMode, sessions, visibleFixedCells],
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
  const layerStats = useMemo(
    () =>
      deriveLayerStats({
        layers,
        sessions,
      }),
    [layers, sessions],
  );
  const accountButtonLabel =
    account.status === "signed-in" ? "Account" : "Sign in";
  const accountButtonTitle =
    account.status === "signed-in" ? account.email : accountButtonLabel;
  const isClearDisabled =
    hasHydrated && sessions.length === 0 && templateSlots.length === 0;
  const rememberVideoPosition = useCallback((key: string, seconds: number) => {
    setVideoPositions((current) => {
      if (current[key] === seconds) return current;
      return { ...current, [key]: seconds };
    });
  }, []);
  const {
    fetchRedditFeed,
    openUrlSource,
    addLocalFiles,
    addDroppedLocalFiles,
    allowLocalFileDrop,
    replaceLocalSessionFiles,
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
    applyWorkspaceSnapshot,
  } = useWorkspaceHandlers({
    workspaceName,
    saveName,
    activeWorkspaceId,
    workspaceTabs,
    workspaceStates,
    savedWorkspaces,
    savedTemplates,
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
    setSaveName,
    setSaveKind,
    setSaveError,
    setIsSaveOpen,
    setIsLayoutsOpen,
    setWorkspaceTabs,
    setWorkspaceStates,
    setSavedWorkspaces,
    setSavedTemplates,
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
    addLayer,
    selectLayer,
    deleteActiveLayer,
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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHasHydrated(true));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const registry = registryRef;
    return () => registry.current?.revokeAll();
  }, []);

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
    const supabase = createSupabaseBrowserClient();

    supabase.auth
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
      if (isMounted) setAccount(accountStateFromUser(session?.user ?? null));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
    const interval = window.setInterval(() => {
      setSessions((current) => advanceSessionTimers(current));
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

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
        "grid h-dvh overflow-hidden bg-background text-foreground",
        isUiHidden ? "grid-rows-[1fr]" : "grid-rows-[auto_1fr]",
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
      ) : (
        <WorkbenchHeader
          layoutMode={layoutMode}
          layoutModeLocked={layoutModeLocked}
          fixedGrid={fixedGrid}
          globalSeconds={globalSeconds}
          hasRunningSessionTimer={sessions.some(
            (session) => !session.timer.isPaused,
          )}
          showCloneButton={canCloneOrFillSelectedSource}
          showFillButton={canCloneOrFillSelectedSource}
          showAllInfo={showAllInfo}
          isClearDisabled={isClearDisabled}
          accountButtonLabel={accountButtonLabel}
          accountButtonTitle={accountButtonTitle}
          workspaceTabs={workspaceTabs}
          activeWorkspaceId={activeWorkspaceId}
          editingWorkspaceId={editingWorkspaceId}
          editingWorkspaceName={editingWorkspaceName}
          maxLayoutNameLength={MAX_LAYOUT_NAME_LENGTH}
          onLayoutModeChange={changeLayoutMode}
          onFixedGridChange={updateFixedGrid}
          onGlobalTimerSecondsChange={setGlobalTimerSeconds}
          onGlobalTimerAction={runGlobalAction}
          onCloneSelectedSource={cloneSelectedSource}
          onFillSelectedSourceSpace={fillSelectedSourceSpace}
          onToggleShowAllInfo={() => setShowAllInfo((current) => !current)}
          onHideUi={() => {
            setIsUiRevealVisible(true);
            setIsUiHidden(true);
          }}
          onAddSource={() => openSourcePanel()}
          onOpenLayouts={() => setIsLayoutsOpen(true)}
          onOpenSaveDialog={openSaveDialog}
          onOpenClearDialog={() => setIsClearOpen(true)}
          onOpenAccount={() => setIsAccountOpen(true)}
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
      )}

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
        addDroppedLocalFiles={addDroppedLocalFiles}
        allowLocalFileDrop={allowLocalFileDrop}
        isLayoutsOpen={isLayoutsOpen}
        setIsLayoutsOpen={setIsLayoutsOpen}
        savedWorkspaces={savedWorkspaces}
        savedTemplates={savedTemplates}
        openSavedWorkspaces={openSavedWorkspaces}
        openSavedTemplates={openSavedTemplates}
        deleteSavedWorkspace={deleteSavedWorkspace}
        deleteSavedTemplate={deleteSavedTemplate}
        isSaveOpen={isSaveOpen}
        setIsSaveOpen={setIsSaveOpen}
        saveName={saveName}
        layoutMode={layoutMode}
        saveKind={saveKind}
        saveError={saveError}
        setSaveName={setSaveName}
        setSaveError={setSaveError}
        setSaveKind={setSaveKind}
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
        signOut={signOut}
      />

      <WorkbenchStage
        maximized={maximized ?? null}
        sessions={sessions}
        galleryIndexes={galleryIndexes}
        videoPositions={videoPositions}
        isUiHidden={isUiHidden}
        showAllInfo={showAllInfo}
        setMaximizedId={setMaximizedId}
        changeGallery={changeGallery}
        rememberVideoPosition={rememberVideoPosition}
        updateSession={updateSession}
        setViewTimerMode={setViewTimerMode}
        setViewTimerSeconds={setViewTimerSeconds}
        replaceLocalSessionFiles={replaceLocalSessionFiles}
        openEditSource={openEditSource}
        selected={selected ?? null}
        layoutMode={layoutMode}
        layers={layers}
        activeLayerId={activeLayerId}
        layerStats={layerStats}
        hiddenFixedSessionCount={hiddenFixedSessions.length}
        selectLayer={selectLayer}
        addLayer={addLayer}
        deleteActiveLayer={deleteActiveLayer}
        updateFreeRect={updateFreeRect}
        fixedGrid={fixedGrid}
        visibleFixedCells={visibleFixedCells}
        selectedId={selectedId}
        openSourcePanel={openSourcePanel}
        setSelectedId={setSelectedId}
        removeSession={removeSession}
        freeGridRef={freeGridRef}
        templateSlots={templateSlots}
        freeDrag={freeDrag}
        removeTemplateSlot={removeTemplateSlot}
        beginFreeDrag={beginFreeDrag}
      />
    </main>
  );
}
