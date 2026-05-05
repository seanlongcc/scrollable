import { createTimerState, normalizeTimerMode } from "@/lib/viewer/timer";
import type { FixedGrid } from "@/lib/viewer/layout";
import {
  WORKSPACE_STORAGE_KEY,
  WORKSPACE_TEMPLATE_STORAGE_KEY,
  createEmptyWorkspace,
  normalizeWorkspaceLayers,
  parseWorkspaceStore,
  parseWorkspaceTemplateStore,
  serializeWorkspace,
  serializeWorkspaceTemplate,
} from "@/lib/viewer/workspaces";
import type {
  FeedSession,
  RuntimeWorkspace,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceLayer,
  WorkspaceSessionStore,
  WorkspaceTab,
  WorkspaceTemplateSlot,
  LayoutMode,
} from "./types";
import { WORKSPACE_SESSION_STORAGE_KEY } from "./types";
import {
  clamp,
  nextLayoutName,
  normalizeLegacyLayoutName,
  normalizeStoredLayoutNames,
  resolveWorkspaceGlobalSeconds,
  toRuntimeWorkspace,
  withFirstLayerActive,
} from "./helpers";

export type WorkspaceBootstrapState = {
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
  savedWorkspaces?: Record<string, SerializedWorkspace>;
  workspaceTabs?: WorkspaceTab[];
  workspaceStates?: Record<string, RuntimeWorkspace>;
  activeWorkspaceId?: string;
  activeWorkspace?: RuntimeWorkspace;
};

export type WorkspaceSnapshotState = {
  layers: WorkspaceLayer[];
  activeLayerId: string;
  layoutMode: LayoutMode;
  fixedGrid: FixedGrid;
  globalSeconds: number;
  templateSlots: WorkspaceTemplateSlot[];
  sessions: FeedSession[];
  selectedId: string | null;
};

export function restoreWorkspaceBootstrap(
  initialWorkspace: WorkspaceTab,
): WorkspaceBootstrapState {
  const stored = parseWorkspaceStore(
    window.localStorage.getItem(WORKSPACE_STORAGE_KEY),
  );
  const templateStore = parseWorkspaceTemplateStore(
    window.localStorage.getItem(WORKSPACE_TEMPLATE_STORAGE_KEY),
  );
  const savedTemplates = Object.fromEntries(
    (templateStore?.templates ?? []).map((template) => [template.id, template]),
  );

  if (!stored?.workspaces.length) {
    return { savedTemplates };
  }

  const normalizedWorkspaces = normalizeStoredLayoutNames(
    stored.workspaces.map((workspace) => ({
      ...workspace,
      name: normalizeLegacyLayoutName(workspace.name),
    })),
  );
  const savedWorkspaces = Object.fromEntries(
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
    name: nextLayoutName([], savedWorkspaces),
  };
  const blankWorkspace = toRuntimeWorkspace(
    createEmptyWorkspace(blankTab.id, blankTab.name),
  );
  const restoredTabs = openSavedWorkspaces.map(({ id, name }) => ({
    id,
    name,
  }));
  const workspaceTabs = restoredTabs.length ? restoredTabs : [blankTab];
  const activeId = workspaceTabs.some(
    (tab) => tab.id === sessionStore?.activeWorkspaceId,
  )
    ? sessionStore!.activeWorkspaceId
    : workspaceTabs[0]!.id;
  const workspaceStates = {
    ...(restoredTabs.length ? {} : { [blankWorkspace.id]: blankWorkspace }),
    ...Object.fromEntries(
      openSavedWorkspaces.map((workspace) => [
        workspace.id,
        withFirstLayerActive(toRuntimeWorkspace(workspace)),
      ]),
    ),
  };
  const activeWorkspace = workspaceStates[activeId] ?? blankWorkspace;

  return {
    savedTemplates,
    savedWorkspaces,
    workspaceTabs,
    workspaceStates,
    activeWorkspaceId: activeWorkspace.id,
    activeWorkspace,
  };
}

