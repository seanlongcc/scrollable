"use client";

import {
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  Globe,
  GripHorizontal,
  Grid2X2,
  Info,
  LayoutGrid,
  Loader2,
  LogOut,
  Maximize2,
  Move,
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
import { Switch } from "@/components/ui/switch";
import { FeedViewPane } from "@/components/viewer/feed-view-pane";
import { parseFeedConfigInput } from "@/lib/config/feed-config";
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
  type WorkspaceSessionInput,
  createEmptyWorkspace,
  parseWorkspaceStore,
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
  timerMode: TimerMode;
  timer: TimerState;
  fixedSlot: number;
  freeRect: FreeRect;
  items: RuntimeFeedItem[];
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

const DEFAULT_TIMER_SECONDS = 10;

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

export function FeedWorkbench() {
  const initialWorkspace = useMemo(
    () => ({ id: createId(), name: "Layout 1" }),
    [],
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

  const [subreddit, setSubreddit] = useState("pics");
  const [sort, setSort] = useState<"top" | "hot" | "new">("top");
  const [timeRange, setTimeRange] = useState<
    "hour" | "day" | "week" | "month" | "year" | "all"
  >("day");
  const [limit, setLimit] = useState(20);
  const [skip, setSkip] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_SECONDS);
  const [globalSeconds, setGlobalSeconds] = useState(DEFAULT_TIMER_SECONDS);
  const [allowNsfw, setAllowNsfw] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("fixed");
  const [fixedGrid, setFixedGrid] = useState<FixedGrid>(DEFAULT_FIXED_GRID);
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
  const [localUploadMode, setLocalUploadMode] = useState<
    "stacked" | "separate"
  >("stacked");
  const [freeDrag, setFreeDrag] = useState<FreeDragState | null>(null);
  const [canCacheLocalFiles, setCanCacheLocalFiles] = useState(false);
  const registryRef = useRef<LocalObjectUrlRegistry | null>(null);
  const freeGridRef = useRef<HTMLDivElement | null>(null);

  const workspaceName =
    workspaceTabs.find((tab) => tab.id === activeWorkspaceId)?.name ??
    "Layout 1";
  const visibleFixedCells = fixedGrid.columns * fixedGrid.rows;
  const selected = useMemo(
    () => sessions.find((session) => session.id === selectedId) ?? sessions[0],
    [selectedId, sessions],
  );
  const maximized = useMemo(
    () => sessions.find((session) => session.id === maximizedId),
    [maximizedId, sessions],
  );
  const hiddenFixedSessions = useMemo(
    () =>
      layoutMode === "fixed"
        ? sessions.filter((session) => session.fixedSlot >= visibleFixedCells)
        : [],
    [layoutMode, sessions, visibleFixedCells],
  );
  const visibleEmptySlots = useMemo(() => {
    const occupied = new Set(sessions.map((session) => session.fixedSlot));
    return Array.from(
      { length: visibleFixedCells },
      (_, index) => index,
    ).filter((slot) => !occupied.has(slot));
  }, [sessions, visibleFixedCells]);
  const availableSeparateSourceSlots = useMemo(
    () =>
      layoutMode === "fixed"
        ? visibleEmptySlots.length
        : countAvailableFreeUnitRects(
            sessions.map((session) => session.freeRect),
          ),
    [layoutMode, sessions, visibleEmptySlots],
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
      const blankTab = {
        id: initialWorkspace.id,
        name: nextLayoutName([], nextSaved),
      };
      const blankWorkspace = toRuntimeWorkspace(
        createEmptyWorkspace(blankTab.id, blankTab.name),
      );
      const tabs = [
        blankTab,
        ...normalizedWorkspaces.map(({ id, name }) => ({ id, name })),
      ];

      setWorkspaceTabs(tabs);
      setSavedWorkspaces(nextSaved);
      setWorkspaceStates({
        [blankWorkspace.id]: blankWorkspace,
        ...Object.fromEntries(
          normalizedWorkspaces.map((workspace) => [
            workspace.id,
            toRuntimeWorkspace(workspace),
          ]),
        ),
      });
      setActiveWorkspaceId(blankWorkspace.id);
      applyWorkspaceSnapshot(blankWorkspace);
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
      const config = parseFeedConfigInput({
        subreddit,
        sort,
        timeRange,
        limit,
        skip,
        timerSeconds,
      });
      const params = new URLSearchParams({
        subreddit: config.subreddit,
        sort: config.sort,
        timeRange: config.timeRange,
        limit: String(config.limit),
        skip: String(config.skip),
        allowNsfw: String(allowNsfw),
      });
      const response = await fetch(`/api/reddit/listing?${params}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "reddit_error");
      }

      addSession({
        title: `r/${config.subreddit}`,
        sourceConfig: {
          kind: "reddit",
          subreddit: config.subreddit,
          sort: config.sort,
          timeRange: config.timeRange,
          limit: config.limit,
          skip: config.skip,
          allowNsfw,
        },
        items: payload.items as RuntimeFeedItem[],
      });
      setIsSourceOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Reddit fetch failed",
      );
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
      localUploadMode === "separate" &&
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
      if (localUploadMode === "separate") {
        const sources = await Promise.all(
          uploadableFiles.map(async (file, index) => {
            const cacheSetId = await cacheLocalFiles([file]);

            return {
              title: items[index].title,
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
      applyLocalRuntimeItems(id, items, await cacheLocalFiles(files));
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
    await saveLocalFiles(cacheSetId, files);
    return cacheSetId;
  }

  function applyLocalRuntimeItems(
    id: string,
    items: RuntimeFeedItem[],
    cacheSetId?: string,
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
    sourceConfig,
  }: {
    title: string;
    items: RuntimeFeedItem[];
    sourceConfig: PersistedSourceConfig;
  }) {
    addSessions([{ title, items, sourceConfig }]);
  }

  function addSessions(
    sources: Array<{
      title: string;
      items: RuntimeFeedItem[];
      sourceConfig: PersistedSourceConfig;
    }>,
  ) {
    setSessions((current) => {
      const next = [...current];
      const freeRects = findBestAvailableFreeRects(
        next.map((session) => session.freeRect),
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
        const fixedSlot = nextFixedSlot(next, preferredSlot);
        preferredSlot = null;
        selectedSessionId = id;
        next.push({
          id,
          title: source.title,
          timerMode: "global" as TimerMode,
          timer: createTimerState({
            durationSeconds: globalSeconds,
            itemCount: source.items.length,
          }),
          fixedSlot,
          freeRect,
          items: source.items,
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
            .filter((candidate) => candidate.id !== id)
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

      let cloneIndex = 0;
      const emptySlots = Array.from(
        { length: visibleFixedCells },
        (_, index) => index,
      ).filter(
        (slot) => !current.some((session) => session.fixedSlot === slot),
      );
      const freeRects = findAvailableFreeRectsBySize(
        current.map((session) => session.freeRect),
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
    setSaveName(workspaceName);
    setSaveError(null);
    setIsSaveOpen(true);
  }

  async function saveLayoutAs() {
    const nextName = saveName.trim();

    if (!nextName) {
      setSaveError("Layout name is required");
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
    return { snapshot, store };
  }

  function currentWorkspaceState(
    nameOverride = workspaceName,
  ): RuntimeWorkspace {
    return {
      id: activeWorkspaceId,
      name: nameOverride,
      layoutMode,
      fixedGrid,
      updatedAt: new Date().toISOString(),
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        timerMode: normalizeTimerMode(session.timerMode),
        timerSeconds: session.timer.durationSeconds,
        timerActiveIndex: session.timer.activeIndex,
        fixedSlot: session.fixedSlot,
        freeRect: session.freeRect,
        sourceConfig: session.sourceConfig,
        runtimeItems: session.items,
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
  }

  function beginWorkspaceRename(tab: WorkspaceTab) {
    setEditingWorkspaceId(tab.id);
    setEditingWorkspaceName(tab.name);
  }

  function commitWorkspaceRename() {
    if (!editingWorkspaceId) return;

    const nextName = editingWorkspaceName.trim();
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
    const nextSaved = { ...savedWorkspaces };

    if (nextSaved[editingWorkspaceId]) {
      nextSaved[editingWorkspaceId] = serializeWorkspace(renamedWorkspace);
    }

    setWorkspaceTabs(nextTabs);
    setWorkspaceStates(nextStates);
    writeWorkspaceStore(nextSaved, activeWorkspaceId);
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
  }

  function openSavedWorkspace(id: string) {
    const snapshot = savedWorkspaces[id];
    if (!snapshot) return;

    const current = currentWorkspaceState();
    const currentAwareStates = { ...workspaceStates, [current.id]: current };
    const runtimeSnapshot = toRuntimeWorkspaceWithLocalRuntime(
      snapshot,
      currentAwareStates[snapshot.id],
    );
    const nextTabs = workspaceTabs.some((tab) => tab.id === id)
      ? workspaceTabs
      : [...workspaceTabs, { id: snapshot.id, name: snapshot.name }];
    const nextStates = {
      ...currentAwareStates,
      [snapshot.id]: runtimeSnapshot,
    };

    setWorkspaceTabs(nextTabs);
    setWorkspaceStates(nextStates);
    setActiveWorkspaceId(snapshot.id);
    applyWorkspaceSnapshot(runtimeSnapshot);
    writeWorkspaceStore(savedWorkspaces, snapshot.id);
    setIsLayoutsOpen(false);
  }

  function deleteSavedWorkspace(id: string) {
    const nextSaved = { ...savedWorkspaces };
    const deleted = nextSaved[id];
    delete nextSaved[id];

    writeWorkspaceStore(nextSaved, activeWorkspaceId);
    if (deleted) toast.success(`Deleted ${deleted.name}`);
  }

  function applyWorkspaceSnapshot(
    snapshot: SerializedWorkspace | RuntimeWorkspace,
  ) {
    setLayoutMode(snapshot.layoutMode);
    setFixedGrid(snapshot.fixedGrid);
    const nextSessions = snapshot.sessions.map((session) => {
      const items =
        "runtimeItems" in session ? (session.runtimeItems ?? []) : [];
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
        timerMode: normalizeTimerMode(session.timerMode),
        timer: { ...timer, activeIndex },
        fixedSlot: session.fixedSlot,
        freeRect: session.freeRect,
        items,
        isRuntimeLoading:
          (session.sourceConfig.kind === "reddit" ||
            (session.sourceConfig.kind === "local" &&
              Boolean(session.sourceConfig.cacheSetId))) &&
          items.length === 0,
        sourceConfig: session.sourceConfig,
      };
    });

    setSessions(nextSessions);
    setGalleryIndexes({});
    setSelectedId(snapshot.sessions[0]?.id ?? null);
    setMaximizedId(null);
    void hydrateRuntimeItems(nextSessions);
  }

  async function hydrateRuntimeItems(nextSessions: FeedSession[]) {
    const sessionsToHydrate = nextSessions.filter(
      (session) =>
        session.items.length === 0 &&
        (session.sourceConfig.kind === "reddit" ||
          (session.sourceConfig.kind === "local" &&
            Boolean(session.sourceConfig.cacheSetId))),
    );

    if (!sessionsToHydrate.length) return;

    const hydrated = await Promise.all(
      sessionsToHydrate.map(async (session) => {
        try {
          const items =
            session.sourceConfig.kind === "reddit"
              ? await fetchRuntimeItemsForSource(session.sourceConfig)
              : await fetchLocalRuntimeItemsForSource(session.sourceConfig);
          return { id: session.id, items };
        } catch (error) {
          toast.error(
            error instanceof Error
              ? `Could not load ${session.title}: ${error.message}`
              : `Could not load ${session.title}`,
          );
          return { id: session.id, items: [] as RuntimeFeedItem[] };
        }
      }),
    );
    const itemsBySession = new Map(
      hydrated.map(({ id, items }) => [id, items]),
    );

    setSessions((current) =>
      current.map((session) => {
        const items = itemsBySession.get(session.id);
        if (!items) return session;

        return {
          ...session,
          items,
          isRuntimeLoading: false,
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

  async function fetchRuntimeItemsForSource(
    sourceConfig: PersistedSourceConfig,
  ) {
    if (sourceConfig.kind !== "reddit") return [];

    const params = new URLSearchParams({
      subreddit: sourceConfig.subreddit,
      sort: sourceConfig.sort,
      timeRange: sourceConfig.timeRange,
      limit: String(sourceConfig.limit),
      skip: String(sourceConfig.skip),
      allowNsfw: String(sourceConfig.allowNsfw),
    });
    const response = await fetch(`/api/reddit/listing?${params}`, {
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "reddit_error");
    }

    return payload.items as RuntimeFeedItem[];
  }

  async function fetchLocalRuntimeItemsForSource(
    sourceConfig: PersistedSourceConfig,
  ) {
    if (sourceConfig.kind !== "local" || !sourceConfig.cacheSetId) return [];

    const result = await loadLocalFiles(sourceConfig.cacheSetId);
    if (result.status !== "loaded") return [];

    return createLocalRuntimeItems(getUploadableFiles(result.files));
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
          <div className="grid gap-2 lg:grid-cols-[minmax(12rem,1fr)_auto_minmax(12rem,1fr)] lg:items-center">
            <div className="flex min-w-0 items-center justify-start">
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
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
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
                aria-label="Open layouts"
                onClick={() => setIsLayoutsOpen(true)}
              >
                <FolderOpen />
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
                      setEditingWorkspaceName(event.target.value)
                    }
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
        subreddit={subreddit}
        sort={sort}
        timeRange={timeRange}
        limit={limit}
        skip={skip}
        timerSeconds={timerSeconds}
        allowNsfw={allowNsfw}
        isLoading={isLoading}
        localUploadMode={localUploadMode}
        setSubreddit={setSubreddit}
        setSort={setSort}
        setTimeRange={setTimeRange}
        setLimit={setLimit}
        setSkip={setSkip}
        setTimerSeconds={setTimerSeconds}
        setAllowNsfw={setAllowNsfw}
        setLocalUploadMode={setLocalUploadMode}
        fetchRedditFeed={fetchRedditFeed}
        addLocalFiles={addLocalFiles}
        addDroppedLocalFiles={addDroppedLocalFiles}
        allowLocalFileDrop={allowLocalFileDrop}
      />
      <LayoutDialog
        open={isLayoutsOpen}
        onOpenChange={setIsLayoutsOpen}
        workspaces={Object.values(savedWorkspaces)}
        onOpenWorkspace={openSavedWorkspace}
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
              <div className="text-sm text-muted-foreground md:justify-self-start">
                {sessions.length} source{sessions.length === 1 ? "" : "s"}{" "}
                active · {layoutMode === "fixed" ? "Fixed" : "Free"} layout
                {hiddenFixedSessions.length ? (
                  <span className="ml-2 rounded-full border border-primary/35 bg-surface-elevated px-2 py-0.5 text-xs text-primary">
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
              <FixedGridView
                sessions={sessions}
                visibleCells={visibleFixedCells}
                fixedGrid={fixedGrid}
                galleryIndexes={galleryIndexes}
                videoPositions={videoPositions}
                selectedId={selectedId}
                hideUi={isUiHidden}
                showInfo={showAllInfo}
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
              />
            ) : (
              <FreeGridView
                sessions={sessions}
                galleryIndexes={galleryIndexes}
                videoPositions={videoPositions}
                selectedId={selectedId}
                hideUi={isUiHidden}
                showInfo={showAllInfo}
                gridRef={freeGridRef}
                freeDrag={freeDrag}
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
              />
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
  onOpenWorkspace,
  onDeleteWorkspace,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: SerializedWorkspace[];
  onOpenWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
}) {
  const sortedWorkspaces = [...workspaces].sort((first, second) =>
    second.updatedAt.localeCompare(first.updatedAt),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[min(92vw,34rem)] overflow-y-auto border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)]">
        <DialogHeader>
          <DialogTitle>Saved layouts</DialogTitle>
          <DialogDescription>
            Local layouts store tabs, slots, timers, and source config only.
            Media loads at runtime.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {sortedWorkspaces.length ? (
            sortedWorkspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="grid gap-2 rounded-lg border border-border bg-surface p-3"
              >
                <div>
                  <div className="font-medium">{workspace.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {workspace.layoutMode} · {workspace.sessions.length} source
                    {workspace.sessions.length === 1 ? "" : "s"} ·{" "}
                    {workspaceLocalFileCount(workspace)} file
                    {workspaceLocalFileCount(workspace) === 1 ? "" : "s"} ·
                    saved locally
                  </div>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenWorkspace(workspace.id)}
                    title={`Open ${workspace.name}`}
                  >
                    <FolderOpen />
                    Open {workspace.name}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => onDeleteWorkspace(workspace.id)}
                    aria-label={`Delete ${workspace.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No saved layouts yet. Use Save layout first.
            </div>
          )}
        </div>
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
          <DialogDescription>
            Save layout controls and source config. Runtime media stays out of
            storage.
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
              onChange={(event) => onNameChange(event.target.value)}
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
          <DialogDescription>
            Sign in to sync layout metadata to your account. Runtime media stays
            out of storage.
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
  subreddit,
  sort,
  timeRange,
  limit,
  skip,
  timerSeconds,
  allowNsfw,
  isLoading,
  localUploadMode,
  setSubreddit,
  setSort,
  setTimeRange,
  setLimit,
  setSkip,
  setTimerSeconds,
  setAllowNsfw,
  setLocalUploadMode,
  fetchRedditFeed,
  addLocalFiles,
  addDroppedLocalFiles,
  allowLocalFileDrop,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subreddit: string;
  sort: "top" | "hot" | "new";
  timeRange: "hour" | "day" | "week" | "month" | "year" | "all";
  limit: number;
  skip: number;
  timerSeconds: number;
  allowNsfw: boolean;
  isLoading: boolean;
  localUploadMode: "stacked" | "separate";
  setSubreddit: (value: string) => void;
  setSort: (value: "top" | "hot" | "new") => void;
  setTimeRange: (
    value: "hour" | "day" | "week" | "month" | "year" | "all",
  ) => void;
  setLimit: (value: number) => void;
  setSkip: (value: number) => void;
  setTimerSeconds: (value: number) => void;
  setAllowNsfw: (value: boolean) => void;
  setLocalUploadMode: (value: "stacked" | "separate") => void;
  fetchRedditFeed: () => void;
  addLocalFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  addDroppedLocalFiles: (event: ReactDragEvent<HTMLElement>) => void;
  allowLocalFileDrop: (event: ReactDragEvent<HTMLElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[min(92vw,42rem)] overflow-x-hidden overflow-y-auto border border-border bg-popover text-popover-foreground shadow-[0_24px_80px_rgba(0,0,0,0.72)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add source</DialogTitle>
          <DialogDescription>
            Runtime media only. Saved configs still store metadata, not media.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-5 md:grid-cols-2">
          <section className="grid min-h-full min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-border bg-surface p-3">
            <h2 className="text-sm font-medium">Local source</h2>
            <div
              className="grid h-full min-h-64 grid-rows-[auto_minmax(0,1fr)] gap-3 text-sm text-muted-foreground"
              role="group"
              aria-label="Local upload picker"
            >
              <div
                className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background/60 p-1"
                role="group"
                aria-label="Local upload grouping"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={localUploadMode === "stacked" ? "default" : "ghost"}
                  onClick={() => setLocalUploadMode("stacked")}
                  aria-label="Add local files as one stacked source"
                >
                  Stacked
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={localUploadMode === "separate" ? "default" : "ghost"}
                  onClick={() => setLocalUploadMode("separate")}
                  aria-label="Add local files as separate sources"
                >
                  Separate
                </Button>
              </div>

              <div className="grid min-h-0 grid-rows-2 gap-2">
                <Label
                  role="button"
                  tabIndex={0}
                  aria-label="Drop files"
                  onDragOver={allowLocalFileDrop}
                  onDragEnter={allowLocalFileDrop}
                  onDrop={addDroppedLocalFiles}
                  className="grid size-full min-h-0 cursor-pointer place-items-center gap-2 rounded-lg border border-dashed border-border/70 bg-background/55 p-4 text-center transition hover:border-primary/70 hover:bg-muted/55 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <Upload className="size-6 text-primary" />
                  <span className="grid gap-1">
                    <span className="text-sm font-medium text-foreground">
                      Files
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Drop files here or click to select
                    </span>
                  </span>
                  <span className="sr-only">Image/video files</span>
                  <Input
                    type="file"
                    accept="image/*,video/*"
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
                  className="grid size-full min-h-0 cursor-pointer place-items-center gap-2 rounded-lg border border-dashed border-border/70 bg-background/55 p-4 text-center transition hover:border-primary/70 hover:bg-muted/55 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <FolderOpen className="size-6 text-primary" />
                  <span className="grid gap-1">
                    <span className="text-sm font-medium text-foreground">
                      Folder
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Drop a folder here or click to select
                    </span>
                  </span>
                  <span className="sr-only">Image/video folder</span>
                  <DirectoryInput
                    type="file"
                    accept="image/*,video/*"
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

          <section className="grid min-w-0 content-start gap-3 rounded-lg border border-border bg-surface p-3">
            <h2 className="text-sm font-medium">Reddit source</h2>
            <Label className="grid min-w-0 gap-1 text-sm">
              Subreddit
              <Input
                value={subreddit}
                onChange={(event) => setSubreddit(event.target.value)}
                className="w-full"
              />
            </Label>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <Label className="grid min-w-0 gap-1 text-sm">
                Sort
                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as "top" | "hot" | "new")
                  }
                  className="h-8 w-full rounded-lg border border-input bg-background/70 px-2 text-sm"
                >
                  <option value="top">top</option>
                  <option value="hot">hot</option>
                  <option value="new">new</option>
                </select>
              </Label>
              <Label className="grid min-w-0 gap-1 text-sm">
                Range
                <select
                  value={timeRange}
                  onChange={(event) =>
                    setTimeRange(
                      event.target.value as
                        | "hour"
                        | "day"
                        | "week"
                        | "month"
                        | "year"
                        | "all",
                    )
                  }
                  className="h-8 w-full rounded-lg border border-input bg-background/70 px-2 text-sm"
                >
                  <option value="hour">hour</option>
                  <option value="day">day</option>
                  <option value="week">week</option>
                  <option value="month">month</option>
                  <option value="year">year</option>
                  <option value="all">all</option>
                </select>
              </Label>
            </div>
            <NumberField
              label="Limit"
              value={limit}
              min={1}
              max={100}
              onChange={setLimit}
            />
            <NumberField
              label="Skip"
              value={skip}
              min={0}
              max={100}
              onChange={setSkip}
            />
            <NumberField
              label="View timer seconds"
              value={timerSeconds}
              min={1}
              max={120}
              onChange={setTimerSeconds}
            />
            <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
              NSFW runtime
              <Switch checked={allowNsfw} onCheckedChange={setAllowNsfw} />
            </label>
            <Button
              type="button"
              onClick={fetchRedditFeed}
              disabled={isLoading}
              aria-label="Open Reddit source"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Grid2X2 />}
              Open Reddit source
            </Button>
          </section>
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
}) {
  const sessionsBySlot = new Map(
    sessions.map((session) => [session.fixedSlot, session]),
  );

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
        const session = sessionsBySlot.get(slot);
        return (
          <div
            key={slot}
            data-testid={`fixed-cell-${slot}`}
            className={cn(
              "min-h-0 rounded-xl outline outline-1 outline-transparent transition",
              !hideUi &&
                session?.id === selectedId &&
                "outline-primary ring-2 ring-primary/30",
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
  gridRef,
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
}: {
  sessions: FeedSession[];
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  selectedId: string | null;
  hideUi: boolean;
  showInfo: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
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
}) {
  return (
    <div
      ref={gridRef}
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
                "group/free relative min-h-0 rounded-xl outline outline-1 outline-transparent transition",
                !hideUi &&
                  session.id === selectedId &&
                  "outline-primary ring-2 ring-primary/30 shadow-[0_0_20px_rgba(143,239,225,0.08)]",
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
  onRemove,
  onTimerModeChange,
  onTimerSecondsChange,
  onLocalFilesSelected,
}: {
  session: FeedSession;
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
                accept="image/*,video/*"
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
      onRemove={onRemove}
      onTimerModeChange={onTimerModeChange}
      onTimerSecondsChange={onTimerSecondsChange}
    />
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
  return {
    ...workspace,
    sessions: workspace.sessions.map((session) => ({
      ...session,
      timerMode: normalizeTimerMode(session.timerMode),
    })),
  };
}

function toRuntimeWorkspaceWithLocalRuntime(
  workspace: SerializedWorkspace,
  runtimeWorkspace?: RuntimeWorkspace,
): RuntimeWorkspace {
  const localItemsBySessionId = new Map(
    runtimeWorkspace?.sessions
      .filter(
        (session) =>
          session.sourceConfig.kind === "local" &&
          (session.runtimeItems?.length ?? 0) > 0,
      )
      .map((session) => [session.id, session.runtimeItems ?? []]),
  );

  return {
    ...workspace,
    sessions: workspace.sessions.map((session) => ({
      ...session,
      timerMode: normalizeTimerMode(session.timerMode),
      runtimeItems:
        session.sourceConfig.kind === "local"
          ? localItemsBySessionId.get(session.id)
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

function workspaceLocalFileCount(workspace: SerializedWorkspace) {
  return workspace.sessions.reduce((count, session) => {
    if (session.sourceConfig.kind !== "local") return count;
    return count + session.sourceConfig.fileCount;
  }, 0);
}

function normalizeLayoutName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
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
  return file.type.startsWith("image/") || file.type.startsWith("video/");
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
