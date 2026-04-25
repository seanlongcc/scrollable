"use client";

import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FolderOpen,
  Globe,
  GripHorizontal,
  Grid2X2,
  Info,
  Layers,
  LayoutGrid,
  Loader2,
  LogOut,
  Maximize2,
  Move,
  MoveHorizontal,
  MoveVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  SkipForward,
  Trash2,
  UnfoldHorizontal,
  UnfoldVertical,
  Upload,
  UserCircle,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  ComponentProps,
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { SiteLogo } from "@/components/site-logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FeedViewPane } from "@/components/viewer/feed-view-pane";
import type { RuntimeFeedItem } from "@/lib/feed/types";
import {
  isLocalFileCacheSupported,
  loadLocalFiles,
  saveLocalFiles,
} from "@/lib/local-uploads/file-cache";
import { LocalObjectUrlRegistry } from "@/lib/local-uploads/object-urls";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Json } from "@/lib/supabase/database.types";
import type {
  UrlResolverHint,
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
  WORKSPACE_STORAGE_KEY,
  type PersistedSourceConfig,
  type SerializedWorkspace,
  type WorkspaceLayer,
  type WorkspaceSessionInput,
  createEmptyWorkspace,
  DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS,
  MAX_WORKSPACE_LAYERS,
  parseWorkspaceStore,
  normalizeWorkspaceLayers,
  serializeWorkspace,
} from "@/lib/viewer/workspaces";
import {
  advanceTimerState,
  applyGlobalDuration,
  createTimerState,
  globalMoveTimerIndexes,
  globalRestartTimers,
  globalTogglePaused,
  moveTimerIndex,
  normalizeTimerMode,
  syncTimerToGlobal,
  togglePaused,
  type TimerMode,
  type TimerState,
} from "@/lib/viewer/timer";

type LayoutMode = "fixed" | "free";

type FeedSession = {
  id: string;
  title: string;
  layerId: string;
  timerMode: TimerMode;
  timer: TimerState;
  fixedSlot: number;
  freeRect: FreeRect;
  items: RuntimeFeedItem[];
  allItems?: RuntimeFeedItem[];
  urlResolution?: UrlRuntimeResolution;
  localFiles?: File[];
  isRuntimeLoading?: boolean;
  sourceConfig: PersistedSourceConfig;
};

type WorkspaceTab = {
  id: string;
  name: string;
};

type RuntimeWorkspace = Omit<SerializedWorkspace, "sessions"> & {
  sessions: WorkspaceSessionInput[];
};

type AccountState =
  | { status: "unconfigured" | "loading" | "signed-out" }
  | { status: "signed-in"; email: string };

type SourceGroupingMode = "stacked" | "separate";
type RedditInputMode = "subreddit" | "links";
type RedditListingSort = "hot" | "new" | "rising" | "top" | "controversial";
type RedditTimeRange = "day" | "week" | "month" | "year" | "all";

const DEFAULT_TIMER_SECONDS = DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS;
const DEFAULT_REDDIT_MEDIA_LIMIT = 10;
const MAX_REDDIT_MEDIA_LIMIT = 200;
const MAX_LAYOUT_NAME_LENGTH = 32;
const WORKSPACE_SESSION_STORAGE_KEY = "scrollable.workspace-session.v1";
const REDDIT_SORT_OPTIONS: Array<{ value: RedditListingSort; label: string }> =
  [
    { value: "hot", label: "Hot" },
    { value: "new", label: "New" },
    { value: "rising", label: "Rising" },
    { value: "top", label: "Top" },
    { value: "controversial", label: "Controversial" },
  ];
const REDDIT_TIME_OPTIONS: Array<{ value: RedditTimeRange; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

type FreeDragState = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  cellWidth: number;
  cellHeight: number;
  startRect: FreeRect;
  currentRect: FreeRect;
};

type DirectoryInputProps = ComponentProps<typeof Input> & {
  directory?: string;
  webkitdirectory?: string;
};

type FileSystemEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
};

type FileSystemFileEntryLike = FileSystemEntryLike & {
  file: (
    successCallback: (file: File) => void,
    errorCallback?: (error: DOMException) => void,
  ) => void;
};

type FileSystemDirectoryEntryLike = FileSystemEntryLike & {
  createReader: () => {
    readEntries: (
      successCallback: (entries: FileSystemEntryLike[]) => void,
      errorCallback?: (error: DOMException) => void,
    ) => void;
  };
};

type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntryLike | null;
};

type WorkspaceSessionStore = {
  openWorkspaceIds: string[];
  activeWorkspaceId: string;
};

