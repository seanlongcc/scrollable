import type { UrlRuntimeResolution } from "@/lib/url-source/types";
import { normalizeWorkspaceLayers } from "@/lib/viewer/workspaces";
import type {
  FeedSession,
  SerializedWorkspace,
  WorkspaceSessionInput,
} from "./types";

export function workspaceFileCount(workspace: SerializedWorkspace) {
  return workspace.sessions.reduce(
    (count, session) => count + sessionFileCount(session),
    0,
  );
}

export function workspaceLayerSummaries(workspace: SerializedWorkspace) {
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

export function sessionFileCount(session: FeedSession | WorkspaceSessionInput) {
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

export function hasPlayableRuntimeItems(session: FeedSession) {
  return session.items.length > 0;
}

export function isIframeUrlSession(session: FeedSession) {
  return (
    session.sourceConfig.kind === "url" &&
    session.urlResolution?.status === "resolved" &&
    Boolean(urlResolutionIframeUrl(session.urlResolution))
  );
}

export function urlResolutionIframeUrl(resolution: UrlRuntimeResolution) {
  if (resolution.status !== "resolved") return null;
  if (resolution.mode === "iframe" || resolution.mode === "provider") {
    return resolution.iframeUrl ?? null;
  }

  return null;
}

export function urlResolutionRequiresDisplayWarning(
  resolution: UrlRuntimeResolution | undefined,
) {
  if (!resolution || resolution.status !== "resolved") return false;
  if (resolution.mode === "iframe") return true;
  if (resolution.mode !== "provider" || !resolution.iframeUrl) return false;
  if (resolution.items?.length) return false;

  return resolution.provider !== "youtube";
}

export function activeIframeFallbackLimit() {
  if (typeof window !== "undefined" && window.innerWidth < 768) return 1;

  return 4;
}

export function urlHostLabel(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "URL source";
  }
}
