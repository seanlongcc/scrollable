import type { RuntimeFeedItem } from "@/lib/feed/types";
import type {
  UrlRuntimeResolution,
  UrlSourceConfig,
} from "@/lib/url-source/types";
import {
  DEFAULT_FIXED_GRID,
  createFreeRect,
  type FixedGrid,
  type FreeRect,
} from "./layout";
import type { TimerMode } from "./timer";

export const WORKSPACE_STORAGE_KEY = "scrollable.workspaces.v1";
export const WORKSPACE_TEMPLATE_STORAGE_KEY =
  "scrollable.workspace-templates.v1";
export const DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS = 10;
export const MAX_WORKSPACE_LAYERS = 3;

export type WorkspaceLayoutMode = "fixed" | "free";

export type WorkspaceLayer = {
  id: string;
  name: string;
};

export const DEFAULT_WORKSPACE_LAYERS: WorkspaceLayer[] = [
  { id: "layer-1", name: "Layer 1" },
  { id: "layer-2", name: "Layer 2" },
  { id: "layer-3", name: "Layer 3" },
];

export type RedditSourceConfig = {
  kind: "reddit";
  urls: string[];
  limit?: number;
  allowNsfw: boolean;
  hiddenItemIdHashes?: string[];
  hiddenPostIdHashes?: string[];
};

export type LocalSourceConfig = {
  kind: "local";
  fileCount: number;
  cacheSetId?: string;
};

export type PersistedSourceConfig =
  | RedditSourceConfig
  | LocalSourceConfig
  | UrlSourceConfig;

export type WorkspaceSessionInput = {
  id: string;
  title: string;
  layerId?: string;
  templateSlotId?: string;
  timerMode: TimerMode;
  timerSeconds: number;
  timerActiveIndex?: number;
  fixedSlot: number;
  freeRect: FreeRect;
  sourceConfig: PersistedSourceConfig;
  runtimeItems?: RuntimeFeedItem[];
  allRuntimeItems?: RuntimeFeedItem[];
  isOrderRandomized?: boolean;
  isAudioEnabled?: boolean;
  finishVideoBeforeAdvance?: boolean;
  randomVideoStart?: boolean;
  urlResolution?: UrlRuntimeResolution;
  localFiles?: File[];
};

export type SerializedWorkspaceSession = Omit<
  WorkspaceSessionInput,
  | "runtimeItems"
  | "allRuntimeItems"
  | "isOrderRandomized"
  | "isAudioEnabled"
  | "finishVideoBeforeAdvance"
  | "randomVideoStart"
  | "urlResolution"
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
  templateSlots?: Array<WorkspaceTemplateSlot & { layerId: string }>;
  updatedAt: string;
};

export type WorkspaceStore = {
  activeWorkspaceId: string;
  workspaces: SerializedWorkspace[];
};

export type WorkspaceTemplateSlot = {
  id: string;
  layerId?: string;
  freeRect: FreeRect;
};

export type SerializedWorkspaceTemplate = {
  id: string;
  name: string;
  layers: WorkspaceLayer[];
  activeLayerId: string;
  globalTimerSeconds: number;
  slots: Array<WorkspaceTemplateSlot & { layerId: string }>;
  updatedAt: string;
};

export type WorkspaceTemplateStore = {
  templates: SerializedWorkspaceTemplate[];
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
  templateSlots?: WorkspaceTemplateSlot[];
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
        templateSlotId,
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
        templateSlotId,
        timerMode,
        timerSeconds,
        timerActiveIndex,
        fixedSlot,
        freeRect,
        sourceConfig,
      }),
    ),
    ...(workspace.templateSlots?.length
      ? {
          templateSlots: normalizeWorkspaceTemplateSlots(
            workspace.templateSlots,
            activeLayerId,
          ),
        }
      : {}),
    updatedAt: new Date().toISOString(),
  };
}

export function serializeWorkspaceTemplate(workspace: {
  id: string;
  name: string;
  layoutMode?: WorkspaceLayoutMode;
  globalTimerSeconds?: number;
  layers?: WorkspaceLayer[];
  activeLayerId?: string;
  templateSlots?: WorkspaceTemplateSlot[];
  sessions?: WorkspaceSessionInput[];
}): SerializedWorkspaceTemplate {
  const layers = normalizeWorkspaceLayers(workspace.layers);
  const activeLayerId = layers.some(
    (layer) => layer.id === workspace.activeLayerId,
  )
    ? workspace.activeLayerId!
    : layers[0].id;

  const slots = normalizeWorkspaceTemplateSlots(
    [
      ...(workspace.templateSlots ?? []),
      ...(workspace.sessions ?? []).map((session) => ({
        id: session.id,
        layerId: session.layerId,
        freeRect: session.freeRect,
      })),
    ],
    activeLayerId,
  );

  return {
    id: workspace.id,
    name: workspace.name,
    layers,
    activeLayerId,
    globalTimerSeconds:
      workspace.globalTimerSeconds ?? DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS,
    slots,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeWorkspaceTemplateSlots(
  slots: WorkspaceTemplateSlot[] | undefined,
  activeLayerId: string,
): Array<WorkspaceTemplateSlot & { layerId: string }> {
  return (slots ?? []).map((slot) => ({
    id: slot.id,
    layerId: slot.layerId ?? activeLayerId,
    freeRect: createFreeRect(slot.freeRect),
  }));
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

export function parseWorkspaceTemplateStore(
  value: string | null,
): WorkspaceTemplateStore | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as WorkspaceTemplateStore;
    if (!Array.isArray(parsed.templates)) return null;

    return {
      templates: parsed.templates.map((template) => {
        if (
          typeof template.id !== "string" ||
          !template.id.trim() ||
          typeof template.name !== "string" ||
          !template.name.trim() ||
          !Array.isArray(template.slots)
        ) {
          throw new Error("Invalid template");
        }

        const layers = normalizeWorkspaceLayers(template.layers);
        const activeLayerId = layers.some(
          (layer) => layer.id === template.activeLayerId,
        )
          ? template.activeLayerId
          : layers[0].id;
        const slots = template.slots.map((slot) => {
          if (typeof slot.id !== "string" || !slot.id.trim()) {
            throw new Error("Invalid template slot");
          }

          return {
            id: slot.id,
            layerId:
              typeof slot.layerId === "string" && slot.layerId.trim()
                ? slot.layerId
                : activeLayerId,
            freeRect: createFreeRect(slot.freeRect),
          };
        });

        return {
          id: template.id,
          name: template.name,
          layers,
          activeLayerId,
          globalTimerSeconds:
            typeof template.globalTimerSeconds === "number"
              ? template.globalTimerSeconds
              : DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS,
          slots,
          updatedAt:
            typeof template.updatedAt === "string"
              ? template.updatedAt
              : new Date().toISOString(),
        };
      }),
    };
  } catch {
    return null;
  }
}
