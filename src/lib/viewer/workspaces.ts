import type { RuntimeFeedItem } from "@/lib/feed/types";
import { DEFAULT_FIXED_GRID, type FixedGrid, type FreeRect } from "./layout";
import type { TimerMode } from "./timer";

export const WORKSPACE_STORAGE_KEY = "scrollable.workspaces.v1";

export type WorkspaceLayoutMode = "fixed" | "free";

export type RedditSourceConfig = {
  kind: "reddit";
  subreddit: string;
  sort: "top" | "hot" | "new";
  timeRange: "hour" | "day" | "week" | "month" | "year" | "all";
  limit: number;
  skip: number;
  allowNsfw: boolean;
};

export type LocalSourceConfig = {
  kind: "local";
  fileCount: number;
};

export type PersistedSourceConfig = RedditSourceConfig | LocalSourceConfig;

export type WorkspaceSessionInput = {
  id: string;
  title: string;
  timerMode: TimerMode;
  timerSeconds: number;
  timerActiveIndex?: number;
  fixedSlot: number;
  freeRect: FreeRect;
  sourceConfig: PersistedSourceConfig;
  runtimeItems?: RuntimeFeedItem[];
};

export type SerializedWorkspaceSession = Omit<
  WorkspaceSessionInput,
  "runtimeItems"
>;

export type SerializedWorkspace = {
  id: string;
  name: string;
  layoutMode: WorkspaceLayoutMode;
  fixedGrid: FixedGrid;
  sessions: SerializedWorkspaceSession[];
  updatedAt: string;
};

export type WorkspaceStore = {
  activeWorkspaceId: string;
  workspaces: SerializedWorkspace[];
};

export function createEmptyWorkspace(
  id: string,
  name: string,
): SerializedWorkspace {
  return {
    id,
    name,
    layoutMode: "fixed",
    fixedGrid: DEFAULT_FIXED_GRID,
    sessions: [],
    updatedAt: new Date().toISOString(),
  };
}

export function serializeWorkspace(workspace: {
  id: string;
  name: string;
  layoutMode: WorkspaceLayoutMode;
  fixedGrid: FixedGrid;
  sessions: WorkspaceSessionInput[];
}): SerializedWorkspace {
  return {
    id: workspace.id,
    name: workspace.name,
    layoutMode: workspace.layoutMode,
    fixedGrid: workspace.fixedGrid,
    sessions: workspace.sessions.map(
      ({
        id,
        title,
        timerMode,
        timerSeconds,
        timerActiveIndex,
        fixedSlot,
        freeRect,
        sourceConfig,
      }) => ({
        id,
        title,
        timerMode,
        timerSeconds,
        timerActiveIndex,
        fixedSlot,
        freeRect,
        sourceConfig,
      }),
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function parseWorkspaceStore(
  value: string | null,
): WorkspaceStore | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as WorkspaceStore;
    if (!Array.isArray(parsed.workspaces) || !parsed.activeWorkspaceId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
