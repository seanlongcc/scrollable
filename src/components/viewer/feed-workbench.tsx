"use client";

import {
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  Globe,
  Grid2X2,
  Info,
  Layers,
  LayoutGrid,
  MoveHorizontal,
  MoveVertical,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  SkipForward,
  Trash2,
  UnfoldHorizontal,
  UnfoldVertical,
  UserCircle,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { SiteLogo } from "@/components/site-logo";
import { Button } from "@/components/ui/button";
import { NumberField } from "./workbench/fields";
import {
  AccountDialog,
  ClearLayoutDialog,
  LayoutDialog,
  SaveLayoutDialog,
  accountStateFromUser,
} from "./workbench/dialogs";
import { EditSourceDialog, SourceDialog } from "./workbench/source-dialogs";
import { FixedGridView, FocusLayout, FreeGridView } from "./workbench/views";
import type { RuntimeFeedItem } from "@/lib/feed/types";
import { isLocalFileCacheSupported } from "@/lib/local-uploads/file-cache";
import type { LocalObjectUrlRegistry } from "@/lib/local-uploads/object-urls";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Json } from "@/lib/supabase/database.types";
import type {
  UrlRuntimeResolution,
  UrlSourceConfig,
} from "@/lib/url-source/types";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FIXED_GRID,
  FREE_LAYOUT_SIZE,
  type FixedGrid,
  type FreeRect,
  countAvailableFreeUnitRects,
  createFixedGrid,
  createFreeRect,
  findAvailableFreeRectsBySize,
  findBestAvailableFreeRects,
  validateFreeRects,
} from "@/lib/viewer/layout";
import {
  createEmptyWorkspace,
  MAX_WORKSPACE_LAYERS,
  normalizeWorkspaceLayers,
} from "@/lib/viewer/workspaces";
import {
  advanceTimerState,
  applyGlobalDuration,
  createTimerState,
  globalMoveTimerIndexes,
  globalRestartTimers,
  globalTogglePaused,
  moveTimerIndex,
  syncTimerToGlobal,
  togglePaused,
  type TimerMode,
} from "@/lib/viewer/timer";
import type {
  AccountState,
  FeedSession,
  FreeDragState,
  LayoutMode,
  PersistedSourceConfig,
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
  buildSubredditListingUrls,
  clamp,
  createId,
  hasDuplicateLayoutName,
  hasDuplicateTemplateName,
  hashRedditItemId,
  isKeyboardEditingTarget,
  keyMoveDirection,
  limitLayoutName,
  nextFixedSlot,
  nextLayoutName,
  normalizeRedditLimit,
  redditHiddenItemHashes,
  redditLinksTitle,
  sessionFileCount,
  splitRedditUrls,
  toMultiTimerState,
  toRuntimeWorkspace,
  toRuntimeWorkspaceWithLocalRuntime,
  uniqueWorkspaceName,
  workspaceFromTemplate,
} from "./workbench/helpers";
import {
  applyLocalRuntimeItemsToSession,
  cacheLocalFiles as cacheLocalFilesForWorkbench,
  createLocalRuntimeItems as createLocalRuntimeItemsForWorkbench,
  createLocalSessionSources,
  filesFromDataTransfer,
  getUploadableFiles,
} from "./workbench/local-sources";
import {
  applyRuntimeHydrationResults,
  createRedditSessionSources,
  fetchRedditRuntimeItems,
  fetchUrlRuntimeItemsForSource,
  filterHiddenRedditItems,
  hydrateRuntimeSources,
  runtimeHydrationCandidates,
} from "./workbench/runtime-sources";
import {
  createCurrentWorkspaceState,
  persistTemplateSnapshot,
  persistWorkspaceSnapshot,
  restoreWorkspaceBootstrap,
  workspaceSnapshotToState,
  writeWorkspaceSessionStore,
  writeWorkspaceStore,
  writeWorkspaceTemplateStore,
} from "./workbench/workspace-state";

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
  const activeLayerSessions = useMemo(
    () => sessions.filter((session) => session.layerId === activeLayerId),
    [activeLayerId, sessions],
  );
  const activeLayerTemplateSlots = useMemo(
    () =>
      templateSlots.filter(
        (slot) => (slot.layerId ?? activeLayerId) === activeLayerId,
      ),
    [activeLayerId, templateSlots],
  );
  const activeLayerFreeRects = useMemo(
    () => [
      ...activeLayerSessions.map((session) => session.freeRect),
      ...activeLayerTemplateSlots.map((slot) => slot.freeRect),
    ],
    [activeLayerSessions, activeLayerTemplateSlots],
  );
  const layoutModeLocked = sessions.length > 0 || templateSlots.length > 0;
  const selected = useMemo(
    () =>
      activeLayerSessions.find((session) => session.id === selectedId) ??
      activeLayerSessions[0],
    [activeLayerSessions, selectedId],
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
      layoutMode === "fixed"
        ? activeLayerSessions.filter(
            (session) => session.fixedSlot >= visibleFixedCells,
          )
        : [],
    [activeLayerSessions, layoutMode, visibleFixedCells],
  );
  const visibleEmptySlots = useMemo(() => {
    const occupied = new Set(
      activeLayerSessions.map((session) => session.fixedSlot),
    );
    return Array.from(
      { length: visibleFixedCells },
      (_, index) => index,
    ).filter((slot) => !occupied.has(slot));
  }, [activeLayerSessions, visibleFixedCells]);
  const availableSeparateSourceSlots = useMemo(
    () =>
      layoutMode === "fixed"
        ? visibleEmptySlots.length
        : countAvailableFreeUnitRects(activeLayerFreeRects) +
          (pendingTemplateSlotId ? 1 : 0),
    [
      activeLayerFreeRects,
      layoutMode,
      pendingTemplateSlotId,
      visibleEmptySlots,
    ],
  );
  const layerStats = useMemo(
    () =>
      layers.map((layer) => {
        const layerSessions = sessions.filter(
          (session) => session.layerId === layer.id,
        );

        return {
          ...layer,
          sourceCount: layerSessions.length,
          fileCount: layerSessions.reduce(
            (count, session) => count + sessionFileCount(session),
            0,
          ),
        };
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
      setSessions((current) =>
        current.map((session) => ({
          ...session,
          timer: advanceTimerState(session.timer, 250),
        })),
      );
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!freeDrag) return;
    const drag = freeDrag;

    function onPointerMove(event: PointerEvent) {
      const deltaColumns = Math.round(
        (event.clientX - drag.startX) / drag.cellWidth,
      );
      const deltaRows = Math.round(
        (event.clientY - drag.startY) / drag.cellHeight,
      );
      const nextRect =
        drag.mode === "move"
          ? {
              ...drag.startRect,
              column: clamp(
                drag.startRect.column + deltaColumns,
                1,
                FREE_LAYOUT_SIZE + 1 - drag.startRect.columnSpan,
              ),
              row: clamp(
                drag.startRect.row + deltaRows,
                1,
                FREE_LAYOUT_SIZE + 1 - drag.startRect.rowSpan,
              ),
            }
          : {
              ...drag.startRect,
              columnSpan: clamp(
                drag.startRect.columnSpan + deltaColumns,
                1,
                FREE_LAYOUT_SIZE + 1 - drag.startRect.column,
              ),
              rowSpan: clamp(
                drag.startRect.rowSpan + deltaRows,
                1,
                FREE_LAYOUT_SIZE + 1 - drag.startRect.row,
              ),
            };

      setFreeDrag((current) =>
        current && current.id === drag.id
          ? { ...current, currentRect: nextRect }
          : current,
      );
    }

    function onPointerUp() {
      if (drag.targetType === "template-slot") {
        updateTemplateSlotRect(drag.id, drag.currentRect);
      } else {
        updateFreeRect(drag.id, drag.currentRect);
      }
      setFreeDrag(null);
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
    const visibleUnresolvedUrlSessions = sessions.filter(
      (session) =>
        session.sourceConfig.kind === "url" &&
        session.isRuntimeLoading &&
        session.items.length === 0 &&
        !session.urlResolution &&
        isSessionVisibleForUrlHydration(session),
    );

    if (!visibleUnresolvedUrlSessions.length) return;

    void hydrateRuntimeItems(visibleUnresolvedUrlSessions);
    // URL hydration is intentionally tied to visibility state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayerId, layoutMode, visibleFixedCells, sessions]);

  const activeKeyboardSessionId = maximizedId ?? selected?.id ?? null;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const direction = keyMoveDirection(event.key);
      if (
        !direction ||
        !activeKeyboardSessionId ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isKeyboardEditingTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      setSessions((current) =>
        current.map((session) =>
          session.id === activeKeyboardSessionId
            ? { ...session, timer: moveTimerIndex(session.timer, direction) }
            : session,
        ),
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
      timeoutId = window.setTimeout(() => setIsUiRevealVisible(false), 1800);
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

  async function fetchRedditFeed() {
    setIsLoading(true);
    try {
      const urls =
        redditInputMode === "subreddit"
          ? buildSubredditListingUrls(
              subredditName,
              redditSort,
              redditTimeRange,
            )
          : splitRedditUrls(redditUrls);
      const selectedRedditLimit = normalizeRedditLimit(redditLimit);

      if (
        sourceGroupingMode === "separate" &&
        urls.length > availableSeparateSourceSlots
      ) {
        toast.error(
          `Only ${availableSeparateSourceSlots} source slot${
            availableSeparateSourceSlots === 1 ? "" : "s"
          } available`,
        );
        return;
      }

      const sources = await createRedditSessionSources({
        urls,
        limit: selectedRedditLimit,
        sourceGroupingMode,
      });

      addSessions(sources);
      setIsSourceOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Reddit fetch failed",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function openUrlSource() {
    setIsLoading(true);
    try {
      const sourceConfig: UrlSourceConfig = {
        kind: "url",
        url: urlValue.trim(),
        ...(urlTitle.trim() ? { title: urlTitle.trim() } : {}),
      };
      const result = await fetchUrlRuntimeItemsForSource(sourceConfig);

      addSession({
        title: result.title,
        sourceConfig: result.sourceConfig,
        items: result.items,
        allItems: result.allItems,
        urlResolution: result.urlResolution,
      });
      setIsSourceOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "URL source failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function addLocalFiles(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = Array.from(event.target.files ?? []);
    await addLocalFileList(files, () => {
      input.value = "";
    });
  }

  async function addDroppedLocalFiles(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    await addLocalFileList(await filesFromDataTransfer(event.dataTransfer));
  }

  function allowLocalFileDrop(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  async function addLocalFileList(files: File[], onSettled?: () => void) {
    const uploadableFiles = getUploadableFiles(files);

    if (
      sourceGroupingMode === "separate" &&
      uploadableFiles.length > availableSeparateSourceSlots
    ) {
      toast.error(
        `Only ${availableSeparateSourceSlots} source slot${
          availableSeparateSourceSlots === 1 ? "" : "s"
        } available`,
      );
      onSettled?.();
      return;
    }

    const items = createLocalRuntimeItems(uploadableFiles);

    if (!items.length) {
      onSettled?.();
      return;
    }

    setIsLoading(true);

    try {
      const sources = await createLocalSessionSources({
        files: uploadableFiles,
        items,
        sourceGroupingMode,
        cacheFiles: cacheLocalFiles,
      });

      addSessions(sources);

      setIsSourceOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Local file cache failed",
      );
    } finally {
      setIsLoading(false);
      onSettled?.();
    }
  }

  async function replaceLocalSessionFiles(
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const input = event.target;
    const files = getUploadableFiles(Array.from(event.target.files ?? []));
    const items = createLocalRuntimeItems(files);
    input.value = "";

    if (!items.length) return;

    try {
      applyLocalRuntimeItems(id, items, await cacheLocalFiles(files), files);
    } catch (error) {
      updateSession(id, (current) => ({ ...current, isRuntimeLoading: false }));
      toast.error(
        error instanceof Error ? error.message : "Local file cache failed",
      );
    }
  }

  async function cacheLocalFiles(files: File[]) {
    return cacheLocalFilesForWorkbench({
      files,
      canCacheLocalFiles,
      createCacheSetId: createId,
      onCacheRejected: () =>
        toast.warning("Local files will need reload after refresh"),
    });
  }

  function applyLocalRuntimeItems(
    id: string,
    items: RuntimeFeedItem[],
    cacheSetId?: string,
    files?: File[],
  ) {
    updateSession(id, (session) =>
      applyLocalRuntimeItemsToSession({ session, items, cacheSetId, files }),
    );
  }

  function createLocalRuntimeItems(files: File[]) {
    return createLocalRuntimeItemsForWorkbench(files, registryRef);
  }

  function addSession({
    title,
    items,
    allItems,
    urlResolution,
    localFiles,
    sourceConfig,
  }: {
    title: string;
    items: RuntimeFeedItem[];
    allItems?: RuntimeFeedItem[];
    urlResolution?: UrlRuntimeResolution;
    localFiles?: File[];
    sourceConfig: PersistedSourceConfig;
  }) {
    addSessions([
      { title, items, allItems, urlResolution, localFiles, sourceConfig },
    ]);
  }

  function addSessions(
    sources: Array<{
      title: string;
      items: RuntimeFeedItem[];
      allItems?: RuntimeFeedItem[];
      urlResolution?: UrlRuntimeResolution;
      localFiles?: File[];
      sourceConfig: PersistedSourceConfig;
    }>,
  ) {
    setSessions((current) => {
      const next = [...current];
      const pendingTemplateSlot = pendingTemplateSlotId
        ? templateSlots.find((slot) => slot.id === pendingTemplateSlotId)
        : null;
      const occupiedRects = [
        ...next
          .filter((session) => session.layerId === activeLayerId)
          .map((session) => session.freeRect),
        ...templateSlots
          .filter(
            (slot) =>
              (slot.layerId ?? activeLayerId) === activeLayerId &&
              slot.id !== pendingTemplateSlot?.id,
          )
          .map((slot) => slot.freeRect),
      ];
      let preferredSlot = pendingFixedSlot;
      let selectedSessionId: string | null = null;
      let consumedTemplateSlotId: string | null = null;

      for (const [index, source] of sources.entries()) {
        const freeRect =
          index === 0 && pendingTemplateSlot
            ? pendingTemplateSlot.freeRect
            : findBestAvailableFreeRects(occupiedRects, 1)[0];

        if (!freeRect) {
          toast.error("No space left in free layout");
          break;
        }

        const id = createId();
        const fixedSlot = nextFixedSlot(
          next.filter((session) => session.layerId === activeLayerId),
          preferredSlot,
        );
        preferredSlot = null;
        selectedSessionId = id;
        next.push({
          id,
          title: source.title,
          layerId: activeLayerId,
          timerMode: "global" as TimerMode,
          timer: createTimerState({
            durationSeconds: globalSeconds,
            itemCount: source.items.length,
          }),
          fixedSlot,
          freeRect,
          items: source.items,
          allItems: source.allItems,
          urlResolution: source.urlResolution,
          localFiles: source.localFiles,
          templateSlotId:
            index === 0 && pendingTemplateSlot
              ? pendingTemplateSlot.id
              : undefined,
          sourceConfig: source.sourceConfig,
        });
        occupiedRects.push(freeRect);
        if (index === 0 && pendingTemplateSlot) {
          consumedTemplateSlotId = pendingTemplateSlot.id;
        }
      }

      if (selectedSessionId) {
        setSelectedId(selectedSessionId);
        setPendingFixedSlot(null);
        setPendingTemplateSlotId(null);
        if (consumedTemplateSlotId) {
          setTemplateSlots((currentSlots) =>
            currentSlots.filter((slot) => slot.id !== consumedTemplateSlotId),
          );
        }
      }

      return next.sort((first, second) => first.fixedSlot - second.fixedSlot);
    });
  }

  function openSourcePanel(
    fixedSlot: number | null = null,
    templateSlotId: string | null = null,
  ) {
    setPendingFixedSlot(fixedSlot);
    setPendingTemplateSlotId(templateSlotId);
    resetSourceInputs();
    setIsSourceOpen(true);
  }

  function resetSourceInputs() {
    setUrlValue("");
    setUrlTitle("");
    setRedditUrls("");
    setSubredditName("");
    setRedditInputMode("subreddit");
    setRedditSort("top");
    setRedditTimeRange("week");
    setRedditLimit(DEFAULT_REDDIT_MEDIA_LIMIT);
  }

  function openEditSource(id: string) {
    setEditingSourceId(id);
  }

  function updateFixedGrid(next: Partial<FixedGrid>) {
    try {
      setFixedGrid((current) =>
        createFixedGrid(
          next.columns ?? current.columns,
          next.rows ?? current.rows,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid grid");
    }
  }

  function changeLayoutMode(nextMode: LayoutMode) {
    if (layoutModeLocked && nextMode !== layoutMode) {
      toast.error("Clear sources and template boxes before switching layouts");
      return;
    }

    setLayoutMode(nextMode);
  }

  function updateSession(
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) {
    setSessions((current) =>
      current.map((session) =>
        session.id === id ? updater(session) : session,
      ),
    );
  }

  async function saveRedditSourceEdit(
    id: string,
    urls: string[],
    limit: number,
    hiddenItemIds: string[],
    unhiddenItemHashes: string[],
  ) {
    if (!urls.length) {
      toast.error("Keep at least one Reddit source");
      return;
    }

    const selectedRedditLimit = normalizeRedditLimit(limit);
    updateSession(id, (session) => ({ ...session, isRuntimeLoading: true }));

    try {
      const currentSource = sessions.find((session) => session.id === id);
      const existingHiddenHashes =
        currentSource?.sourceConfig.kind === "reddit"
          ? redditHiddenItemHashes(currentSource.sourceConfig)
          : [];
      const unhidden = new Set(unhiddenItemHashes);
      const addedHiddenHashes = await Promise.all(
        hiddenItemIds.map((itemId) => hashRedditItemId(itemId)),
      );
      const hiddenItemIdHashes = Array.from(
        new Set([
          ...existingHiddenHashes.filter((hash) => !unhidden.has(hash)),
          ...addedHiddenHashes,
        ]),
      );
      const allItems = await fetchRedditRuntimeItems(urls, selectedRedditLimit);
      const items = await filterHiddenRedditItems(allItems, hiddenItemIdHashes);
      updateSession(id, (session) => {
        const timer = createTimerState({
          durationSeconds: session.timer.durationSeconds,
          itemCount: items.length,
        });

        return {
          ...session,
          title: redditLinksTitle(urls, allItems),
          items,
          allItems,
          localFiles: undefined,
          isRuntimeLoading: false,
          sourceConfig: {
            kind: "reddit",
            urls,
            limit: selectedRedditLimit,
            allowNsfw: true,
            ...(hiddenItemIdHashes.length ? { hiddenItemIdHashes } : {}),
          },
          timer: {
            ...timer,
            isPaused: session.timer.isPaused,
          },
        };
      });
      setEditingSourceId(null);
    } catch (error) {
      updateSession(id, (session) => ({ ...session, isRuntimeLoading: false }));
      toast.error(
        error instanceof Error ? error.message : "Reddit fetch failed",
      );
    }
  }

  async function saveUrlSourceEdit(id: string, url: string, title?: string) {
    updateSession(id, (session) => ({ ...session, isRuntimeLoading: true }));

    try {
      const currentSource = sessions.find((session) => session.id === id);
      const currentConfig =
        currentSource?.sourceConfig.kind === "url"
          ? currentSource.sourceConfig
          : null;
      const sourceConfig: UrlSourceConfig = {
        kind: "url",
        url,
        ...(title?.trim() ? { title: title.trim() } : {}),
        ...(currentConfig?.resolverHint
          ? { resolverHint: currentConfig.resolverHint }
          : {}),
      };
      const result = await fetchUrlRuntimeItemsForSource(sourceConfig);

      updateSession(id, (session) => {
        const timer = createTimerState({
          durationSeconds: session.timer.durationSeconds,
          itemCount: result.items.length,
        });

        return {
          ...session,
          title: result.title,
          items: result.items,
          allItems: result.allItems,
          urlResolution: result.urlResolution,
          localFiles: undefined,
          isRuntimeLoading: false,
          sourceConfig: result.sourceConfig,
          timer: {
            ...timer,
            isPaused: session.timer.isPaused,
          },
        };
      });
      setEditingSourceId(null);
    } catch (error) {
      updateSession(id, (session) => ({ ...session, isRuntimeLoading: false }));
      toast.error(error instanceof Error ? error.message : "URL source failed");
    }
  }

  async function saveLocalSourceEdit(id: string, files: File[]) {
    const uploadableFiles = getUploadableFiles(files);

    if (!uploadableFiles.length) {
      toast.error("Keep at least one local file");
      return;
    }

    try {
      const items = createLocalRuntimeItems(uploadableFiles);
      applyLocalRuntimeItems(
        id,
        items,
        await cacheLocalFiles(uploadableFiles),
        uploadableFiles,
      );
      setEditingSourceId(null);
    } catch (error) {
      updateSession(id, (session) => ({ ...session, isRuntimeLoading: false }));
      toast.error(
        error instanceof Error ? error.message : "Local file cache failed",
      );
    }
  }

  function removeSession(id: string) {
    const removed = sessions.find((session) => session.id === id);
    setSessions((current) => current.filter((session) => session.id !== id));
    if (removed?.templateSlotId && layoutMode === "free") {
      setTemplateSlots((current) => {
        if (current.some((slot) => slot.id === removed.templateSlotId)) {
          return current;
        }

        return [
          ...current,
          {
            id: removed.templateSlotId!,
            layerId: removed.layerId,
            freeRect: removed.freeRect,
          },
        ];
      });
    }
    setGalleryIndexes((current) => {
      const next = { ...current };
      removed?.items.forEach((item) => delete next[item.id]);
      return next;
    });
    setVideoPositions((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(`${id}:`)),
      ),
    );
    if (selectedId === id) setSelectedId(null);
    if (maximizedId === id) setMaximizedId(null);
  }

  function updateFreeRect(
    id: string,
    nextRect: Partial<FreeRect>,
    showError = true,
  ) {
    setSessions((current) => {
      const session = current.find((candidate) => candidate.id === id);
      if (!session) return current;

      try {
        const rect = createFreeRect({ ...session.freeRect, ...nextRect });
        validateFreeRects([
          ...current
            .filter(
              (candidate) =>
                candidate.id !== id && candidate.layerId === session.layerId,
            )
            .map((candidate) => candidate.freeRect),
          ...templateSlots
            .filter(
              (slot) => (slot.layerId ?? session.layerId) === session.layerId,
            )
            .map((slot) => slot.freeRect),
          rect,
        ]);

        return current.map((candidate) =>
          candidate.id === id ? { ...candidate, freeRect: rect } : candidate,
        );
      } catch (error) {
        if (showError) {
          toast.error(
            error instanceof Error ? error.message : "Invalid free layout",
          );
        }
        return current;
      }
    });
  }

  function updateTemplateSlotRect(
    id: string,
    nextRect: Partial<FreeRect>,
    showError = true,
  ) {
    setTemplateSlots((current) => {
      const slot = current.find((candidate) => candidate.id === id);
      if (!slot) return current;

      const layerId = slot.layerId ?? activeLayerId;

      try {
        const rect = createFreeRect({ ...slot.freeRect, ...nextRect });
        validateFreeRects([
          ...sessions
            .filter((session) => session.layerId === layerId)
            .map((session) => session.freeRect),
          ...current
            .filter(
              (candidate) =>
                candidate.id !== id &&
                (candidate.layerId ?? layerId) === layerId,
            )
            .map((candidate) => candidate.freeRect),
          rect,
        ]);

        return current.map((candidate) =>
          candidate.id === id
            ? { ...candidate, layerId, freeRect: rect }
            : candidate,
        );
      } catch (error) {
        if (showError) {
          toast.error(
            error instanceof Error ? error.message : "Invalid free layout",
          );
        }
        return current;
      }
    });
  }

  function removeTemplateSlot(id: string) {
    setTemplateSlots((current) =>
      current.filter((candidate) => candidate.id !== id),
    );
    if (pendingTemplateSlotId === id) setPendingTemplateSlotId(null);
  }

  function beginFreeDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    target: { id: string; freeRect: FreeRect },
    mode: "move" | "resize",
    targetType: FreeDragState["targetType"] = "session",
  ) {
    const bounds = freeGridRef.current?.getBoundingClientRect();
    if (!bounds) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedId(targetType === "session" ? target.id : null);
    setFreeDrag({
      id: target.id,
      targetType,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      cellWidth: bounds.width / FREE_LAYOUT_SIZE,
      cellHeight: bounds.height / FREE_LAYOUT_SIZE,
      startRect: target.freeRect,
      currentRect: target.freeRect,
    });
  }

  function changeGallery(itemId: string, direction: 1 | -1) {
    const item = sessions
      .flatMap((session) => session.items)
      .find((candidate) => candidate.id === itemId);
    if (!item) return;

    setGalleryIndexes((state) => {
      const current = state[itemId] ?? 0;
      const next =
        (current + direction + item.media.length) % item.media.length;
      return { ...state, [itemId]: next };
    });
  }

  function setGlobalTimerSeconds(value: number) {
    const durationSeconds = clamp(value, 1, 120);
    setGlobalSeconds(durationSeconds);
    const timers = applyGlobalDuration(
      toMultiTimerState(sessions),
      durationSeconds,
    );
    setSessions((current) =>
      current.map((session) => ({
        ...session,
        timer: timers[session.id]?.timer ?? session.timer,
      })),
    );
  }

  function setViewTimerSeconds(id: string, value: number) {
    updateSession(id, (session) => ({
      ...session,
      timerMode: "local",
      timer: {
        ...session.timer,
        durationSeconds: clamp(value, 1, 120),
        elapsedMs: 0,
      },
    }));
  }

  function setViewTimerMode(id: string, mode: TimerMode) {
    const globalTimer =
      sessions.find(
        (session) => session.id !== id && session.timerMode === "global",
      )?.timer ?? null;

    updateSession(id, (session) => ({
      ...session,
      timerMode: mode,
      timer:
        mode === "global"
          ? syncTimerToGlobal(session.timer, globalTimer, globalSeconds)
          : session.timer,
    }));
  }

  function runGlobalAction(action: "next" | "pause" | "restart") {
    const timers = toMultiTimerState(sessions);
    const nextTimers =
      action === "next"
        ? globalMoveTimerIndexes(timers, 1)
        : action === "pause"
          ? globalTogglePaused(timers)
          : globalRestartTimers(timers);

    setSessions((current) =>
      current.map((session) => ({
        ...session,
        timer: nextTimers[session.id]?.timer ?? session.timer,
      })),
    );
  }

  function fillVisibleCells() {
    if (!selected || !visibleEmptySlots.length || !selected.items.length)
      return;

    setSessions((current) => {
      const sourceSession = current.find(
        (session) => session.id === selected.id,
      );
      if (!sourceSession?.items.length) return current;
      const layerSessions = current.filter(
        (session) => session.layerId === sourceSession.layerId,
      );

      let cloneIndex = 0;
      const emptySlots = Array.from(
        { length: visibleFixedCells },
        (_, index) => index,
      ).filter(
        (slot) => !layerSessions.some((session) => session.fixedSlot === slot),
      );
      const freeRects = findAvailableFreeRectsBySize(
        layerSessions.map((session) => session.freeRect),
        emptySlots.length,
        {
          columnSpan: sourceSession.freeRect.columnSpan,
          rowSpan: sourceSession.freeRect.rowSpan,
        },
      );
      const clones = emptySlots.flatMap((fixedSlot, index) => {
        const freeRect = freeRects[index];
        if (!freeRect) return [];

        cloneIndex += 1;
        const id = createId();
        const timer = createTimerState({
          durationSeconds: sourceSession.timer.durationSeconds,
          itemCount: sourceSession.items.length,
        });

        return {
          ...sourceSession,
          id,
          fixedSlot,
          freeRect,
          timer: {
            ...timer,
            activeIndex:
              sourceSession.items.length > 0
                ? (sourceSession.timer.activeIndex + cloneIndex) %
                  sourceSession.items.length
                : 0,
          },
          templateSlotId: undefined,
        };
      });

      return [...current, ...clones].sort(
        (first, second) => first.fixedSlot - second.fixedSlot,
      );
    });
  }

  function addLayer() {
    if (layers.length >= MAX_WORKSPACE_LAYERS) return;

    const id = createId();
    const name = `Layer ${layers.length + 1}`;
    setLayers((current) => [...current, { id, name }]);
    setActiveLayerId(id);
    setSelectedId(null);
    setMaximizedId(null);
    setPendingFixedSlot(null);
    setPendingTemplateSlotId(null);
  }

  function selectLayer(id: string) {
    setActiveLayerId(id);
    const nextSelected = sessions.find((session) => session.layerId === id);
    setSelectedId(nextSelected?.id ?? null);
    setMaximizedId(null);
    setPendingFixedSlot(null);
    setPendingTemplateSlotId(null);
  }

  function deleteActiveLayer() {
    if (layers.length <= 1) return;

    const deleteIndex = layers.findIndex((layer) => layer.id === activeLayerId);
    const nextLayers = normalizeWorkspaceLayers(
      layers.filter((layer) => layer.id !== activeLayerId),
    );
    const nextActiveLayer =
      nextLayers[Math.min(deleteIndex, nextLayers.length - 1)] ?? nextLayers[0];

    setLayers(nextLayers);
    setSessions((current) =>
      current.filter((session) => session.layerId !== activeLayerId),
    );
    setTemplateSlots((current) =>
      current.filter(
        (slot) => (slot.layerId ?? activeLayerId) !== activeLayerId,
      ),
    );
    setGalleryIndexes((current) => {
      const removedItemIds = new Set(
        sessions
          .filter((session) => session.layerId === activeLayerId)
          .flatMap((session) => session.items.map((item) => item.id)),
      );
      return Object.fromEntries(
        Object.entries(current).filter(
          ([itemId]) => !removedItemIds.has(itemId),
        ),
      );
    });
    setVideoPositions((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => {
          const sessionId = key.split(":")[0];
          return !sessions.some(
            (session) =>
              session.id === sessionId && session.layerId === activeLayerId,
          );
        }),
      ),
    );
    setActiveLayerId(nextActiveLayer.id);
    setSelectedId(
      sessions.find((session) => session.layerId === nextActiveLayer.id)?.id ??
        null,
    );
    setMaximizedId(null);
    setPendingFixedSlot(null);
    setPendingTemplateSlotId(null);
  }

  function clearCurrentLayout() {
    setSessions([]);
    setTemplateSlots([]);
    setGalleryIndexes({});
    setVideoPositions({});
    setSelectedId(null);
    setMaximizedId(null);
    setPendingFixedSlot(null);
    setPendingTemplateSlotId(null);
    setIsClearOpen(false);
  }

  async function signOut() {
    if (!getSupabaseEnv()) {
      setAccount({ status: "unconfigured" });
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setAccount({ status: "signed-out" });
      toast.success("Signed out");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign out failed");
    }
  }

  function openSaveDialog() {
    setSaveName(limitLayoutName(workspaceName));
    setSaveKind("layout");
    setSaveError(null);
    setIsSaveOpen(true);
  }

  async function saveLayoutAs() {
    const nextName = saveName.trim();

    if (!nextName) {
      setSaveError("Layout name is required");
      return;
    }

    if (nextName.length > MAX_LAYOUT_NAME_LENGTH) {
      setSaveError(
        `Layout name must be ${MAX_LAYOUT_NAME_LENGTH} characters or fewer`,
      );
      return;
    }

    if (
      hasDuplicateLayoutName(
        nextName,
        activeWorkspaceId,
        workspaceTabs,
        savedWorkspaces,
      )
    ) {
      setSaveError("Layout names must be unique");
      return;
    }

    const nextTabs = workspaceTabs.map((tab) =>
      tab.id === activeWorkspaceId ? { ...tab, name: nextName } : tab,
    );
    const { store } = persistCurrentWorkspace(nextName, nextTabs);
    let syncedToAccount = false;

    if (getSupabaseEnv()) {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { error } = await supabase.from("viewer_sessions").upsert(
            store.workspaces.map((workspace) => ({
              id: workspace.id,
              owner_id: user.id,
              name: workspace.name,
              layout_mode: workspace.layoutMode,
              fixed_columns: workspace.fixedGrid.columns,
              fixed_rows: workspace.fixedGrid.rows,
              global_timer_seconds: workspace.globalTimerSeconds,
              sessions: workspace.sessions as unknown as Json,
              updated_at: new Date().toISOString(),
            })),
          );

          if (error) throw error;
          syncedToAccount = true;
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Account sync failed",
        );
      }
    }

    toast.success(
      syncedToAccount
        ? "Layout saved locally and to account"
        : "Layout saved locally",
    );
    setIsSaveOpen(false);
  }

  async function saveTemplateAs() {
    const nextName = saveName.trim();

    if (layoutMode !== "free") {
      setSaveError("Templates are only available for free layouts");
      return;
    }

    if (!nextName) {
      setSaveError("Template name is required");
      return;
    }

    if (nextName.length > MAX_LAYOUT_NAME_LENGTH) {
      setSaveError(
        `Template name must be ${MAX_LAYOUT_NAME_LENGTH} characters or fewer`,
      );
      return;
    }

    if (hasDuplicateTemplateName(nextName, activeWorkspaceId, savedTemplates)) {
      setSaveError("Template names must be unique");
      return;
    }

    const { store } = persistCurrentTemplate(nextName);
    let syncedToAccount = false;

    if (getSupabaseEnv()) {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { error } = await supabase.from("viewer_templates").upsert(
            store.templates.map((template) => ({
              id: template.id,
              owner_id: user.id,
              name: template.name,
              layers: template.layers as unknown as Json,
              active_layer_id: template.activeLayerId,
              global_timer_seconds: template.globalTimerSeconds,
              slots: template.slots as unknown as Json,
              updated_at: new Date().toISOString(),
            })),
          );

          if (error) throw error;
          syncedToAccount = true;
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Template sync failed",
        );
      }
    }

    toast.success(
      syncedToAccount
        ? "Template saved locally and to account"
        : "Template saved locally",
    );
    setIsSaveOpen(false);
  }

  function persistCurrentWorkspace(
    nameOverride = workspaceName,
    tabsOverride = workspaceTabs,
  ) {
    const current = currentWorkspaceState(nameOverride);
    const { snapshot, nextSaved, store } = persistWorkspaceSnapshot(
      current,
      savedWorkspaces,
    );
    const nextStates = { ...workspaceStates, [current.id]: current };
    setWorkspaceTabs(tabsOverride);
    setWorkspaceStates(nextStates);
    setSavedWorkspaces(nextSaved);
    writeWorkspaceSessionStore(tabsOverride, current.id, nextSaved);
    return { snapshot, store };
  }

  function persistCurrentTemplate(nameOverride = workspaceName) {
    const current = currentWorkspaceState(nameOverride);
    const { snapshot, nextTemplates, store } = persistTemplateSnapshot(
      current,
      savedTemplates,
      templateSlots,
    );
    const nextStates = { ...workspaceStates, [current.id]: current };
    setWorkspaceStates(nextStates);
    setSavedTemplates(nextTemplates);
    return { snapshot, store };
  }

  function currentWorkspaceState(
    nameOverride = workspaceName,
  ): RuntimeWorkspace {
    return createCurrentWorkspaceState({
      activeWorkspaceId,
      name: nameOverride,
      layers,
      activeLayerId,
      layoutMode,
      fixedGrid,
      globalSeconds,
      sessions,
      templateSlots,
    });
  }

  function createWorkspaceTab() {
    const current = currentWorkspaceState();
    const nextId = createId();
    const nextName = nextLayoutName(workspaceTabs, savedWorkspaces);
    const empty = toRuntimeWorkspace(createEmptyWorkspace(nextId, nextName));
    const nextTabs = [...workspaceTabs, { id: nextId, name: nextName }];
    const nextStates = {
      ...workspaceStates,
      [current.id]: current,
      [nextId]: empty,
    };

    setWorkspaceTabs(nextTabs);
    setWorkspaceStates(nextStates);
    setActiveWorkspaceId(nextId);
    applyWorkspaceSnapshot(empty);
    writeWorkspaceStore(savedWorkspaces, nextId);
    writeWorkspaceSessionStore(nextTabs, nextId, savedWorkspaces);
  }

  function selectWorkspace(id: string) {
    if (id === activeWorkspaceId) return;

    const current = currentWorkspaceState();
    const snapshot =
      workspaceStates[id] ??
      toRuntimeWorkspace(
        savedWorkspaces[id] ??
          createEmptyWorkspace(
            id,
            workspaceTabs.find((tab) => tab.id === id)?.name ?? "Layout",
          ),
      );
    const nextStates = {
      ...workspaceStates,
      [current.id]: current,
      [id]: snapshot,
    };

    setWorkspaceStates(nextStates);
    setActiveWorkspaceId(id);
    applyWorkspaceSnapshot(snapshot);
    writeWorkspaceStore(savedWorkspaces, id);
    writeWorkspaceSessionStore(workspaceTabs, id, savedWorkspaces);
  }

  function beginWorkspaceRename(tab: WorkspaceTab) {
    setEditingWorkspaceId(tab.id);
    setEditingWorkspaceName(limitLayoutName(tab.name));
  }

  function commitWorkspaceRename() {
    if (!editingWorkspaceId) return;

    const nextName = limitLayoutName(editingWorkspaceName).trim();
    if (!nextName) {
      setEditingWorkspaceId(null);
      return;
    }

    if (
      hasDuplicateLayoutName(
        nextName,
        editingWorkspaceId,
        workspaceTabs,
        savedWorkspaces,
      )
    ) {
      toast.error("Layout names must be unique");
      setEditingWorkspaceId(null);
      return;
    }

    const nextTabs = workspaceTabs.map((tab) =>
      tab.id === editingWorkspaceId ? { ...tab, name: nextName } : tab,
    );
    const current = currentWorkspaceState(
      editingWorkspaceId === activeWorkspaceId ? nextName : workspaceName,
    );
    const renamedWorkspace =
      editingWorkspaceId === activeWorkspaceId
        ? current
        : {
            ...(workspaceStates[editingWorkspaceId] ??
              toRuntimeWorkspace(
                savedWorkspaces[editingWorkspaceId] ??
                  createEmptyWorkspace(editingWorkspaceId, nextName),
              )),
            name: nextName,
          };
    const nextStates = {
      ...workspaceStates,
      [current.id]: current,
      [editingWorkspaceId]: renamedWorkspace,
    };
    setWorkspaceTabs(nextTabs);
    setWorkspaceStates(nextStates);
    setEditingWorkspaceId(null);
  }

  function closeWorkspaceTab(id: string) {
    const current = currentWorkspaceState();
    const statesWithCurrent = { ...workspaceStates, [current.id]: current };

    if (workspaceTabs.length <= 1) {
      const nextId = createId();
      const nextTab = { id: nextId, name: "Layout 1" };
      const empty = toRuntimeWorkspace(
        createEmptyWorkspace(nextId, nextTab.name),
      );
      const nextStates = { [nextId]: empty };

      setWorkspaceTabs([nextTab]);
      setWorkspaceStates(nextStates);
      setActiveWorkspaceId(nextId);
      applyWorkspaceSnapshot(empty);
      writeWorkspaceStore(savedWorkspaces, nextId);
      writeWorkspaceSessionStore([nextTab], nextId, savedWorkspaces);
      return;
    }

    const closingIndex = workspaceTabs.findIndex((tab) => tab.id === id);
    const nextTabs = workspaceTabs.filter((tab) => tab.id !== id);
    const nextActiveId =
      id === activeWorkspaceId
        ? (nextTabs[Math.max(0, closingIndex - 1)]?.id ?? nextTabs[0].id)
        : activeWorkspaceId;
    const nextStates = { ...statesWithCurrent };
    if (!savedWorkspaces[id]) {
      delete nextStates[id];
    }
    const nextSnapshot =
      nextStates[nextActiveId] ??
      toRuntimeWorkspace(
        savedWorkspaces[nextActiveId] ??
          createEmptyWorkspace(
            nextActiveId,
            nextTabs.find((tab) => tab.id === nextActiveId)?.name ?? "Layout",
          ),
      );

    setWorkspaceTabs(nextTabs);
    setWorkspaceStates({ ...nextStates, [nextActiveId]: nextSnapshot });
    setActiveWorkspaceId(nextActiveId);
    applyWorkspaceSnapshot(nextSnapshot);
    writeWorkspaceStore(savedWorkspaces, nextActiveId);
    writeWorkspaceSessionStore(nextTabs, nextActiveId, savedWorkspaces);
  }

  function openSavedWorkspaces(ids: string[]) {
    const snapshots = ids
      .map((id) => savedWorkspaces[id])
      .filter((workspace): workspace is SerializedWorkspace =>
        Boolean(workspace),
      );
    if (!snapshots.length) return;

    const current = currentWorkspaceState();
    const currentAwareStates = { ...workspaceStates, [current.id]: current };
    const nextTabs = [...workspaceTabs];
    const nextStates = { ...currentAwareStates };

    for (const snapshot of snapshots) {
      nextStates[snapshot.id] = toRuntimeWorkspaceWithLocalRuntime(
        snapshot,
        currentAwareStates[snapshot.id],
      );
      if (!nextTabs.some((tab) => tab.id === snapshot.id)) {
        nextTabs.push({ id: snapshot.id, name: snapshot.name });
      }
    }

    const activeId = snapshots[0].id;
    const activeSnapshot = nextStates[activeId];

    setWorkspaceTabs(nextTabs);
    setWorkspaceStates(nextStates);
    setActiveWorkspaceId(activeId);
    applyWorkspaceSnapshot(activeSnapshot);
    writeWorkspaceStore(savedWorkspaces, activeId);
    writeWorkspaceSessionStore(nextTabs, activeId, savedWorkspaces);
    setIsLayoutsOpen(false);
  }

  function openSavedTemplates(ids: string[]) {
    const templates = ids
      .map((id) => savedTemplates[id])
      .filter((template): template is SerializedWorkspaceTemplate =>
        Boolean(template),
      );
    if (!templates.length) return;

    const current = currentWorkspaceState();
    const currentAwareStates = { ...workspaceStates, [current.id]: current };
    const nextTabs = [...workspaceTabs];
    const nextStates = { ...currentAwareStates };
    let activeId = activeWorkspaceId;

    for (const template of templates) {
      const nextId = createId();
      const name = uniqueWorkspaceName(
        template.name,
        nextTabs,
        savedWorkspaces,
      );
      const workspace = workspaceFromTemplate(template, nextId, name);

      nextTabs.push({ id: nextId, name });
      nextStates[nextId] = workspace;
      activeId = nextId;
    }

    const activeSnapshot = nextStates[activeId];

    setWorkspaceTabs(nextTabs);
    setWorkspaceStates(nextStates);
    setActiveWorkspaceId(activeId);
    applyWorkspaceSnapshot(activeSnapshot);
    writeWorkspaceStore(savedWorkspaces, activeId);
    writeWorkspaceSessionStore(nextTabs, activeId, savedWorkspaces);
    setIsLayoutsOpen(false);
  }

  function deleteSavedWorkspace(id: string) {
    const nextSaved = { ...savedWorkspaces };
    const deleted = nextSaved[id];
    delete nextSaved[id];

    writeWorkspaceStore(nextSaved, activeWorkspaceId);
    setSavedWorkspaces(nextSaved);
    writeWorkspaceSessionStore(workspaceTabs, activeWorkspaceId, nextSaved);
    if (deleted) toast.success(`Deleted ${deleted.name}`);
  }

  function deleteSavedTemplate(id: string) {
    const nextTemplates = { ...savedTemplates };
    const deleted = nextTemplates[id];
    delete nextTemplates[id];

    writeWorkspaceTemplateStore(nextTemplates);
    setSavedTemplates(nextTemplates);
    if (deleted) toast.success(`Deleted ${deleted.name}`);
  }

  function applyWorkspaceSnapshot(
    snapshot: SerializedWorkspace | RuntimeWorkspace,
  ) {
    const nextState = workspaceSnapshotToState(snapshot);

    setLayers(nextState.layers);
    setActiveLayerId(nextState.activeLayerId);
    setLayoutMode(nextState.layoutMode);
    setFixedGrid(nextState.fixedGrid);
    setGlobalSeconds(nextState.globalSeconds);
    setTemplateSlots(nextState.templateSlots);
    setSessions(nextState.sessions);
    setGalleryIndexes({});
    setSelectedId(nextState.selectedId);
    setMaximizedId(null);
    setPendingTemplateSlotId(null);
    void hydrateRuntimeItems(nextState.sessions);
  }

  async function hydrateRuntimeItems(nextSessions: FeedSession[]) {
    const sessionsToHydrate = runtimeHydrationCandidates(
      nextSessions,
      isSessionVisibleForUrlHydration,
    );

    if (!sessionsToHydrate.length) return;

    const hydrated = await hydrateRuntimeSources({
      sessions: sessionsToHydrate,
      createLocalRuntimeItems,
      onError: (session, error) =>
        toast.error(
          error instanceof Error
            ? `Could not load ${session.title}: ${error.message}`
            : `Could not load ${session.title}`,
        ),
    });

    setSessions((current) => applyRuntimeHydrationResults(current, hydrated));
  }

  function isSessionVisibleForUrlHydration(session: FeedSession) {
    if (session.sourceConfig.kind !== "url") return true;
    if (session.layerId !== activeLayerId) return false;
    if (layoutMode !== "fixed") return true;

    return session.fixedSlot < visibleFixedCells;
  }

  return (
    <main
      className={cn(
        "grid h-dvh overflow-hidden bg-background text-foreground",
        isUiHidden ? "grid-rows-[1fr]" : "grid-rows-[auto_1fr]",
        (isUiHidden || maximizedId) && "select-none",
      )}
    >
      {isUiHidden ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            "fixed right-3 top-3 z-50 border-border bg-background/95 text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur transition-opacity duration-300",
            !isUiRevealVisible && "pointer-events-none opacity-0",
          )}
          onClick={() => {
            setIsUiRevealVisible(true);
            setIsUiHidden(false);
          }}
          onFocus={() => setIsUiRevealVisible(true)}
          aria-label="Show UI"
        >
          <Eye />
          Show UI
        </Button>
      ) : (
        <header className="border-b border-border bg-surface/95 px-3 pt-2 pb-0 shadow-[0_1px_0_rgba(255,255,255,0.025)] backdrop-blur md:px-4">
          <div className="grid gap-2 min-[1360px]:grid-cols-[minmax(21rem,1fr)_auto_minmax(12rem,1fr)] min-[1360px]:items-center">
            <div className="flex min-w-0 items-center justify-center min-[1360px]:justify-start">
              <SiteLogo />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                size="icon"
                variant={layoutMode === "fixed" ? "default" : "outline"}
                onClick={() => changeLayoutMode("fixed")}
                aria-label="Fixed layout mode"
                disabled={layoutModeLocked}
              >
                <Grid2X2 />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={layoutMode === "free" ? "default" : "outline"}
                onClick={() => changeLayoutMode("free")}
                aria-label="Free layout mode"
                disabled={layoutModeLocked}
              >
                <LayoutGrid />
              </Button>

              <NumberField
                label="Fixed columns"
                icon={<UnfoldHorizontal className="size-3.5" />}
                value={fixedGrid.columns}
                min={1}
                max={16}
                onChange={(value) => updateFixedGrid({ columns: value })}
              />
              <NumberField
                label="Fixed rows"
                icon={<UnfoldVertical className="size-3.5" />}
                value={fixedGrid.rows}
                min={1}
                max={16}
                onChange={(value) => updateFixedGrid({ rows: value })}
              />

              <div className="flex h-8 items-center gap-1 rounded-lg border border-border/70 bg-surface-elevated/70 px-1">
                <Globe className="size-3.5 text-primary" />
                <input
                  type="number"
                  value={globalSeconds}
                  min={1}
                  max={120}
                  onChange={(event) =>
                    setGlobalTimerSeconds(Number(event.target.value))
                  }
                  aria-label="Global timer seconds"
                  className="h-6 w-11 rounded-md border border-border/70 bg-background/70 px-1 text-center font-mono text-[11px] text-foreground outline-none focus-visible:border-primary"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => runGlobalAction("pause")}
                  aria-label="Global pause"
                >
                  {sessions.some((session) => !session.timer.isPaused) ? (
                    <Pause />
                  ) : (
                    <Play />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => runGlobalAction("next")}
                  aria-label="Global next"
                >
                  <SkipForward />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => runGlobalAction("restart")}
                  aria-label="Global restart"
                >
                  <RotateCcw />
                </Button>
              </div>

              {selected && visibleEmptySlots.length ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={fillVisibleCells}
                  aria-label="Duplicate selected source into empty cells"
                >
                  <Copy />
                  Duplicate
                </Button>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant={showAllInfo ? "default" : "outline"}
                aria-label={
                  showAllInfo ? "Hide source info" : "Show source info"
                }
                onClick={() => setShowAllInfo((current) => !current)}
              >
                <Info />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  setIsUiRevealVisible(true);
                  setIsUiHidden(true);
                }}
                aria-label="Hide UI"
              >
                <EyeOff />
              </Button>
              <Button
                type="button"
                aria-label="Add source"
                onClick={() => openSourcePanel()}
              >
                <Plus />
                Add source
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 min-[1360px]:justify-end">
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Open layouts"
                onClick={() => setIsLayoutsOpen(true)}
              >
                <FolderOpen />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={openSaveDialog}
                aria-label="Save layout"
              >
                <Save />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setIsClearOpen(true)}
                aria-label="Clear layout"
                disabled={isClearDisabled}
              >
                <Trash2 />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={accountButtonLabel}
                title={accountButtonTitle}
                onClick={() => setIsAccountOpen(true)}
              >
                <UserCircle />
              </Button>
            </div>
          </div>

          <div className="-mb-px mt-4 flex items-center gap-1 overflow-x-auto overflow-y-hidden pb-0">
            {workspaceTabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  "flex h-7 min-w-28 overflow-hidden rounded-t-lg border border-border/70 text-muted-foreground transition",
                  tab.id === activeWorkspaceId
                    ? "border-primary/50 bg-surface-elevated text-primary"
                    : "bg-surface-elevated/50 hover:bg-surface-elevated",
                )}
              >
                {editingWorkspaceId === tab.id ? (
                  <input
                    aria-label={`Rename ${tab.name}`}
                    value={editingWorkspaceName}
                    autoFocus
                    onChange={(event) =>
                      setEditingWorkspaceName(
                        limitLayoutName(event.target.value),
                      )
                    }
                    maxLength={MAX_LAYOUT_NAME_LENGTH}
                    onBlur={commitWorkspaceRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitWorkspaceRename();
                      if (event.key === "Escape") setEditingWorkspaceId(null);
                    }}
                    className="h-full min-w-0 flex-1 bg-background/70 px-2 text-left text-xs text-foreground outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => selectWorkspace(tab.id)}
                    onDoubleClick={() => beginWorkspaceRename(tab)}
                    title={`Open ${tab.name}`}
                    className="h-full min-w-0 flex-1 cursor-pointer px-3 text-left text-xs"
                  >
                    {tab.name}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => closeWorkspaceTab(tab.id)}
                  aria-label={`Close ${tab.name}`}
                  title={`Close ${tab.name}`}
                  className="grid h-full w-7 cursor-pointer place-items-center border-l border-border/70 text-muted-foreground transition hover:bg-surface-elevated hover:text-primary-hover"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              size="icon-xs"
              variant="outline"
              className="mb-1 self-start rounded-md border-border/70 bg-background/80 shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
              onClick={createWorkspaceTab}
              aria-label="New layout"
            >
              <Plus />
            </Button>
          </div>
        </header>
      )}

      <SourceDialog
        open={isSourceOpen}
        onOpenChange={(open) => {
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
      />
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

      {maximized ? (
        <FocusLayout
          focused={maximized}
          sessions={sessions}
          galleryIndexes={galleryIndexes}
          videoPositions={videoPositions}
          hideUi={isUiHidden}
          showInfo={showAllInfo}
          onRestore={() => setMaximizedId(null)}
          onFocus={setMaximizedId}
          onGalleryChange={changeGallery}
          onVideoPositionChange={rememberVideoPosition}
          onMove={(id, direction) =>
            updateSession(id, (session) => ({
              ...session,
              timer: moveTimerIndex(session.timer, direction),
            }))
          }
          onTogglePaused={(id) =>
            updateSession(id, (session) => ({
              ...session,
              timer: togglePaused(session.timer),
            }))
          }
          onRestart={(id) =>
            updateSession(id, (session) => ({
              ...session,
              timer: { ...session.timer, elapsedMs: 0 },
            }))
          }
          onTimerModeChange={setViewTimerMode}
          onTimerSecondsChange={setViewTimerSeconds}
          onLocalFilesSelected={replaceLocalSessionFiles}
          onEditSource={openEditSource}
        />
      ) : (
        <section
          className={cn(
            "grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3",
            isUiHidden ? "p-0" : "p-3",
          )}
        >
          {!isUiHidden ? (
            <div
              data-testid="layout-status-row"
              className="grid min-h-8 items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground md:justify-self-start">
                <span>
                  {sessions.length} source{sessions.length === 1 ? "" : "s"}{" "}
                  active · {layoutMode === "fixed" ? "Fixed" : "Free"} layout
                </span>
                <div
                  role="group"
                  aria-label="Layout layers"
                  className="flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-surface-elevated/70 p-1"
                >
                  <Layers className="size-3.5 text-primary" />
                  {layers.map((layer) => (
                    <Button
                      key={layer.id}
                      type="button"
                      size="sm"
                      variant={layer.id === activeLayerId ? "default" : "ghost"}
                      aria-label={`Select ${layer.name}`}
                      aria-pressed={layer.id === activeLayerId}
                      onClick={() => selectLayer(layer.id)}
                    >
                      {layer.name}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Add layer"
                    onClick={addLayer}
                    disabled={layers.length >= MAX_WORKSPACE_LAYERS}
                  >
                    <Plus />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete active layer"
                    onClick={deleteActiveLayer}
                    disabled={layers.length <= 1}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 text-[11px]">
                  {layerStats.map((layer) => (
                    <span
                      key={layer.id}
                      className={cn(
                        "rounded-full border border-border/70 bg-background/60 px-2 py-0.5",
                        layer.id === activeLayerId &&
                          "border-primary/50 text-primary",
                      )}
                    >
                      {layer.name}: {layer.sourceCount} source
                      {layer.sourceCount === 1 ? "" : "s"} / {layer.fileCount}{" "}
                      file{layer.fileCount === 1 ? "" : "s"}
                    </span>
                  ))}
                </div>
                {hiddenFixedSessions.length ? (
                  <span className="rounded-full border border-primary/35 bg-surface-elevated px-2 py-0.5 text-xs text-primary">
                    {hiddenFixedSessions.length} hidden source
                    {hiddenFixedSessions.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
              {selected && layoutMode === "free" ? (
                <div
                  role="group"
                  aria-label="Selected free layout controls"
                  className="flex flex-wrap justify-center gap-2 justify-self-center md:col-start-2"
                >
                  <NumberField
                    label="Free column"
                    icon={<MoveVertical className="size-3.5" />}
                    value={selected.freeRect.column}
                    min={1}
                    max={16}
                    onChange={(value) =>
                      updateFreeRect(selected.id, { column: value })
                    }
                  />
                  <NumberField
                    label="Free row"
                    icon={<MoveHorizontal className="size-3.5" />}
                    value={selected.freeRect.row}
                    min={1}
                    max={16}
                    onChange={(value) =>
                      updateFreeRect(selected.id, { row: value })
                    }
                  />
                  <NumberField
                    label="Column span"
                    icon={<UnfoldHorizontal className="size-3.5" />}
                    value={selected.freeRect.columnSpan}
                    min={1}
                    max={16}
                    onChange={(value) =>
                      updateFreeRect(selected.id, { columnSpan: value })
                    }
                  />
                  <NumberField
                    label="Row span"
                    icon={<UnfoldVertical className="size-3.5" />}
                    value={selected.freeRect.rowSpan}
                    min={1}
                    max={16}
                    onChange={(value) =>
                      updateFreeRect(selected.id, { rowSpan: value })
                    }
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            className={cn(
              "h-full min-h-0 overflow-auto border-border/70 bg-background bg-[linear-gradient(rgba(255,255,255,.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.008)_1px,transparent_1px)]",
              isUiHidden
                ? "rounded-none border-0 p-0"
                : "rounded-lg border p-2",
              layoutMode === "free" && "bg-[size:6.25%_6.25%]",
            )}
          >
            {layoutMode === "fixed" ? (
              <div
                className={cn(
                  "relative",
                  isUiHidden
                    ? "h-dvh min-h-0 min-w-0"
                    : "h-full min-h-[360px] min-w-0 md:min-w-[720px]",
                )}
              >
                {layers.map((layer) => {
                  const isActiveLayer = layer.id === activeLayerId;

                  return (
                    <div
                      key={layer.id}
                      aria-hidden={!isActiveLayer}
                      style={{
                        visibility: isActiveLayer ? "visible" : "hidden",
                      }}
                      className={cn(
                        isActiveLayer
                          ? "relative z-10 size-full"
                          : "pointer-events-none absolute inset-0 opacity-0",
                      )}
                    >
                      <FixedGridView
                        sessions={sessions.filter(
                          (session) => session.layerId === layer.id,
                        )}
                        visibleCells={visibleFixedCells}
                        fixedGrid={fixedGrid}
                        galleryIndexes={galleryIndexes}
                        videoPositions={videoPositions}
                        selectedId={isActiveLayer ? selectedId : null}
                        hideUi={isUiHidden || !isActiveLayer}
                        isPlaybackActive={isActiveLayer}
                        showInfo={isActiveLayer && showAllInfo}
                        openSourcePanel={openSourcePanel}
                        setSelectedId={setSelectedId}
                        setMaximizedId={setMaximizedId}
                        updateSession={updateSession}
                        removeSession={removeSession}
                        changeGallery={changeGallery}
                        onVideoPositionChange={rememberVideoPosition}
                        setViewTimerMode={setViewTimerMode}
                        setViewTimerSeconds={setViewTimerSeconds}
                        onLocalFilesSelected={replaceLocalSessionFiles}
                        onEditSource={openEditSource}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                ref={freeGridRef}
                className={cn(
                  "relative",
                  isUiHidden
                    ? "h-dvh min-h-0 min-w-0"
                    : "h-full min-h-[360px] min-w-0 md:min-w-[720px]",
                )}
              >
                {layers.map((layer) => {
                  const isActiveLayer = layer.id === activeLayerId;

                  return (
                    <div
                      key={layer.id}
                      aria-hidden={!isActiveLayer}
                      style={{
                        visibility: isActiveLayer ? "visible" : "hidden",
                      }}
                      className={cn(
                        isActiveLayer
                          ? "relative z-10 size-full"
                          : "pointer-events-none absolute inset-0 opacity-0",
                      )}
                    >
                      <FreeGridView
                        sessions={sessions.filter(
                          (session) => session.layerId === layer.id,
                        )}
                        templateSlots={templateSlots.filter(
                          (slot) => (slot.layerId ?? layer.id) === layer.id,
                        )}
                        galleryIndexes={galleryIndexes}
                        videoPositions={videoPositions}
                        selectedId={isActiveLayer ? selectedId : null}
                        hideUi={isUiHidden || !isActiveLayer}
                        isPlaybackActive={isActiveLayer}
                        showInfo={isActiveLayer && showAllInfo}
                        freeDrag={isActiveLayer ? freeDrag : null}
                        setSelectedId={setSelectedId}
                        setMaximizedId={setMaximizedId}
                        updateSession={updateSession}
                        removeSession={removeSession}
                        removeTemplateSlot={removeTemplateSlot}
                        openSourcePanel={openSourcePanel}
                        changeGallery={changeGallery}
                        onVideoPositionChange={rememberVideoPosition}
                        setViewTimerMode={setViewTimerMode}
                        setViewTimerSeconds={setViewTimerSeconds}
                        beginFreeDrag={beginFreeDrag}
                        onLocalFilesSelected={replaceLocalSessionFiles}
                        onEditSource={openEditSource}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
