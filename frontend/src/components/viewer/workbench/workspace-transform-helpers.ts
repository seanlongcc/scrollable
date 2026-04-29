import { DEFAULT_FIXED_GRID } from "@/lib/viewer/layout";
import { normalizeTimerMode } from "@/lib/viewer/timer";
import {
  DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS,
  normalizeWorkspaceTemplateSlots,
  normalizeWorkspaceLayers,
  type SerializedWorkspaceTemplate,
} from "@/lib/viewer/workspaces";
import type {
  FeedSession,
  RuntimeWorkspace,
  SerializedWorkspace,
} from "./types";
import { clamp } from "./numeric-helpers";

export function toRuntimeWorkspace(
  workspace: SerializedWorkspace,
): RuntimeWorkspace {
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
    templateSlots: normalizeWorkspaceTemplateSlots(
      workspace.templateSlots,
      activeLayerId,
    ),
    sessions: workspace.sessions.map((session) => ({
      ...session,
      layerId: session.layerId ?? activeLayerId,
      timerMode: normalizeTimerMode(session.timerMode),
    })),
  };
}

export function toRuntimeWorkspaceWithLocalRuntime(
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
    templateSlots: normalizeWorkspaceTemplateSlots(
      workspace.templateSlots,
      activeLayerId,
    ),
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

export function withFirstLayerActive(
  workspace: RuntimeWorkspace,
): RuntimeWorkspace {
  return {
    ...workspace,
    activeLayerId: workspace.layers[0]?.id ?? workspace.activeLayerId,
  };
}

export function workspaceFromTemplate(
  template: SerializedWorkspaceTemplate,
  id: string,
  name: string,
): RuntimeWorkspace {
  const layers = normalizeWorkspaceLayers(template.layers);
  const activeLayerId = layers.some(
    (layer) => layer.id === template.activeLayerId,
  )
    ? template.activeLayerId
    : layers[0].id;

  return {
    id,
    name,
    layers,
    activeLayerId,
    layoutMode: "free",
    fixedGrid: DEFAULT_FIXED_GRID,
    globalTimerSeconds: template.globalTimerSeconds,
    sessions: [],
    templateSlots: template.slots.map((slot) => ({
      id: `${id}:${slot.id}`,
      layerId: slot.layerId ?? activeLayerId,
      freeRect: slot.freeRect,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function toMultiTimerState(sessions: FeedSession[]) {
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

export function resolveWorkspaceGlobalSeconds(
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