const FALLBACK_INITIAL_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(
    null,
  );
  const [editingWorkspaceName, setEditingWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [isUiRevealVisible, setIsUiRevealVisible] = useState(true);
  const [showAllInfo, setShowAllInfo] = useState(false);
  const [sourceGroupingMode, setSourceGroupingMode] =
    useState<SourceGroupingMode>("stacked");
  const [freeDrag, setFreeDrag] = useState<FreeDragState | null>(null);
  const [canCacheLocalFiles, setCanCacheLocalFiles] = useState(false);
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
        : countAvailableFreeUnitRects(
            activeLayerSessions.map((session) => session.freeRect),
          ),
    [activeLayerSessions, layoutMode, visibleEmptySlots],
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
  const rememberVideoPosition = useCallback((key: string, seconds: number) => {
    setVideoPositions((current) => {
      if (current[key] === seconds) return current;
      return { ...current, [key]: seconds };
    });
  }, []);

  useEffect(() => {
    return () => registryRef.current?.revokeAll();
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
      const stored = parseWorkspaceStore(
        window.localStorage.getItem(WORKSPACE_STORAGE_KEY),
      );
      if (!stored?.workspaces.length) return;

      const normalizedWorkspaces = normalizeStoredLayoutNames(
        stored.workspaces.map((workspace) => ({
          ...workspace,
          name: normalizeLegacyLayoutName(workspace.name),
        })),
      );
      const nextSaved = Object.fromEntries(
        normalizedWorkspaces.map((workspace) => [workspace.id, workspace]),
      );
      const sessionStore = parseWorkspaceSessionStore(
        window.sessionStorage.getItem(WORKSPACE_SESSION_STORAGE_KEY),
      );
      const openSavedWorkspaces = normalizedWorkspaces.filter((workspace) =>
        sessionStore?.openWorkspaceIds.includes(workspace.id),
      );
      const blankTab = {
        id: initialWorkspace.id,
        name: nextLayoutName([], nextSaved),
      };
      const blankWorkspace = toRuntimeWorkspace(
        createEmptyWorkspace(blankTab.id, blankTab.name),
      );
      const restoredTabs = openSavedWorkspaces.map(({ id, name }) => ({
        id,
        name,
      }));
      const tabs = restoredTabs.length ? restoredTabs : [blankTab];
      const activeId = tabs.some(
        (tab) => tab.id === sessionStore?.activeWorkspaceId,
      )
        ? sessionStore!.activeWorkspaceId
        : tabs[0]!.id;
      const nextStates = {
        ...(restoredTabs.length ? {} : { [blankWorkspace.id]: blankWorkspace }),
        ...Object.fromEntries(
          openSavedWorkspaces.map((workspace) => [
            workspace.id,
            toRuntimeWorkspace(workspace),
          ]),
        ),
      };
      const activeWorkspace = nextStates[activeId] ?? blankWorkspace;

      setWorkspaceTabs(tabs);
      setSavedWorkspaces(nextSaved);
      setWorkspaceStates(nextStates);
      setActiveWorkspaceId(activeWorkspace.id);
      applyWorkspaceSnapshot(activeWorkspace);
      writeWorkspaceSessionStore(tabs, activeWorkspace.id, nextSaved);
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
      updateFreeRect(drag.id, drag.currentRect);
      setFreeDrag(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
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

      if (sourceGroupingMode === "separate") {
        const sources = await Promise.all(
          urls.map(async (url) => {
            const items = await fetchRedditRuntimeItems(
              [url],
              selectedRedditLimit,
            );

            return {
              title: redditLinksTitle([url], items),
              sourceConfig: {
                kind: "reddit" as const,
                urls: [url],
                limit: selectedRedditLimit,
                allowNsfw: true,
              },
              items,
              allItems: items,
            };
          }),
        );

        addSessions(sources);
      } else {
        const items = await fetchRedditRuntimeItems(urls, selectedRedditLimit);

        addSession({
          title: redditLinksTitle(urls, items),
          sourceConfig: {
            kind: "reddit",
            urls,
            limit: selectedRedditLimit,
            allowNsfw: true,
          },
          items,
          allItems: items,
        });
      }
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

    try {
      if (sourceGroupingMode === "separate") {
        const sources = await Promise.all(
          uploadableFiles.map(async (file, index) => {
            const cacheSetId = await cacheLocalFiles([file]);

            return {
              title: items[index].title,
              localFiles: [file],
              sourceConfig: {
                kind: "local" as const,
                fileCount: 1,
                ...(cacheSetId ? { cacheSetId } : {}),
              },
              items: [items[index]],
            };
          }),
        );

        addSessions(sources);
      } else {
        const cacheSetId = await cacheLocalFiles(uploadableFiles);

        addSession({
          title: "Local upload",
          sourceConfig: {
            kind: "local",
            fileCount: items.length,
            ...(cacheSetId ? { cacheSetId } : {}),
          },
          items,
          localFiles: uploadableFiles,
        });
      }

      setIsSourceOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Local file cache failed",
      );
    } finally {
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
    if (!canCacheLocalFiles || !files.length) return undefined;

    const cacheSetId = createId();
    try {
      await saveLocalFiles(cacheSetId, files);
      return cacheSetId;
    } catch {
      toast.warning("Local files will need reload after refresh");
      return undefined;
    }
  }

  function applyLocalRuntimeItems(
    id: string,
    items: RuntimeFeedItem[],
    cacheSetId?: string,
    files?: File[],
  ) {
    if (!items.length) {
      updateSession(id, (session) => ({ ...session, isRuntimeLoading: false }));
      return;
    }

    updateSession(id, (session) => {
      const timer = createTimerState({
        durationSeconds: session.timer.durationSeconds,
        itemCount: items.length,
      });

      return {
        ...session,
        title:
          session.sourceConfig.kind === "local" &&
          session.sourceConfig.fileCount === 1 &&
          items.length === 1
            ? items[0].title
            : session.title,
        items,
        localFiles: files,
        isRuntimeLoading: false,
        sourceConfig: {
          kind: "local",
          fileCount: items.length,
          ...(cacheSetId ? { cacheSetId } : {}),
        },
        timer: {
          ...timer,
          isPaused: session.timer.isPaused,
        },
      };
    });
  }

  function createLocalRuntimeItems(files: File[]) {
    if (!files.length) return [];
    if (registryRef.current === null) {
      registryRef.current = new LocalObjectUrlRegistry();
    }

    return files.map((file) => registryRef.current!.add(file));
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
      const freeRects = findBestAvailableFreeRects(
        next
          .filter((session) => session.layerId === activeLayerId)
          .map((session) => session.freeRect),
        sources.length,
      );
      let preferredSlot = pendingFixedSlot;
      let selectedSessionId: string | null = null;

      for (const [index, source] of sources.entries()) {
        const freeRect = freeRects[index];

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
          sourceConfig: source.sourceConfig,
        });
      }

      if (selectedSessionId) {
        setSelectedId(selectedSessionId);
        setPendingFixedSlot(null);
      }

      return next.sort((first, second) => first.fixedSlot - second.fixedSlot);
    });
  }

  function openSourcePanel(fixedSlot: number | null = null) {
    setPendingFixedSlot(fixedSlot);
    setIsSourceOpen(true);
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

  function beginFreeDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    session: FeedSession,
    mode: "move" | "resize",
  ) {
    const bounds = freeGridRef.current?.getBoundingClientRect();
    if (!bounds) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedId(session.id);
    setFreeDrag({
      id: session.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      cellWidth: bounds.width / FREE_LAYOUT_SIZE,
      cellHeight: bounds.height / FREE_LAYOUT_SIZE,
      startRect: session.freeRect,
      currentRect: session.freeRect,
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
  }

  function selectLayer(id: string) {
    setActiveLayerId(id);
    const nextSelected = sessions.find((session) => session.layerId === id);
    setSelectedId(nextSelected?.id ?? null);
    setMaximizedId(null);
    setPendingFixedSlot(null);
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
  }

  function clearCurrentLayout() {
    setSessions([]);
    setGalleryIndexes({});
    setVideoPositions({});
    setSelectedId(null);
    setMaximizedId(null);
    setPendingFixedSlot(null);
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

  function persistCurrentWorkspace(
    nameOverride = workspaceName,
    tabsOverride = workspaceTabs,
  ) {
    const current = currentWorkspaceState(nameOverride);
    const snapshot = serializeWorkspace(current);
    const nextStates = { ...workspaceStates, [current.id]: current };
    const nextSaved = { ...savedWorkspaces, [snapshot.id]: snapshot };
    const store = writeWorkspaceStore(nextSaved, current.id);
    setWorkspaceTabs(tabsOverride);
    setWorkspaceStates(nextStates);
    writeWorkspaceSessionStore(tabsOverride, current.id, nextSaved);
    return { snapshot, store };
  }

  function currentWorkspaceState(
    nameOverride = workspaceName,
  ): RuntimeWorkspace {
    return {
      id: activeWorkspaceId,
      name: nameOverride,
      layers,
      activeLayerId,
      layoutMode,
      fixedGrid,
      globalTimerSeconds: globalSeconds,
      updatedAt: new Date().toISOString(),
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        layerId: session.layerId,
        timerMode: normalizeTimerMode(session.timerMode),
        timerSeconds: session.timer.durationSeconds,
        timerActiveIndex: session.timer.activeIndex,
        fixedSlot: session.fixedSlot,
        freeRect: session.freeRect,
        sourceConfig: session.sourceConfig,
        runtimeItems: session.items,
        allRuntimeItems: session.allItems,
        urlResolution: session.urlResolution,
        localFiles: session.localFiles,
      })),
    };
  }

  function writeWorkspaceStore(
    workspaces: Record<string, SerializedWorkspace>,
    activeId: string,
  ) {
    const store = {
      activeWorkspaceId: activeId,
      workspaces: Object.values(workspaces),
    };

    setSavedWorkspaces(workspaces);
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(store));
    return store;
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

  function deleteSavedWorkspace(id: string) {
    const nextSaved = { ...savedWorkspaces };
    const deleted = nextSaved[id];
    delete nextSaved[id];

    writeWorkspaceStore(nextSaved, activeWorkspaceId);
    writeWorkspaceSessionStore(workspaceTabs, activeWorkspaceId, nextSaved);
    if (deleted) toast.success(`Deleted ${deleted.name}`);
  }

  function applyWorkspaceSnapshot(
    snapshot: SerializedWorkspace | RuntimeWorkspace,
  ) {
    const snapshotLayers = normalizeWorkspaceLayers(snapshot.layers);
    const snapshotActiveLayerId = snapshotLayers.some(
      (layer) => layer.id === snapshot.activeLayerId,
    )
      ? snapshot.activeLayerId
      : snapshotLayers[0].id;

    setLayers(snapshotLayers);
    setActiveLayerId(snapshotActiveLayerId);
    setLayoutMode(snapshot.layoutMode);
    setFixedGrid(snapshot.fixedGrid);
    setGlobalSeconds(resolveWorkspaceGlobalSeconds(snapshot));
    const nextSessions = snapshot.sessions.map((session) => {
      const items =
        "runtimeItems" in session ? (session.runtimeItems ?? []) : [];
      const allItems =
        "allRuntimeItems" in session
          ? (session.allRuntimeItems ?? items)
          : items;
      const urlResolution =
        "urlResolution" in session ? session.urlResolution : undefined;
      const activeIndex =
        items.length > 0
          ? clamp(session.timerActiveIndex ?? 0, 0, items.length - 1)
          : 0;
      const timer = createTimerState({
        durationSeconds: session.timerSeconds,
        itemCount: items.length,
      });

      return {
        id: session.id,
        title: session.title,
        layerId: session.layerId ?? snapshotActiveLayerId,
        timerMode: normalizeTimerMode(session.timerMode),
        timer: { ...timer, activeIndex },
        fixedSlot: session.fixedSlot,
        freeRect: session.freeRect,
        items,
        allItems,
        urlResolution,
        localFiles: "localFiles" in session ? session.localFiles : undefined,
        isRuntimeLoading:
          (session.sourceConfig.kind === "reddit" ||
            (session.sourceConfig.kind === "url" && !urlResolution) ||
            (session.sourceConfig.kind === "local" &&
              Boolean(session.sourceConfig.cacheSetId))) &&
          items.length === 0,
        sourceConfig: session.sourceConfig,
      };
    });

    setSessions(nextSessions);
    setGalleryIndexes({});
    setSelectedId(
      snapshot.sessions.find(
        (session) =>
          (session.layerId ?? snapshotActiveLayerId) === snapshotActiveLayerId,
      )?.id ?? null,
    );
    setMaximizedId(null);
    void hydrateRuntimeItems(nextSessions);
  }

  async function hydrateRuntimeItems(nextSessions: FeedSession[]) {
    const sessionsToHydrate = nextSessions.filter(
      (session) =>
        session.items.length === 0 &&
        (session.sourceConfig.kind === "reddit" ||
          (session.sourceConfig.kind === "url" &&
            !session.urlResolution &&
            isSessionVisibleForUrlHydration(session)) ||
          (session.sourceConfig.kind === "local" &&
            Boolean(session.sourceConfig.cacheSetId))),
    );

    if (!sessionsToHydrate.length) return;

    const hydrated = await Promise.all(
      sessionsToHydrate.map(async (session) => {
        try {
          const result =
            session.sourceConfig.kind === "reddit"
              ? {
                  ...(await fetchRuntimeItemsForSource(session.sourceConfig)),
                  localFiles: undefined,
                }
              : session.sourceConfig.kind === "url"
                ? {
                    ...(await fetchUrlRuntimeItemsForSource(
                      session.sourceConfig,
                    )),
                    localFiles: undefined,
                  }
                : await fetchLocalRuntimeItemsForSource(session.sourceConfig);
          return { id: session.id, ...result };
        } catch (error) {
          toast.error(
            error instanceof Error
              ? `Could not load ${session.title}: ${error.message}`
              : `Could not load ${session.title}`,
          );
          return {
            id: session.id,
            items: [] as RuntimeFeedItem[],
            allItems: undefined,
            urlResolution: undefined,
            localFiles: undefined,
          };
        }
      }),
    );
    const hydratedBySession = new Map(
      hydrated.map((result) => [result.id, result]),
    );

    setSessions((current) =>
      current.map((session) => {
        const hydratedSession = hydratedBySession.get(session.id);
        if (!hydratedSession) return session;
        const { items, allItems, localFiles, urlResolution } = hydratedSession;
        const sourceConfig =
          "sourceConfig" in hydratedSession
            ? hydratedSession.sourceConfig
            : undefined;
        const title =
          "title" in hydratedSession ? hydratedSession.title : undefined;

        return {
          ...session,
          title: title ?? session.title,
          items,
          allItems,
          urlResolution,
          localFiles,
          isRuntimeLoading: false,
          sourceConfig: sourceConfig ?? session.sourceConfig,
          timer: {
            ...session.timer,
            itemCount: items.length,
            activeIndex:
              items.length > 0
                ? clamp(session.timer.activeIndex, 0, items.length - 1)
                : 0,
          },
        };
      }),
    );
  }

  function isSessionVisibleForUrlHydration(session: FeedSession) {
    if (session.sourceConfig.kind !== "url") return true;
    if (session.layerId !== activeLayerId) return false;
    if (layoutMode !== "fixed") return true;

    return session.fixedSlot < visibleFixedCells;
  }

  async function fetchRuntimeItemsForSource(
    sourceConfig: PersistedSourceConfig,
  ) {
    if (sourceConfig.kind !== "reddit") {
      return { items: [], allItems: undefined };
    }

    const params = new URLSearchParams({
      allowNsfw: String(sourceConfig.allowNsfw),
      limit: String(sourceConfig.limit ?? DEFAULT_REDDIT_MEDIA_LIMIT),
    });
    for (const url of sourceConfig.urls) {
      params.append("urls", url);
    }
    const response = await fetch(`/api/reddit/listing?${params}`, {
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "reddit_error");
    }

    const allItems = flattenRuntimeMediaItems(
      payload.items as RuntimeFeedItem[],
    );

    return {
      items: await filterHiddenRedditItems(
        allItems,
        redditHiddenItemHashes(sourceConfig),
      ),
      allItems,
    };
  }

  async function fetchUrlRuntimeItemsForSource(sourceConfig: UrlSourceConfig) {
    const params = new URLSearchParams({ url: sourceConfig.url });
    if (sourceConfig.resolverHint) {
      params.set("hint", sourceConfig.resolverHint);
    }

    const response = await fetch(`/api/url/resolve?${params}`, {
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "url_source_error");
    }

    const resolution = payload.resolution as UrlRuntimeResolution;
    const nextResolverHint = payload.nextResolverHint as
      | UrlResolverHint
      | undefined;
    const items =
      resolution.status === "resolved" && "items" in resolution
        ? flattenRuntimeMediaItems(resolution.items as RuntimeFeedItem[])
        : [];
    const title =
      sourceConfig.title ??
      ("title" in resolution ? resolution.title : undefined) ??
      urlHostLabel(sourceConfig.url);

    return {
      title,
      items,
      allItems: items,
      urlResolution: resolution,
      sourceConfig: {
        ...sourceConfig,
        url: sourceConfig.url,
        title: sourceConfig.title,
        ...(nextResolverHint ? { resolverHint: nextResolverHint } : {}),
      } satisfies UrlSourceConfig,
    };
  }

  async function fetchLocalRuntimeItemsForSource(
    sourceConfig: PersistedSourceConfig,
  ) {
    if (sourceConfig.kind !== "local" || !sourceConfig.cacheSetId) {
      return { items: [], allItems: undefined, localFiles: undefined };
    }

    const result = await loadLocalFiles(sourceConfig.cacheSetId);
    if (result.status !== "loaded") {
      return { items: [], allItems: undefined, localFiles: undefined };
    }

    const localFiles = getUploadableFiles(result.files);
    return {
      items: createLocalRuntimeItems(localFiles),
      allItems: undefined,
      localFiles,
    };
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
                onClick={() => setLayoutMode("fixed")}
                aria-label="Fixed layout mode"
              >
                <Grid2X2 />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={layoutMode === "free" ? "default" : "outline"}
                onClick={() => setLayoutMode("free")}
                aria-label="Free layout mode"
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
                disabled={!sessions.length}
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
        onOpenChange={setIsSourceOpen}
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
        onOpenWorkspaces={openSavedWorkspaces}
        onDeleteWorkspace={deleteSavedWorkspace}
      />
      <SaveLayoutDialog
        open={isSaveOpen}
        onOpenChange={setIsSaveOpen}
        name={saveName}
        error={saveError}
        onNameChange={(value) => {
          setSaveName(value);
          setSaveError(null);
        }}
        onSave={saveLayoutAs}
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
                        galleryIndexes={galleryIndexes}
                        videoPositions={videoPositions}
                        selectedId={isActiveLayer ? selectedId : null}
                        hideUi={isUiHidden || !isActiveLayer}
                        showInfo={isActiveLayer && showAllInfo}
                        freeDrag={isActiveLayer ? freeDrag : null}
                        setSelectedId={setSelectedId}
                        setMaximizedId={setMaximizedId}
                        updateSession={updateSession}
                        removeSession={removeSession}
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

function accountStateFromUser(
  user: { email?: string | null } | null,
): AccountState {
  if (!user) return { status: "signed-out" };

  return {
    status: "signed-in",
    email: user.email ?? "Signed-in account",
  };
}

function LayoutDialog({
  open,
  onOpenChange,
  workspaces,
  onOpenWorkspaces,
  onDeleteWorkspace,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: SerializedWorkspace[];
  onOpenWorkspaces: (ids: string[]) => void;
  onDeleteWorkspace: (id: string) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const sortedWorkspaces = [...workspaces].sort((first, second) =>
    second.updatedAt.localeCompare(first.updatedAt),
  );
  const visibleIds = new Set(workspaces.map((workspace) => workspace.id));
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.has(id));
  const selectedCount = visibleSelectedIds.length;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setSelectedIds([]);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[min(94vw,34rem)] gap-3 overflow-y-auto overflow-x-hidden border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)]">
        <DialogHeader className="pr-8">
          <DialogTitle>Saved layouts</DialogTitle>
          <DialogDescription className="sr-only">
            Browse saved metadata-only layouts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          {sortedWorkspaces.length ? (
            sortedWorkspaces.map((workspace) => {
              const layerSummaries = workspaceLayerSummaries(workspace);
              const sourceCount = workspace.sessions.length;
              const fileCount = workspaceFileCount(workspace);

              return (
                <label
                  key={workspace.id}
                  className="grid min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-md border border-border bg-surface px-2.5 py-2 transition-colors hover:bg-muted/45"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(workspace.id)}
                    onChange={(event) =>
                      toggleSelection(workspace.id, event.target.checked)
                    }
                    aria-label={`Select ${workspace.name}`}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <div className="min-w-0 leading-tight">
                    <div
                      className="truncate font-medium"
                      title={workspace.name}
                    >
                      {workspace.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {workspace.layoutMode} · {layerSummaries.length} layer
                      {layerSummaries.length === 1 ? "" : "s"} · {sourceCount}{" "}
                      source{sourceCount === 1 ? "" : "s"} · {fileCount} file
                      {fileCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    onClick={(event) => {
                      event.preventDefault();
                      onDeleteWorkspace(workspace.id);
                    }}
                    aria-label={`Delete ${workspace.name}`}
                  >
                    <Trash2 />
                  </Button>
                </label>
              );
            })
          ) : (
            <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              No saved layouts yet. Use Save layout first.
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
      </DialogContent>
    </Dialog>
  );
}

function SaveLayoutDialog({
  open,
  onOpenChange,
  name,
  error,
  onNameChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  error: string | null;
  onNameChange: (name: string) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,24rem)] border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)]">
        <DialogHeader>
          <DialogTitle>Save layout as</DialogTitle>
          <DialogDescription className="sr-only">
            Name the current layout and save its configuration metadata.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <Label className="grid gap-1 text-sm">
            Layout name
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
          <Button type="submit" title="Save as layout">
            <Save />
            Save as layout
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClearLayoutDialog({
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
      <DialogContent className="w-[min(92vw,24rem)] border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)]">
        <DialogHeader>
          <DialogTitle>Clear layout?</DialogTitle>
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

function AccountDialog({
  open,
  onOpenChange,
  account,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountState;
  onSignOut: () => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,24rem)] border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)]">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription className="sr-only">
            View account status and sign-in actions.
          </DialogDescription>
        </DialogHeader>
        {account.status === "signed-in" ? (
          <div className="grid gap-3">
            <div className="grid gap-1 rounded-lg border border-border bg-surface p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Signed in
              </p>
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

function SourceDialog({
  open,
  onOpenChange,
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
  addDroppedLocalFiles,
  allowLocalFileDrop,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  setUrlValue: (value: string) => void;
  setUrlTitle: (value: string) => void;
  setRedditUrls: (value: string) => void;
  setRedditInputMode: (value: RedditInputMode) => void;
  setSubredditName: (value: string) => void;
  setRedditSort: (value: RedditListingSort) => void;
  setRedditTimeRange: (value: RedditTimeRange) => void;
  setRedditLimit: (value: number) => void;
  setSourceGroupingMode: (value: SourceGroupingMode) => void;
  openUrlSource: () => void;
  fetchRedditFeed: () => void;
  addLocalFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  addDroppedLocalFiles: (event: ReactDragEvent<HTMLElement>) => void;
  allowLocalFileDrop: (event: ReactDragEvent<HTMLElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[96dvh] w-[min(92vw,42rem)] overflow-x-hidden overflow-y-auto border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add source</DialogTitle>
          <DialogDescription className="sr-only">
            Choose local files or paste a URL, Reddit post, or subreddit link
            for the viewer.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-4">
          <div
            className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background/60 p-1"
            role="group"
            aria-label="Source mode"
          >
            <Button
              type="button"
              size="sm"
              variant={sourceGroupingMode === "stacked" ? "default" : "ghost"}
              onClick={() => setSourceGroupingMode("stacked")}
              aria-label="Add sources as one stacked source"
            >
              Stacked
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sourceGroupingMode === "separate" ? "default" : "ghost"}
              onClick={() => setSourceGroupingMode("separate")}
              aria-label="Add sources as separate sources"
            >
              Separate
            </Button>
          </div>
          <section className="grid gap-3 rounded-lg border border-border bg-surface p-3">
            <h2 className="text-sm font-medium">URL source</h2>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,10rem)_auto] sm:items-end">
              <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                URL
                <Input
                  value={urlValue}
                  onChange={(event) => setUrlValue(event.target.value)}
                  placeholder="https://example.com/media-or-page"
                  className="h-9 font-mono text-xs"
                />
              </Label>
              <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                Title
                <Input
                  value={urlTitle}
                  onChange={(event) => setUrlTitle(event.target.value)}
                  placeholder="Optional"
                  className="h-9"
                />
              </Label>
              <Button
                type="button"
                onClick={openUrlSource}
                disabled={isLoading}
                aria-label="Open URL"
                className="h-9"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Globe />}
                Open URL
              </Button>
            </div>
          </section>
          <div className="grid min-h-[39rem] min-w-0 gap-5 md:grid-cols-2">
            <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-border bg-surface p-3">
              <h2 className="text-sm font-medium">Local source</h2>
              <div
                className="grid min-h-0 gap-3 text-sm text-muted-foreground"
                role="group"
                aria-label="Local upload picker"
              >
                <div className="grid min-h-0 grid-rows-2 gap-3">
                  <Label
                    role="button"
                    tabIndex={0}
                    aria-label="Drop files"
                    onDragOver={allowLocalFileDrop}
                    onDragEnter={allowLocalFileDrop}
                    onDrop={addDroppedLocalFiles}
                    className="size-full min-h-0 cursor-pointer justify-center rounded-lg border border-dashed border-border/70 bg-background/55 p-4 text-center transition hover:border-primary/70 hover:bg-muted/55 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <span className="flex flex-col items-center justify-center gap-2">
                      <Upload className="size-6 text-primary" />
                      <span className="grid gap-1">
                        <span className="text-sm font-medium text-foreground">
                          Files
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Drop files here or click to select
                        </span>
                      </span>
                    </span>
                    <span className="sr-only">Image/video files</span>
                    <Input
                      type="file"
                      accept="image/*,video/*,audio/*"
                      multiple
                      className="sr-only"
                      aria-label="Image/video files"
                      onChange={addLocalFiles}
                    />
                  </Label>
                  <Label
                    role="button"
                    tabIndex={0}
                    aria-label="Drop folder"
                    onDragOver={allowLocalFileDrop}
                    onDragEnter={allowLocalFileDrop}
                    onDrop={addDroppedLocalFiles}
                    className="size-full min-h-0 cursor-pointer justify-center rounded-lg border border-dashed border-border/70 bg-background/55 p-4 text-center transition hover:border-primary/70 hover:bg-muted/55 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <span className="flex flex-col items-center justify-center gap-2">
                      <FolderOpen className="size-6 text-primary" />
                      <span className="grid gap-1">
                        <span className="text-sm font-medium text-foreground">
                          Folder
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Drop a folder here or click to select
                        </span>
                      </span>
                    </span>
                    <span className="sr-only">Image/video folder</span>
                    <DirectoryInput
                      type="file"
                      accept="image/*,video/*,audio/*"
                      multiple
                      directory=""
                      webkitdirectory=""
                      className="sr-only"
                      aria-label="Image/video folder"
                      onChange={addLocalFiles}
                    />
                  </Label>
                </div>
              </div>
            </section>

            <section className="grid min-h-0 min-w-0 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-2 rounded-lg border border-border bg-surface p-3">
              <h2 className="text-sm font-medium">Reddit</h2>
              <div
                className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background/60 p-1"
                role="group"
                aria-label="Reddit input mode"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={
                    redditInputMode === "subreddit" ? "default" : "ghost"
                  }
                  aria-label="Use subreddit name"
                  aria-pressed={redditInputMode === "subreddit"}
                  onClick={() => setRedditInputMode("subreddit")}
                >
                  Subreddit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={redditInputMode === "links" ? "default" : "ghost"}
                  aria-label="Use Reddit links"
                  aria-pressed={redditInputMode === "links"}
                  onClick={() => setRedditInputMode("links")}
                >
                  Links
                </Button>
              </div>
              <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                Reddit media count
                <Input
                  type="number"
                  min={1}
                  max={MAX_REDDIT_MEDIA_LIMIT}
                  value={redditLimit || ""}
                  onChange={(event) => {
                    if (event.target.value === "") {
                      setRedditLimit(0);
                      return;
                    }

                    setRedditLimit(
                      clamp(
                        Number(event.target.value),
                        1,
                        MAX_REDDIT_MEDIA_LIMIT,
                      ),
                    );
                  }}
                  className="h-9"
                />
              </Label>
              {redditInputMode === "subreddit" ? (
                <div className="grid content-start gap-3">
                  <Label className="grid gap-1 text-xs leading-none font-medium text-muted-foreground">
                    Subreddit name
                    <Input
                      value={subredditName}
                      onChange={(event) => setSubredditName(event.target.value)}
                      placeholder="kpop, pics, aww"
                      className="h-9 font-mono"
                    />
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <LabeledSelect
                      label="Sort"
                      value={redditSort}
                      options={REDDIT_SORT_OPTIONS}
                      onValueChange={(value) =>
                        setRedditSort(value as RedditListingSort)
                      }
                    />
                    <LabeledSelect
                      label="Time range"
                      value={redditTimeRange}
                      options={REDDIT_TIME_OPTIONS}
                      disabled={
                        redditSort !== "top" && redditSort !== "controversial"
                      }
                      onValueChange={(value) =>
                        setRedditTimeRange(value as RedditTimeRange)
                      }
                    />
                  </div>
                </div>
              ) : (
                <Textarea
                  aria-label="Paste Reddit post or subreddit links, one per line"
                  value={redditUrls}
                  onChange={(event) => setRedditUrls(event.target.value)}
                  placeholder={`Accepted links:
1. Specific post link:
https://www.reddit.com/r/<community>/comments/<post_id>/<post_title>/
2. Sorted subreddit link:
https://www.reddit.com/r/<community>/top/?t=week

Use the Subreddit tab for bare names.`}
                  className="h-full min-h-0 resize-none font-mono text-xs leading-5"
                />
              )}
              <Button
                type="button"
                onClick={fetchRedditFeed}
                disabled={isLoading}
                aria-label="Open Reddit links"
                className="self-end"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Grid2X2 />}
                Open Reddit
              </Button>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LabeledSelect<T extends string>({
  label,
  value,
  options,
  disabled,
  onValueChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  disabled?: boolean;
  onValueChange: (value: T) => void;
}) {
  return (
    <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger aria-label={label} className="h-9 w-full bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Label>
  );
}