export function parseWorkspaceSessionStore(
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

export function writeWorkspaceSessionStore(
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

export function createCurrentWorkspaceState({
  activeWorkspaceId,
  name,
  layers,
  activeLayerId,
  layoutMode,
  fixedGrid,
  globalSeconds,
  sessions,
  templateSlots,
}: {
  activeWorkspaceId: string;
  name: string;
  layers: WorkspaceLayer[];
  activeLayerId: string;
  layoutMode: LayoutMode;
  fixedGrid: FixedGrid;
  globalSeconds: number;
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
}): RuntimeWorkspace {
  return {
    id: activeWorkspaceId,
    name,
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
      templateSlotId: session.templateSlotId,
      timerMode: normalizeTimerMode(session.timerMode),
      timerSeconds: session.timer.durationSeconds,
      timerActiveIndex: session.timer.activeIndex,
      fixedSlot: session.fixedSlot,
      freeRect: session.freeRect,
      sourceConfig: session.sourceConfig,
      runtimeItems: session.items,
      allRuntimeItems: session.allItems,
      isOrderRandomized: session.isOrderRandomized,
      isAudioEnabled: session.isAudioEnabled,
      finishVideoBeforeAdvance: session.finishVideoBeforeAdvance,
      urlResolution: session.urlResolution,
      localFiles: session.localFiles,
    })),
    templateSlots,
  };
}

export function persistWorkspaceSnapshot(
  current: RuntimeWorkspace,
  savedWorkspaces: Record<string, SerializedWorkspace>,
) {
  const snapshot = serializeWorkspace(current);
  const nextSaved = { ...savedWorkspaces, [snapshot.id]: snapshot };
  const store = writeWorkspaceStore(nextSaved, current.id);

  return { snapshot, nextSaved, store };
}

export function persistTemplateSnapshot(
  current: RuntimeWorkspace,
  savedTemplates: Record<string, SerializedWorkspaceTemplate>,
  templateSlots: WorkspaceTemplateSlot[],
) {
  const snapshot = serializeWorkspaceTemplate({
    ...current,
    templateSlots,
  });
  const nextTemplates = { ...savedTemplates, [snapshot.id]: snapshot };
  const store = writeWorkspaceTemplateStore(nextTemplates);

  return { snapshot, nextTemplates, store };
}

export function writeWorkspaceStore(
  workspaces: Record<string, SerializedWorkspace>,
  activeId: string,
) {
  const store = {
    activeWorkspaceId: activeId,
    workspaces: Object.values(workspaces),
  };

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(store));
  return store;
}

export function writeWorkspaceTemplateStore(
  templates: Record<string, SerializedWorkspaceTemplate>,
) {
  const store = {
    templates: Object.values(templates),
  };

  window.localStorage.setItem(
    WORKSPACE_TEMPLATE_STORAGE_KEY,
    JSON.stringify(store),
  );
  return store;
}

export function workspaceSnapshotToState(
  snapshot: SerializedWorkspace | RuntimeWorkspace,
): WorkspaceSnapshotState {
  const snapshotLayers = normalizeWorkspaceLayers(snapshot.layers);
  const snapshotActiveLayerId = snapshotLayers.some(
    (layer) => layer.id === snapshot.activeLayerId,
  )
    ? snapshot.activeLayerId
    : snapshotLayers[0].id;
  const sessions = snapshot.sessions.map((session) => {
    const items = "runtimeItems" in session ? (session.runtimeItems ?? []) : [];
    const allItems =
      "allRuntimeItems" in session ? (session.allRuntimeItems ?? items) : items;
    const urlResolution =
      "urlResolution" in session ? session.urlResolution : undefined;
    const isOrderRandomized =
      "isOrderRandomized" in session ? session.isOrderRandomized : undefined;
    const isAudioEnabled =
      "isAudioEnabled" in session ? session.isAudioEnabled : undefined;
    const finishVideoBeforeAdvance =
      "finishVideoBeforeAdvance" in session
        ? session.finishVideoBeforeAdvance
        : undefined;
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
      isOrderRandomized,
      isAudioEnabled,
      finishVideoBeforeAdvance,
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

  return {
    layers: snapshotLayers,
    activeLayerId: snapshotActiveLayerId,
    layoutMode: snapshot.layoutMode,
    fixedGrid: snapshot.fixedGrid,
    globalSeconds: resolveWorkspaceGlobalSeconds(snapshot),
    templateSlots:
      "templateSlots" in snapshot ? (snapshot.templateSlots ?? []) : [],
    sessions,
    selectedId: null,
  };
}
