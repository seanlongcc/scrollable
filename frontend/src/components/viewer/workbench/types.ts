import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { UrlRuntimeResolution } from "@/lib/url-source/types";
import type { FreeRect } from "@/lib/viewer/layout";
import type {
  PersistedSourceConfig,
  SerializedWorkspace,
  WorkspaceSessionInput,
  WorkspaceTemplateSlot,
} from "@/lib/viewer/workspaces";
import { DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS } from "@/lib/viewer/workspaces";
import type { TimerMode, TimerState } from "@/lib/viewer/timer";

export type {
  PersistedSourceConfig,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceLayer,
  WorkspaceSessionInput,
  WorkspaceTemplateSlot,
} from "@/lib/viewer/workspaces";

export type LayoutMode = "fixed" | "free";

export type FeedSession = {
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
  localRestoreStatus?: LocalRestoreStatus;
  isRuntimeLoading?: boolean;
  templateSlotId?: string;
  sourceConfig: PersistedSourceConfig;
};

export type LocalRestoreStatus =
  | "missing"
  | "unavailable"
  | "permission-needed";

export type WorkspaceTab = {
  id: string;
  name: string;
};

export type RuntimeWorkspace = Omit<SerializedWorkspace, "sessions"> & {
  sessions: WorkspaceSessionInput[];
  templateSlots: WorkspaceTemplateSlot[];
};

export type AccountState =
  | { status: "unconfigured" | "loading" | "signed-out" }
  | { status: "signed-in"; email: string };

export type SourceGroupingMode = "stacked" | "separate";
export type SaveKind = "layout" | "template";
export type LibraryKind = "layouts" | "templates";
export type RedditInputMode = "subreddit" | "links";
export type RedditListingSort =
  | "hot"
  | "new"
  | "rising"
  | "top"
  | "controversial";
export type RedditTimeRange = "day" | "week" | "month" | "year" | "all";

export const DEFAULT_TIMER_SECONDS = DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS;
export const DEFAULT_REDDIT_MEDIA_LIMIT = 10;
export const MAX_REDDIT_MEDIA_LIMIT = 200;
export const MAX_LAYOUT_NAME_LENGTH = 32;
export const WORKSPACE_SESSION_STORAGE_KEY = "scrollable.workspace-session.v1";
export const REDDIT_SORT_OPTIONS: Array<{
  value: RedditListingSort;
  label: string;
}> = [
  { value: "hot", label: "Hot" },
  { value: "new", label: "New" },
  { value: "rising", label: "Rising" },
  { value: "top", label: "Top" },
  { value: "controversial", label: "Controversial" },
];
export const REDDIT_TIME_OPTIONS: Array<{
  value: RedditTimeRange;
  label: string;
}> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

export type FreeDragState = {
  id: string;
  targetType: "session" | "template-slot";
  mode: "move" | "resize";
  startX: number;
  startY: number;
  cellWidth: number;
  cellHeight: number;
  startRect: FreeRect;
  currentRect: FreeRect;
};

export type FileSystemEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
};

export type FileSystemFileEntryLike = FileSystemEntryLike & {
  file: (
    successCallback: (file: File) => void,
    errorCallback?: (error: DOMException) => void,
  ) => void;
};

export type FileSystemDirectoryEntryLike = FileSystemEntryLike & {
  createReader: () => {
    readEntries: (
      successCallback: (entries: FileSystemEntryLike[]) => void,
      errorCallback?: (error: DOMException) => void,
    ) => void;
  };
};

export type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntryLike | null;
};

export type WorkspaceSessionStore = {
  openWorkspaceIds: string[];
  activeWorkspaceId: string;
};

export const FALLBACK_INITIAL_WORKSPACE_ID =
  "00000000-0000-4000-8000-000000000001";