function EditSourceDialog({
  source,
  open,
  onOpenChange,
  onSaveReddit,
  onSaveUrl,
  onSaveLocal,
}: {
  source: FeedSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveReddit: (
    id: string,
    urls: string[],
    limit: number,
    hiddenItemIds: string[],
    unhiddenItemHashes: string[],
  ) => void;
  onSaveUrl: (id: string, url: string, title?: string) => void;
  onSaveLocal: (id: string, files: File[]) => void;
}) {
  type LocalEditEntry = { file: File; previewUrl?: string };
  const [redditUrls, setRedditUrls] = useState<string[]>(
    source.sourceConfig.kind === "reddit" ? source.sourceConfig.urls : [],
  );
  const [redditLimit, setRedditLimit] = useState(
    source.sourceConfig.kind === "reddit"
      ? (source.sourceConfig.limit ?? DEFAULT_REDDIT_MEDIA_LIMIT)
      : DEFAULT_REDDIT_MEDIA_LIMIT,
  );
  const [localEntries, setLocalEntries] = useState<LocalEditEntry[]>(
    source.sourceConfig.kind === "local"
      ? (source.localFiles ?? []).map((file, index) => ({
          file,
          previewUrl: source.items[index]?.media[0]?.url,
        }))
      : [],
  );
  const [urlValue, setUrlValue] = useState(
    source.sourceConfig.kind === "url" ? source.sourceConfig.url : "",
  );
  const [urlTitle, setUrlTitle] = useState(
    source.sourceConfig.kind === "url" ? (source.sourceConfig.title ?? "") : "",
  );
  const [hiddenRedditItemIds, setHiddenRedditItemIds] = useState<string[]>([]);
  const [unhiddenRedditHashes, setUnhiddenRedditHashes] = useState<string[]>(
    [],
  );
  const [savedHiddenHashMatches, setSavedHiddenHashMatches] = useState<
    Record<string, string[]>
  >({});

  const currentSource = source;
  const isReddit = currentSource.sourceConfig.kind === "reddit";
  const isUrl = currentSource.sourceConfig.kind === "url";
  const savedHiddenHashes = useMemo(
    () =>
      currentSource.sourceConfig.kind === "reddit"
        ? redditHiddenItemHashes(currentSource.sourceConfig)
        : [],
    [currentSource.sourceConfig],
  );
  const savedHiddenHashSet = useMemo(
    () => new Set(savedHiddenHashes),
    [savedHiddenHashes],
  );
  const activeHiddenHashSet = useMemo(
    () =>
      new Set(
        savedHiddenHashes.filter(
          (hash) => !unhiddenRedditHashes.includes(hash),
        ),
      ),
    [savedHiddenHashes, unhiddenRedditHashes],
  );
  const runtimeRedditItems = useMemo(
    () =>
      currentSource.sourceConfig.kind === "reddit"
        ? (currentSource.allItems ?? currentSource.items)
        : [],
    [currentSource.allItems, currentSource.items, currentSource.sourceConfig],
  );
  const redditItemLabels = redditRuntimeItemLabels(runtimeRedditItems);
  const hiddenRedditCount = runtimeRedditItems.filter((item) => {
    const itemId = redditItemHashInput(item.id);
    const savedMatches = savedHiddenHashMatches[itemId] ?? [];

    return (
      hiddenRedditItemIds.includes(itemId) ||
      savedMatches.some((hash) => activeHiddenHashSet.has(hash))
    );
  }).length;

  useEffect(() => {
    if (!isReddit || !savedHiddenHashes.length || !runtimeRedditItems.length) {
      return;
    }

    let cancelled = false;

    async function matchSavedHiddenHashes() {
      const entries = await Promise.all(
        runtimeRedditItems.map(async (item) => {
          const itemId = redditItemHashInput(item.id);
          const matches = (await redditHashesForItemId(item.id)).filter(
            (hash) => savedHiddenHashSet.has(hash),
          );

          return [itemId, matches] as const;
        }),
      );

      if (!cancelled) {
        setSavedHiddenHashMatches(
          Object.fromEntries(entries.filter((entry) => entry[1].length)),
        );
      }
    }

    void matchSavedHiddenHashes();

    return () => {
      cancelled = true;
    };
  }, [
    isReddit,
    runtimeRedditItems,
    savedHiddenHashes.length,
    savedHiddenHashSet,
  ]);

  function removeRedditUrl(index: number) {
    setRedditUrls((current) =>
      current.filter((_url, currentIndex) => currentIndex !== index),
    );
  }

  function updateRedditUrl(index: number, value: string) {
    setRedditUrls((current) =>
      current.map((url, currentIndex) =>
        currentIndex === index ? value : url,
      ),
    );
  }

  function save() {
    if (isReddit) {
      onSaveReddit(
        currentSource.id,
        redditUrls.map((url) => url.trim()).filter(Boolean),
        redditLimit,
        hiddenRedditItemIds,
        unhiddenRedditHashes,
      );
      return;
    }

    if (isUrl) {
      onSaveUrl(
        currentSource.id,
        urlValue.trim(),
        urlTitle.trim() || undefined,
      );
      return;
    }

    onSaveLocal(
      currentSource.id,
      localEntries.map((entry) => entry.file),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[min(94vw,42rem)] overflow-y-auto overflow-x-hidden border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)] sm:max-w-2xl",
          isReddit
            ? "grid h-[min(92dvh,46rem)] grid-rows-[auto_minmax(0,1fr)]"
            : "max-h-[92dvh]",
        )}
      >
        <DialogHeader>
          <DialogTitle>Edit source</DialogTitle>
          <DialogDescription className="sr-only">
            Edit source contents without changing layout placement.
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "grid gap-3",
            isReddit && "min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto]",
          )}
        >
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <Pencil className="size-4 text-primary" />
            <span className="truncate font-medium">{source.title}</span>
          </div>

          {isReddit ? (
            <>
              <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Reddit media count
                <Input
                  type="number"
                  min={1}
                  max={MAX_REDDIT_MEDIA_LIMIT}
                  value={redditLimit || ""}
                  onChange={(event) => {
                    if (event.target.value === "") {
                      setRedditLimit(0);
                      return;
                    }

                    setRedditLimit(
                      clamp(
                        Number(event.target.value),
                        1,
                        MAX_REDDIT_MEDIA_LIMIT,
                      ),
                    );
                  }}
                  className="h-9"
                />
              </Label>
              <div className="grid gap-2">
                {redditUrls.map((url, index) => {
                  const subreddit = subredditFromRedditUrl(url);

                  return (
                    <div
                      key={`${url}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
                    >
                      <Input
                        value={url}
                        onChange={(event) =>
                          updateRedditUrl(index, event.target.value)
                        }
                        aria-label={`Reddit source ${index + 1}`}
                        className="h-9 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="border-0 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                        aria-label={`Remove ${subreddit ? `r/${subreddit}` : `Reddit ${index + 1}`} link`}
                        onClick={() => removeRedditUrl(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="grid min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-2 rounded-lg border border-border bg-background/45 p-3">
                <div className="grid w-full grid-cols-[minmax(0,1fr)_5rem] items-center gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Items
                  </h3>
                  <span
                    className={cn(
                      "w-20 rounded-full border border-border bg-surface px-2 py-0.5 text-center text-[11px] text-muted-foreground transition-opacity",
                      !hiddenRedditCount && "invisible opacity-0",
                    )}
                    aria-hidden={!hiddenRedditCount}
                  >
                    {hiddenRedditCount} hidden
                  </span>
                </div>
                {runtimeRedditItems.length ? (
                  <div className="grid min-h-0 gap-2 overflow-y-auto pr-1">
                    {runtimeRedditItems.map((item) => {
                      const subreddit = item.subreddit ?? source.title;
                      const itemId = redditItemHashInput(item.id);
                      const label = redditItemLabels.get(item.id) ?? item.title;
                      const savedMatches = savedHiddenHashMatches[itemId] ?? [];
                      const isSavedHidden = savedMatches.some((hash) =>
                        activeHiddenHashSet.has(hash),
                      );
                      const isHidden =
                        hiddenRedditItemIds.includes(itemId) || isSavedHidden;

                      return (
                        <div
                          key={itemId}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2"
                        >
                          <span className="truncate text-xs font-medium">
                            {label}
                          </span>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant={isHidden ? "default" : "outline"}
                            aria-label={`${isHidden ? "Unhide" : "Hide"} ${label} from r/${subreddit}`}
                            onClick={() => {
                              if (savedMatches.length) {
                                setUnhiddenRedditHashes((current) =>
                                  isSavedHidden
                                    ? [
                                        ...current,
                                        ...savedMatches.filter(
                                          (hash) => !current.includes(hash),
                                        ),
                                      ]
                                    : current.filter(
                                        (hash) => !savedMatches.includes(hash),
                                      ),
                                );
                                return;
                              }

                              setHiddenRedditItemIds((current) =>
                                current.includes(itemId)
                                  ? current.filter(
                                      (candidate) => candidate !== itemId,
                                    )
                                  : [...current, itemId],
                              );
                            }}
                          >
                            <EyeOff />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No runtime items in this source.
                  </div>
                )}
              </div>
            </>
          ) : isUrl ? (
            <div className="grid gap-3">
              <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                URL
                <Input
                  value={urlValue}
                  onChange={(event) => setUrlValue(event.target.value)}
                  className="h-9 font-mono text-xs"
                />
              </Label>
              <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Title
                <Input
                  value={urlTitle}
                  onChange={(event) => setUrlTitle(event.target.value)}
                  placeholder="Optional"
                  className="h-9"
                />
              </Label>
            </div>
          ) : (
            <div className="grid gap-2">
              {localEntries.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {localEntries.map(({ file, previewUrl }, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="grid min-w-0 gap-2 rounded-lg border border-border bg-surface p-2"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-md border border-border/70 bg-background">
                        {previewUrl && file.type.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt={`Preview ${file.name}`}
                            className="size-full object-cover"
                          />
                        ) : file.type.startsWith("video/") ? (
                          <span className="grid size-full place-items-center text-xs font-medium text-muted-foreground">
                            Video
                          </span>
                        ) : file.type.startsWith("audio/") ? (
                          <span className="grid size-full place-items-center text-xs font-medium text-muted-foreground">
                            Audio
                          </span>
                        ) : (
                          <span className="grid size-full place-items-center text-xs font-medium text-muted-foreground">
                            File
                          </span>
                        )}
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="absolute right-1 top-1 border-0 bg-background/60 text-foreground/90 backdrop-blur hover:bg-destructive/15 hover:text-destructive"
                          aria-label={`Remove ${file.name}`}
                          onClick={() =>
                            setLocalEntries((current) =>
                              current.filter(
                                (_entry, currentIndex) =>
                                  currentIndex !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <span
                        className="truncate text-xs font-medium"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Reload files before editing this source.
                </div>
              )}
            </div>
          )}

          <Button type="button" onClick={save} className="w-full">
            <Save />
            Save source
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FixedGridView({
  sessions,
  visibleCells,
  fixedGrid,
  galleryIndexes,
  videoPositions,
  selectedId,
  hideUi,
  showInfo,
  openSourcePanel,
  setSelectedId,
  setMaximizedId,
  updateSession,
  removeSession,
  changeGallery,
  onVideoPositionChange,
  setViewTimerMode,
  setViewTimerSeconds,
  onLocalFilesSelected,
  onEditSource,
}: {
  sessions: FeedSession[];
  visibleCells: number;
  fixedGrid: FixedGrid;
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  selectedId: string | null;
  hideUi: boolean;
  showInfo: boolean;
  openSourcePanel: (slot: number | null) => void;
  setSelectedId: (id: string | null) => void;
  setMaximizedId: (id: string) => void;
  updateSession: (
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) => void;
  removeSession: (id: string) => void;
  changeGallery: (itemId: string, direction: 1 | -1) => void;
  onVideoPositionChange: (key: string, seconds: number) => void;
  setViewTimerMode: (id: string, mode: TimerMode) => void;
  setViewTimerSeconds: (id: string, value: number) => void;
  onLocalFilesSelected: (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onEditSource: (id: string) => void;
}) {
  let mountedIframeCount = 0;
  const iframeLimit = activeIframeFallbackLimit();

  return (
    <div
      className={cn(
        "grid",
        hideUi
          ? "h-dvh min-h-0 min-w-0 gap-0"
          : "h-full min-h-[360px] min-w-0 gap-2 md:min-w-[720px]",
      )}
      style={{
        gridTemplateColumns: `repeat(${fixedGrid.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${fixedGrid.rows}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: visibleCells }, (_, slot) => {
        const session = sessions.find(
          (candidate) => candidate.fixedSlot === slot,
        );

        return (
          <div
            key={slot}
            data-testid={`fixed-cell-${slot}`}
            className={cn(
              "min-h-0 rounded-xl outline outline-1 outline-offset-0 outline-transparent transition",
              !hideUi &&
                session?.id === selectedId &&
                "outline-2 outline-offset-1 outline-primary ring-2 ring-primary/20",
            )}
            onClick={(event) => {
              if (!session) return;
              if ((event.target as HTMLElement).closest("button,a,input")) {
                return;
              }
              setSelectedId(session.id === selectedId ? null : session.id);
            }}
          >
            {session ? (
              <SessionPane
                session={session}
                canMountUrlIframe={(() => {
                  if (!isIframeUrlSession(session)) return true;
                  mountedIframeCount += 1;
                  return mountedIframeCount <= iframeLimit;
                })()}
                galleryIndexes={galleryIndexes}
                videoPositions={videoPositions}
                compact={fixedGrid.columns * fixedGrid.rows > 4}
                isFocused={session.id === selectedId}
                forceInfoVisible={showInfo}
                hideUi={hideUi}
                isRuntimeLoading={session.isRuntimeLoading}
                onGalleryChange={changeGallery}
                onVideoPositionChange={onVideoPositionChange}
                onMove={(direction) =>
                  updateSession(session.id, (current) => ({
                    ...current,
                    timer: moveTimerIndex(current.timer, direction),
                  }))
                }
                onTogglePaused={() =>
                  updateSession(session.id, (current) => ({
                    ...current,
                    timer: togglePaused(current.timer),
                  }))
                }
                onRestart={() =>
                  updateSession(session.id, (current) => ({
                    ...current,
                    timer: { ...current.timer, elapsedMs: 0 },
                  }))
                }
                onMaximize={() => setMaximizedId(session.id)}
                onEdit={() => onEditSource(session.id)}
                onRemove={() => removeSession(session.id)}
                onTimerModeChange={(mode) => setViewTimerMode(session.id, mode)}
                onTimerSecondsChange={(value) =>
                  setViewTimerSeconds(session.id, value)
                }
                onLocalFilesSelected={(event) =>
                  onLocalFilesSelected(session.id, event)
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => openSourcePanel(slot)}
                aria-label="Add source to empty cell"
                title="Add source to empty cell"
                className="grid size-full min-h-0 cursor-pointer place-items-center rounded-lg border border-dashed border-border/70 bg-surface/40 text-sm text-muted-foreground transition hover:border-primary/70 hover:text-primary"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="size-4" />
                  Add source
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FreeGridView({
  sessions,
  galleryIndexes,
  videoPositions,
  selectedId,
  hideUi,
  showInfo,
  freeDrag,
  setSelectedId,
  setMaximizedId,
  updateSession,
  removeSession,
  changeGallery,
  onVideoPositionChange,
  setViewTimerMode,
  setViewTimerSeconds,
  beginFreeDrag,
  onLocalFilesSelected,
  onEditSource,
}: {
  sessions: FeedSession[];
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  selectedId: string | null;
  hideUi: boolean;
  showInfo: boolean;
  freeDrag: FreeDragState | null;
  setSelectedId: (id: string | null) => void;
  setMaximizedId: (id: string) => void;
  updateSession: (
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) => void;
  removeSession: (id: string) => void;
  changeGallery: (itemId: string, direction: 1 | -1) => void;
  onVideoPositionChange: (key: string, seconds: number) => void;
  setViewTimerMode: (id: string, mode: TimerMode) => void;
  setViewTimerSeconds: (id: string, value: number) => void;
  beginFreeDrag: (
    event: ReactPointerEvent<HTMLButtonElement>,
    session: FeedSession,
    mode: "move" | "resize",
  ) => void;
  onLocalFilesSelected: (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onEditSource: (id: string) => void;
}) {
  let mountedIframeCount = 0;
  const iframeLimit = activeIframeFallbackLimit();

  return (
    <div
      className={cn(
        "grid",
        hideUi
          ? "h-dvh min-h-0 min-w-0 gap-0"
          : "h-full min-h-[360px] min-w-0 gap-2 md:min-w-[720px]",
      )}
      style={{
        gridTemplateColumns: `repeat(${FREE_LAYOUT_SIZE}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${FREE_LAYOUT_SIZE}, minmax(0, 1fr))`,
      }}
    >
      {sessions.length ? (
        sessions.map((session) => {
          const dragRect =
            freeDrag?.id === session.id
              ? freeDrag.currentRect
              : session.freeRect;

          return (
            <div
              key={session.id}
              data-testid={`free-cell-${session.id}`}
              className={cn(
                "group/free relative min-h-0 rounded-xl outline outline-1 outline-offset-0 outline-transparent transition",
                !hideUi &&
                  session.id === selectedId &&
                  "outline-2 outline-offset-1 outline-primary ring-2 ring-primary/20 shadow-[0_0_20px_rgba(143,239,225,0.08)]",
                freeDrag?.id === session.id && "z-40 scale-[1.01]",
              )}
              style={{
                gridColumn: `${dragRect.column} / span ${dragRect.columnSpan}`,
                gridRow: `${dragRect.row} / span ${dragRect.rowSpan}`,
              }}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("button,a,input")) {
                  return;
                }
                setSelectedId(session.id === selectedId ? null : session.id);
              }}
            >
              {!hideUi ? (
                <div
                  className={cn(
                    "absolute bottom-2 right-2 z-30 flex flex-col gap-1 transition-opacity duration-200",
                    session.id !== selectedId &&
                      "opacity-0 group-hover/free:opacity-100 group-focus-within/free:opacity-100",
                  )}
                >
                  <button
                    type="button"
                    aria-label={`Move ${session.title}`}
                    title={`Move ${session.title}`}
                    onPointerDown={(event) =>
                      beginFreeDrag(event, session, "move")
                    }
                    className="grid size-8 cursor-grab place-items-center rounded-lg border border-primary/50 bg-background/80 text-primary backdrop-blur active:cursor-grabbing"
                  >
                    <Move className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Resize ${session.title}`}
                    title={`Resize ${session.title}`}
                    onPointerDown={(event) =>
                      beginFreeDrag(event, session, "resize")
                    }
                    className="grid size-8 cursor-se-resize place-items-center rounded-lg border border-primary/50 bg-background/80 text-primary backdrop-blur"
                  >
                    <GripHorizontal className="size-4 rotate-45" />
                  </button>
                </div>
              ) : null}
              <SessionPane
                session={session}
                canMountUrlIframe={(() => {
                  if (!isIframeUrlSession(session)) return true;
                  mountedIframeCount += 1;
                  return mountedIframeCount <= iframeLimit;
                })()}
                galleryIndexes={galleryIndexes}
                videoPositions={videoPositions}
                compact={
                  session.freeRect.columnSpan < 3 ||
                  session.freeRect.rowSpan < 3
                }
                isFocused={session.id === selectedId}
                forceInfoVisible={showInfo}
                hideUi={hideUi}
                isRuntimeLoading={session.isRuntimeLoading}
                onGalleryChange={changeGallery}
                onVideoPositionChange={onVideoPositionChange}
                onMove={(direction) =>
                  updateSession(session.id, (current) => ({
                    ...current,
                    timer: moveTimerIndex(current.timer, direction),
                  }))
                }
                onTogglePaused={() =>
                  updateSession(session.id, (current) => ({
                    ...current,
                    timer: togglePaused(current.timer),
                  }))
                }
                onRestart={() =>
                  updateSession(session.id, (current) => ({
                    ...current,
                    timer: { ...current.timer, elapsedMs: 0 },
                  }))
                }
                onMaximize={() => setMaximizedId(session.id)}
                onEdit={() => onEditSource(session.id)}
                onRemove={() => removeSession(session.id)}
                onTimerModeChange={(mode) => setViewTimerMode(session.id, mode)}
                onTimerSecondsChange={(value) =>
                  setViewTimerSeconds(session.id, value)
                }
                onLocalFilesSelected={(event) =>
                  onLocalFilesSelected(session.id, event)
                }
              />
            </div>
          );
        })
      ) : (
        <div
          className="grid place-items-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground"
          style={{
            gridColumn: `1 / span ${FREE_LAYOUT_SIZE}`,
            gridRow: `1 / span ${FREE_LAYOUT_SIZE}`,
          }}
        >
          Add a source, then drag and resize it here.
        </div>
      )}
    </div>
  );
}

function SessionPane({
  session,
  canMountUrlIframe = true,
  galleryIndexes,
  videoPositions,
  compact,
  isFocused,
  forceInfoVisible,
  hideUi,
  isRuntimeLoading,
  onGalleryChange,
  onVideoPositionChange,
  onMove,
  onTogglePaused,
  onRestart,
  onMaximize,
  onEdit,
  onRemove,
  onTimerModeChange,
  onTimerSecondsChange,
  onLocalFilesSelected,
}: {
  session: FeedSession;
  canMountUrlIframe?: boolean;
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  compact?: boolean;
  isFocused?: boolean;
  forceInfoVisible?: boolean;
  hideUi?: boolean;
  isRuntimeLoading?: boolean;
  onGalleryChange: (itemId: string, direction: 1 | -1) => void;
  onVideoPositionChange: (key: string, seconds: number) => void;
  onMove: (direction: 1 | -1) => void;
  onTogglePaused: () => void;
  onRestart: () => void;
  onMaximize?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onTimerModeChange: (mode: TimerMode) => void;
  onTimerSecondsChange: (seconds: number) => void;
  onLocalFilesSelected?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const localSourceConfig =
    session.sourceConfig.kind === "local" ? session.sourceConfig : null;
  const needsLocalReload = Boolean(
    localSourceConfig && session.items.length === 0,
  );
  const hasCachedLocalFiles =
    needsLocalReload && Boolean(localSourceConfig?.cacheSetId);

  if (
    session.sourceConfig.kind === "url" &&
    !hasPlayableRuntimeItems(session)
  ) {
    return (
      <UrlSourcePane
        title={session.title}
        resolution={session.urlResolution}
        isRuntimeLoading={isRuntimeLoading}
        hideUi={hideUi}
        canMountIframe={canMountUrlIframe}
        onMaximize={onMaximize}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    );
  }

  return (
    <FeedViewPane
      viewId={session.id}
      title={session.title}
      items={session.items}
      timer={session.timer}
      timerMode={session.timerMode}
      galleryIndexes={galleryIndexes}
      videoPositions={videoPositions}
      compact={compact}
      isFocused={isFocused}
      forceInfoVisible={forceInfoVisible}
      hideUi={hideUi}
      isRuntimeLoading={isRuntimeLoading}
      emptyMessage={
        hasCachedLocalFiles
          ? "Cached files unavailable"
          : needsLocalReload
            ? "Local files need reload"
            : undefined
      }
      emptyAction={
        needsLocalReload && onLocalFilesSelected && !hideUi ? (
          <div className="flex flex-wrap justify-center gap-2">
            <Label
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition hover:bg-muted"
              onClick={(event) => event.stopPropagation()}
            >
              <Upload className="size-3.5" />
              Select files
              <Input
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                className="sr-only"
                aria-label={`Reload files for ${session.title}`}
                onChange={onLocalFilesSelected}
              />
            </Label>
          </div>
        ) : undefined
      }
      onGalleryChange={onGalleryChange}
      onVideoPositionChange={onVideoPositionChange}
      onMove={onMove}
      onTogglePaused={onTogglePaused}
      onRestart={onRestart}
      onMaximize={onMaximize}
      onEdit={onEdit}
      onRemove={onRemove}
      onTimerModeChange={onTimerModeChange}
      onTimerSecondsChange={onTimerSecondsChange}
    />
  );
}

function UrlSourcePane({
  title,
  resolution,
  isRuntimeLoading,
  hideUi,
  canMountIframe,
  onMaximize,
  onEdit,
  onRemove,
}: {
  title: string;
  resolution?: UrlRuntimeResolution;
  isRuntimeLoading?: boolean;
  hideUi?: boolean;
  canMountIframe: boolean;
  onMaximize?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const displayTitle = resolution?.title ?? title;
  const externalUrl = resolution?.externalUrl;
  const iframeUrl = resolution ? urlResolutionIframeUrl(resolution) : null;
  const iframeBlocked =
    resolution?.status === "resolved" && iframeUrl && !canMountIframe;

  return (
    <article className="group/source relative grid size-full min-h-0 overflow-hidden rounded-lg border border-border/70 bg-background text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.018)]">
      {iframeUrl && canMountIframe ? (
        <iframe
          title={displayTitle}
          src={iframeUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          className="absolute inset-0 z-0 size-full border-0 bg-background"
        />
      ) : (
        <div className="absolute inset-0 z-0 grid place-items-center bg-background p-4">
          <div className="grid max-w-md justify-items-center gap-3 text-center">
            <Globe className="size-8 text-primary" />
            <div className="grid gap-1">
              <h3 className="text-sm font-medium">{displayTitle}</h3>
              {isRuntimeLoading ? (
                <p className="text-xs text-muted-foreground">
                  Loading runtime media
                </p>
              ) : resolution?.status === "resolved" &&
                resolution.mode === "metadata" ? (
                <>
                  {resolution.metadata.siteName ? (
                    <p className="text-[11px] font-medium text-primary">
                      {resolution.metadata.siteName}
                    </p>
                  ) : null}
                  {resolution.metadata.description ? (
                    <p className="text-xs text-muted-foreground">
                      {resolution.metadata.description}
                    </p>
                  ) : null}
                  {resolution.metadata.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolution.metadata.thumbnailUrl}
                      alt=""
                      className="mt-1 max-h-36 rounded-md border border-border object-contain"
                    />
                  ) : null}
                </>
              ) : iframeBlocked ? (
                <p className="text-xs text-muted-foreground">
                  Iframe limit reached
                </p>
              ) : resolution?.status === "blocked" ? (
                <p className="text-xs text-muted-foreground">
                  This site blocks embedded viewing.
                </p>
              ) : resolution?.status === "unsupported" ? (
                <p className="text-xs text-muted-foreground">
                  This URL cannot be displayed inside the viewer.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  URL source is waiting for runtime resolution.
                </p>
              )}
            </div>
            {externalUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={externalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Open externally
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {hideUi ? null : (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 opacity-0 transition-opacity duration-200 group-hover/source:opacity-100 group-focus-within/source:opacity-100">
          <div className="min-w-0 rounded-md bg-background/75 px-2 py-1.5 backdrop-blur">
            <div className="truncate text-xs font-medium">{displayTitle}</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              URL source
            </div>
          </div>
          <div className="pointer-events-auto flex shrink-0 flex-wrap justify-end gap-1">
            {onMaximize ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={onMaximize}
                aria-label={`Maximize ${displayTitle}`}
              >
                <Maximize2 />
              </Button>
            ) : null}
            {onEdit ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={onEdit}
                aria-label={`Edit ${displayTitle}`}
              >
                <Pencil />
              </Button>
            ) : null}
            {onRemove ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={onRemove}
                aria-label={`Remove ${displayTitle}`}
              >
                <X />
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}

function FocusLayout({
  focused,
  sessions,
  galleryIndexes,
  videoPositions,
  hideUi,
  showInfo,
  onRestore,
  onFocus,
  onGalleryChange,
  onVideoPositionChange,
  onMove,
  onTogglePaused,
  onRestart,
  onTimerModeChange,
  onTimerSecondsChange,
  onLocalFilesSelected,
  onEditSource,
}: {
  focused: FeedSession;
  sessions: FeedSession[];
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  hideUi: boolean;
  showInfo: boolean;
  onRestore: () => void;
  onFocus: (id: string) => void;
  onGalleryChange: (itemId: string, direction: 1 | -1) => void;
  onVideoPositionChange: (key: string, seconds: number) => void;
  onMove: (id: string, direction: 1 | -1) => void;
  onTogglePaused: (id: string) => void;
  onRestart: (id: string) => void;
  onTimerModeChange: (id: string, mode: TimerMode) => void;
  onTimerSecondsChange: (id: string, value: number) => void;
  onLocalFilesSelected: (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onEditSource: (id: string) => void;
}) {
  const satellites = sessions.filter((session) => session.id !== focused.id);

  return (
    <section
      className={cn(
        "grid min-h-0 gap-3",
        hideUi ? "h-dvh p-0" : "h-full p-3 lg:grid-cols-[minmax(0,1fr)_220px]",
      )}
    >
      <div className={cn("grid min-h-0 grid-rows-[minmax(0,1fr)]")}>
        <SessionPane
          session={focused}
          galleryIndexes={galleryIndexes}
          videoPositions={videoPositions}
          forceInfoVisible={showInfo}
          hideUi={hideUi}
          isRuntimeLoading={focused.isRuntimeLoading}
          onGalleryChange={onGalleryChange}
          onVideoPositionChange={onVideoPositionChange}
          onMove={(direction) => onMove(focused.id, direction)}
          onTogglePaused={() => onTogglePaused(focused.id)}
          onRestart={() => onRestart(focused.id)}
          onTimerModeChange={(mode) => onTimerModeChange(focused.id, mode)}
          onTimerSecondsChange={(value) =>
            onTimerSecondsChange(focused.id, value)
          }
          onEdit={() => onEditSource(focused.id)}
          onLocalFilesSelected={(event) =>
            onLocalFilesSelected(focused.id, event)
          }
        />
      </div>

      {!hideUi ? (
        <aside className="grid min-h-0 content-start gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Satellite View
            </h2>
            <Button type="button" variant="outline" onClick={onRestore}>
              <Maximize2 />
              Restore grid
            </Button>
          </div>
          {satellites.length ? (
            satellites.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onFocus(session.id)}
                title={`Focus ${session.title}`}
                className="h-32 min-h-0 text-left"
              >
                <SessionPane
                  session={session}
                  galleryIndexes={galleryIndexes}
                  videoPositions={videoPositions}
                  compact
                  forceInfoVisible={showInfo}
                  isRuntimeLoading={session.isRuntimeLoading}
                  onGalleryChange={onGalleryChange}
                  onVideoPositionChange={onVideoPositionChange}
                  onMove={(direction) => onMove(session.id, direction)}
                  onTogglePaused={() => onTogglePaused(session.id)}
                  onRestart={() => onRestart(session.id)}
                  onTimerModeChange={(mode) =>
                    onTimerModeChange(session.id, mode)
                  }
                  onTimerSecondsChange={(value) =>
                    onTimerSecondsChange(session.id, value)
                  }
                />
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              No satellite views
            </div>
          )}
        </aside>
      ) : null}
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  icon,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  icon?: ReactNode;
  onChange: (value: number) => void;
}) {
  if (icon) {
    return (
      <Label className="flex h-8 min-w-20 items-center gap-1 rounded-lg border border-border/70 bg-surface-elevated/70 px-1 text-[11px] text-muted-foreground">
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center text-muted-foreground"
        >
          {icon}
        </span>
        <Input
          aria-label={label}
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="h-6 w-11 border-border/70 bg-background/70 px-1 text-center font-mono text-[11px] text-foreground"
        />
      </Label>
    );
  }

  return (
    <Label className="grid min-w-20 gap-1 text-[11px] text-muted-foreground">
      {label}
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="h-7 w-20 bg-surface-elevated text-foreground"
      />
    </Label>
  );
}

function DirectoryInput(props: DirectoryInputProps) {
  return <Input {...props} />;
}

function nextFixedSlot(sessions: FeedSession[], preferredSlot: number | null) {
  const occupied = new Set(sessions.map((session) => session.fixedSlot));
  if (preferredSlot !== null && !occupied.has(preferredSlot)) {
    return preferredSlot;
  }

  let slot = 0;
  while (occupied.has(slot)) slot += 1;
  return slot;
}

function toRuntimeWorkspace(workspace: SerializedWorkspace): RuntimeWorkspace {
  const layers = normalizeWorkspaceLayers(workspace.layers);
  const activeLayerId = layers.some(
    (layer) => layer.id === workspace.activeLayerId,
  )
    ? workspace.activeLayerId
    : layers[0].id;

  return {
    ...workspace,
    layers,
    activeLayerId,
    globalTimerSeconds: resolveWorkspaceGlobalSeconds(workspace),
    sessions: workspace.sessions.map((session) => ({
      ...session,
      layerId: session.layerId ?? activeLayerId,
      timerMode: normalizeTimerMode(session.timerMode),
    })),
  };
}

function toRuntimeWorkspaceWithLocalRuntime(
  workspace: SerializedWorkspace,
  runtimeWorkspace?: RuntimeWorkspace,
): RuntimeWorkspace {
  const layers = normalizeWorkspaceLayers(workspace.layers);
  const activeLayerId = layers.some(
    (layer) => layer.id === workspace.activeLayerId,
  )
    ? workspace.activeLayerId
    : layers[0].id;
  const localItemsBySessionId = new Map(
    runtimeWorkspace?.sessions
      .filter(
        (session) =>
          (session.sourceConfig.kind === "local" ||
            session.sourceConfig.kind === "url") &&
          (session.runtimeItems?.length ?? 0) > 0,
      )
      .map((session) => [session.id, session.runtimeItems ?? []]),
  );
  const urlResolutionsBySessionId = new Map(
    runtimeWorkspace?.sessions
      .filter(
        (session) =>
          session.sourceConfig.kind === "url" && Boolean(session.urlResolution),
      )
      .map((session) => [session.id, session.urlResolution]),
  );
  const localFilesBySessionId = new Map(
    runtimeWorkspace?.sessions
      .filter(
        (session) =>
          session.sourceConfig.kind === "local" &&
          (session.localFiles?.length ?? 0) > 0,
      )
      .map((session) => [session.id, session.localFiles ?? []]),
  );

  return {
    ...workspace,
    layers,
    activeLayerId,
    globalTimerSeconds: resolveWorkspaceGlobalSeconds(workspace),
    sessions: workspace.sessions.map((session) => ({
      ...session,
      layerId: session.layerId ?? activeLayerId,
      timerMode: normalizeTimerMode(session.timerMode),
      runtimeItems:
        session.sourceConfig.kind === "local" ||
        session.sourceConfig.kind === "url"
          ? localItemsBySessionId.get(session.id)
          : undefined,
      urlResolution:
        session.sourceConfig.kind === "url"
          ? urlResolutionsBySessionId.get(session.id)
          : undefined,
      localFiles:
        session.sourceConfig.kind === "local"
          ? localFilesBySessionId.get(session.id)
          : undefined,
    })),
  };
}

function toMultiTimerState(sessions: FeedSession[]) {
  return Object.fromEntries(
    sessions.map((session) => [
      session.id,
      {
        mode: session.timerMode,
        timer: session.timer,
      },
    ]),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeRedditLimit(value: number) {
  return clamp(value || DEFAULT_REDDIT_MEDIA_LIMIT, 1, MAX_REDDIT_MEDIA_LIMIT);
}

function splitRedditUrls(value: string) {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildSubredditListingUrls(
  value: string,
  sort: RedditListingSort,
  timeRange: RedditTimeRange,
) {
  const entries = value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!entries.length) throw new Error("Enter one or more subreddit names");

  return Array.from(
    new Set(
      entries.map((entry) => {
        const subreddit = normalizeSubredditName(entry);
        if (!subreddit) {
          throw new Error(`Unsupported subreddit name: ${entry}`);
        }

        return subreddit;
      }),
    ),
  ).map((subreddit) => buildSubredditListingUrl(subreddit, sort, timeRange));
}

function buildSubredditListingUrl(
  value: string,
  sort: RedditListingSort,
  timeRange: RedditTimeRange,
) {
  const subreddit = normalizeSubredditName(value);
  if (!subreddit) throw new Error("Enter a subreddit name");

  const url = new URL(`https://www.reddit.com/r/${subreddit}/${sort}/`);
  if (sort === "top" || sort === "controversial") {
    url.searchParams.set("t", timeRange);
  }

  return url.toString();
}

function normalizeSubredditName(value: string) {
  const trimmed = value.trim().replace(/^\/?r\//i, "");
  const withoutSlashes = trimmed.split(/[/?#]/)[0] ?? "";

  return /^[A-Za-z0-9_]{2,21}$/.test(withoutSlashes) ? withoutSlashes : null;
}

async function fetchRedditRuntimeItems(
  urls: string[],
  limit = DEFAULT_REDDIT_MEDIA_LIMIT,
) {
  const params = new URLSearchParams({
    allowNsfw: "true",
    limit: String(limit),
  });
  for (const url of urls) {
    params.append("urls", url);
  }
  const response = await fetch(`/api/reddit/listing?${params}`, {
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "reddit_error");
  }

  return flattenRuntimeMediaItems(payload.items as RuntimeFeedItem[]);
}

function flattenRuntimeMediaItems(items: RuntimeFeedItem[]) {
  return items.flatMap((item) => {
    if (item.media.length <= 1) return [item];

    return item.media.map((media, index) => ({
      ...item,
      id: `${item.id}:media:${index}`,
      media: [media],
    }));
  });
}

async function filterHiddenRedditItems(
  items: RuntimeFeedItem[],
  hiddenItemIdHashes: string[] = [],
) {
  if (!hiddenItemIdHashes.length) return items;

  const hidden = new Set(hiddenItemIdHashes);
  const hashPairs = await Promise.all(
    items.map(async (item) => {
      return {
        item,
        hashes:
          item.source === "reddit" ? await redditHashesForItemId(item.id) : [],
      };
    }),
  );

  return hashPairs
    .filter(({ hashes }) => hashes.every((hash) => !hidden.has(hash)))
    .map(({ item }) => item);
}

async function redditHashesForItemId(itemId: string) {
  const itemHashInput = redditItemHashInput(itemId);
  const parentHashInput = redditParentPostHashInput(itemId);
  const hashes = [await hashRedditItemId(itemHashInput)];

  if (parentHashInput !== itemHashInput) {
    hashes.push(await hashRedditItemId(parentHashInput));
  }

  return hashes;
}

async function hashRedditItemId(itemId: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(redditItemHashInput(itemId)),
  );

  return `sha256:${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function redditItemHashInput(itemId: string) {
  return itemId;
}

function redditParentPostHashInput(itemId: string) {
  const [source, postId] = itemId.split(":");
  return source === "reddit" && postId ? `reddit:${postId}` : itemId;
}

function redditHiddenItemHashes(sourceConfig: PersistedSourceConfig) {
  if (sourceConfig.kind !== "reddit") return [];

  return [
    ...(sourceConfig.hiddenItemIdHashes ?? []),
    ...(sourceConfig.hiddenPostIdHashes ?? []),
  ];
}

function redditRuntimeItemLabels(items: RuntimeFeedItem[]) {
  const counts = items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.title] = (accumulator[item.title] ?? 0) + 1;
    return accumulator;
  }, {});
  const indexes = new Map<string, number>();

  return new Map(
    items.map((item) => {
      const nextIndex = (indexes.get(item.title) ?? 0) + 1;
      indexes.set(item.title, nextIndex);

      return [
        item.id,
        counts[item.title] > 1 ? `${item.title} item ${nextIndex}` : item.title,
      ];
    }),
  );
}

function resolveWorkspaceGlobalSeconds(
  workspace: Pick<SerializedWorkspace, "globalTimerSeconds" | "sessions">,
) {
  const stored = workspace.globalTimerSeconds;
  const legacyGlobalSessionSeconds = workspace.sessions.find(
    (session) => normalizeTimerMode(session.timerMode) === "global",
  )?.timerSeconds;
  const seconds =
    stored ??
    legacyGlobalSessionSeconds ??
    DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS;

  return clamp(seconds, 1, 120);
}

function redditLinksTitle(urls: string[], items: RuntimeFeedItem[]) {
  const subredditsFromUrls = uniqueSubreddits(urls.map(subredditFromRedditUrl));
  const subreddits = subredditsFromUrls.length
    ? subredditsFromUrls
    : uniqueSubreddits(items.map((item) => item.subreddit));

  if (subreddits.length) {
    return subreddits.map((subreddit) => `r/${subreddit}`).join(", ");
  }

  return urls.length === 1 ? "Reddit post" : "Reddit links";
}

function uniqueSubreddits(values: Array<string | null | undefined>) {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    if (!value) return [];

    const key = value.toLowerCase();
    if (seen.has(key)) return [];

    seen.add(key);
    return [value];
  });
}

function subredditFromRedditUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    const subredditIndex = segments.indexOf("r");
    const commentsIndex = segments.indexOf("comments");

    if (subredditIndex !== -1 && commentsIndex > subredditIndex + 1) {
      return segments[subredditIndex + 1];
    }

    if (subredditIndex !== -1 && segments[subredditIndex + 1]) {
      return segments[subredditIndex + 1];
    }
  } catch {
    return null;
  }

  return null;
}

function keyMoveDirection(key: string): 1 | -1 | null {
  if (key === "ArrowDown" || key === "ArrowRight") return 1;
  if (key === "ArrowUp" || key === "ArrowLeft") return -1;
  return null;
}

function isKeyboardEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      "input, textarea, select, button, a, [contenteditable=true]",
    ),
  );
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2)}`;
}

function parseWorkspaceSessionStore(
  value: string | null,
): WorkspaceSessionStore | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as WorkspaceSessionStore;
    if (
      !Array.isArray(parsed.openWorkspaceIds) ||
      typeof parsed.activeWorkspaceId !== "string"
    ) {
      return null;
    }

    return {
      openWorkspaceIds: parsed.openWorkspaceIds.filter(
        (id): id is string => typeof id === "string",
      ),
      activeWorkspaceId: parsed.activeWorkspaceId,
    };
  } catch {
    return null;
  }
}

function writeWorkspaceSessionStore(
  tabs: WorkspaceTab[],
  activeWorkspaceId: string,
  savedWorkspaces: Record<string, SerializedWorkspace>,
) {
  const openWorkspaceIds = tabs
    .map((tab) => tab.id)
    .filter((id) => Boolean(savedWorkspaces[id]));
  const sessionActiveId = openWorkspaceIds.includes(activeWorkspaceId)
    ? activeWorkspaceId
    : "";

  window.sessionStorage.setItem(
    WORKSPACE_SESSION_STORAGE_KEY,
    JSON.stringify({ openWorkspaceIds, activeWorkspaceId: sessionActiveId }),
  );
}

function nextLayoutName(
  tabs: WorkspaceTab[],
  savedWorkspaces: Record<string, SerializedWorkspace>,
) {
  const usedNames = new Set([
    ...tabs.map((tab) => normalizeLayoutName(tab.name)),
    ...Object.values(savedWorkspaces).map((workspace) =>
      normalizeLayoutName(workspace.name),
    ),
  ]);
  let index = 1;

  while (usedNames.has(normalizeLayoutName(`Layout ${index}`))) {
    index += 1;
  }

  return `Layout ${index}`;
}

function hasDuplicateLayoutName(
  name: string,
  currentId: string,
  tabs: WorkspaceTab[],
  savedWorkspaces: Record<string, SerializedWorkspace>,
) {
  const normalized = normalizeLayoutName(name);

  return (
    tabs.some(
      (tab) =>
        tab.id !== currentId && normalizeLayoutName(tab.name) === normalized,
    ) ||
    Object.values(savedWorkspaces).some(
      (workspace) =>
        workspace.id !== currentId &&
        normalizeLayoutName(workspace.name) === normalized,
    )
  );
}

function workspaceFileCount(workspace: SerializedWorkspace) {
  return workspace.sessions.reduce(
    (count, session) => count + sessionFileCount(session),
    0,
  );
}

function workspaceLayerSummaries(workspace: SerializedWorkspace) {
  const layers = normalizeWorkspaceLayers(workspace.layers);
  const activeLayerId = layers.some(
    (layer) => layer.id === workspace.activeLayerId,
  )
    ? workspace.activeLayerId
    : layers[0].id;

  return layers.map((layer) => {
    const layerSessions = workspace.sessions.filter(
      (session) => (session.layerId ?? activeLayerId) === layer.id,
    );

    return {
      id: layer.id,
      name: layer.name,
      sourceCount: layerSessions.length,
      fileCount: layerSessions.reduce(
        (count, session) => count + sessionFileCount(session),
        0,
      ),
    };
  });
}

function sessionFileCount(session: FeedSession | WorkspaceSessionInput) {
  if (session.sourceConfig.kind === "local") {
    return session.sourceConfig.fileCount;
  }

  if (session.sourceConfig.kind === "url") {
    const runtimeCount =
      "items" in session
        ? session.items.length
        : "runtimeItems" in session
          ? (session.runtimeItems?.length ?? 0)
          : 0;

    return runtimeCount || 1;
  }

  const runtimeCount =
    "items" in session
      ? session.items.length
      : "runtimeItems" in session
        ? (session.runtimeItems?.length ?? 0)
        : 0;

  return runtimeCount || session.sourceConfig.urls.length;
}

function hasPlayableRuntimeItems(session: FeedSession) {
  return session.items.length > 0;
}

function isIframeUrlSession(session: FeedSession) {
  return (
    session.sourceConfig.kind === "url" &&
    session.urlResolution?.status === "resolved" &&
    Boolean(urlResolutionIframeUrl(session.urlResolution))
  );
}

function urlResolutionIframeUrl(resolution: UrlRuntimeResolution) {
  if (resolution.status !== "resolved") return null;
  if (resolution.mode === "iframe" || resolution.mode === "provider") {
    return resolution.iframeUrl ?? null;
  }

  return null;
}

function activeIframeFallbackLimit() {
  if (typeof window !== "undefined" && window.innerWidth < 768) return 1;

  return 4;
}

function urlHostLabel(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "URL source";
  }
}

function normalizeLayoutName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function limitLayoutName(name: string) {
  return name.slice(0, MAX_LAYOUT_NAME_LENGTH);
}

function normalizeLegacyLayoutName(name: string) {
  return name.replace(/^Session(\s+\d+)$/i, "Layout$1");
}

function normalizeStoredLayoutNames(
  workspaces: SerializedWorkspace[],
  startIndex = 1,
) {
  const allDefaultNames = workspaces.every((workspace) =>
    /^Layout\s+\d+$/i.test(workspace.name.trim()),
  );

  if (!allDefaultNames) return workspaces;

  return workspaces.map((workspace, index) => ({
    ...workspace,
    name: `Layout ${index + startIndex}`,
  }));
}

function getUploadableFiles(files: File[]) {
  return files.filter(isUploadableFile);
}

function isUploadableFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/")
  );
}

async function filesFromDataTransfer(dataTransfer: DataTransfer) {
  const entries: FileSystemEntryLike[] = [];
  for (const item of Array.from(dataTransfer.items ?? [])) {
    const entry = (item as DataTransferItemWithEntry).webkitGetAsEntry?.() as
      | FileSystemEntryLike
      | null
      | undefined;
    if (entry) entries.push(entry);
  }

  if (entries.length) {
    return (await Promise.all(entries.map(filesFromFileSystemEntry))).flat();
  }

  return Array.from(dataTransfer.files ?? []);
}

async function filesFromFileSystemEntry(
  entry: FileSystemEntryLike,
): Promise<File[]> {
  if (entry.isFile) {
    return [await fileFromFileSystemEntry(entry as FileSystemFileEntryLike)];
  }

  if (entry.isDirectory) {
    const children = await entriesFromDirectoryEntry(
      entry as FileSystemDirectoryEntryLike,
    );
    return (await Promise.all(children.map(filesFromFileSystemEntry))).flat();
  }

  return [];
}

function fileFromFileSystemEntry(entry: FileSystemFileEntryLike) {
  return new Promise<File>((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function entriesFromDirectoryEntry(entry: FileSystemDirectoryEntryLike) {
  const reader = entry.createReader();
  const entries: FileSystemEntryLike[] = [];

  while (true) {
    const batch = await new Promise<FileSystemEntryLike[]>(
      (resolve, reject) => {
        reader.readEntries(resolve, reject);
      },
    );

    if (!batch.length) return entries;
    entries.push(...batch);
  }
}
