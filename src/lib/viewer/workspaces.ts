import type { RuntimeFeedItem } from "@/lib/feed/types";
import { DEFAULT_FIXED_GRID, type FixedGrid, type FreeRect } from "./layout";
import type { TimerMode } from "./timer";

export const WORKSPACE_STORAGE_KEY = "scrollable.workspaces.v1";
export const DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS = 10;
export const MAX_WORKSPACE_LAYERS = 3;

export type WorkspaceLayoutMode = "fixed" | "free";

export type WorkspaceLayer = {
  id: string;
  name: string;
};

export const DEFAULT_WORKSPACE_LAYERS: WorkspaceLayer[] = [
  { id: "layer-1", name: "Layer 1" },
];

export type RedditSourceConfig = {
  kind: "reddit";
  urls: string[];
  allowNsfw: boolean;
};

export type LocalSourceConfig = {
  kind: "local";
  fileCount: number;
  cacheSetId?: string;
};

export type PersistedSourceConfig = RedditSourceConfig | LocalSourceConfig;

export type WorkspaceSessionInput = {
  id: string;
  title: string;
  layerId?: string;
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
  layers: WorkspaceLayer[];
  activeLayerId: string;
  layoutMode: WorkspaceLayoutMode;
  fixedGrid: FixedGrid;
  globalTimerSeconds: number;
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
    layers: DEFAULT_WORKSPACE_LAYERS,
    activeLayerId: DEFAULT_WORKSPACE_LAYERS[0].id,
    layoutMode: "fixed",
    fixedGrid: DEFAULT_FIXED_GRID,
    globalTimerSeconds: DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS,
    sessions: [],
    updatedAt: new Date().toISOString(),
  };
}

export function serializeWorkspace(workspace: {
  id: string;
  name: string;
  layoutMode: WorkspaceLayoutMode;
  fixedGrid: FixedGrid;
  globalTimerSeconds?: number;
  layers?: WorkspaceLayer[];
  activeLayerId?: string;
  sessions: WorkspaceSessionInput[];
}): SerializedWorkspace {
  const layers = normalizeWorkspaceLayers(workspace.layers);
  const activeLayerId = layers.some(
    (layer) => layer.id === workspace.activeLayerId,
  )
    ? workspace.activeLayerId!
    : layers[0].id;

  return {
    id: workspace.id,
    name: workspace.name,
    layers,
    activeLayerId,
    layoutMode: workspace.layoutMode,
    fixedGrid: workspace.fixedGrid,
    globalTimerSeconds:
      workspace.globalTimerSeconds ?? DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS,
    sessions: workspace.sessions.map(
      ({
        id,
        title,
        layerId,
        timerMode,
        timerSeconds,
        timerActiveIndex,
        fixedSlot,
        freeRect,
        sourceConfig,
      }) => ({
        id,
        title,
        layerId: layerId ?? activeLayerId,
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

export function normalizeWorkspaceLayers(layers?: WorkspaceLayer[]) {
  const normalized =
    layers
      ?.filter((layer) => layer.id.trim() && layer.name.trim())
      .slice(0, MAX_WORKSPACE_LAYERS)
      .map((layer, index) => ({
        id: layer.id,
        name: `Layer ${index + 1}`,
      })) ?? [];

  return normalized.length ? normalized : DEFAULT_WORKSPACE_LAYERS;
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
