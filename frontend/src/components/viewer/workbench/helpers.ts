import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { UrlRuntimeResolution } from "@/lib/url-source/types";
import { DEFAULT_FIXED_GRID } from "@/lib/viewer/layout";
import { normalizeTimerMode } from "@/lib/viewer/timer";
import {
  DEFAULT_WORKSPACE_GLOBAL_TIMER_SECONDS,
  normalizeWorkspaceLayers,
  type SerializedWorkspaceTemplate,
} from "@/lib/viewer/workspaces";
import type {
  FeedSession,
  PersistedSourceConfig,
  RedditListingSort,
  RedditTimeRange,
  RuntimeWorkspace,
  SerializedWorkspace,
  WorkspaceSessionInput,
  WorkspaceTab,
} from "./types";
import {
  DEFAULT_REDDIT_MEDIA_LIMIT,
  MAX_LAYOUT_NAME_LENGTH,
  MAX_REDDIT_MEDIA_LIMIT,
} from "./types";

export function nextFixedSlot(
  sessions: FeedSession[],
  preferredSlot: number | null,
) {
  const occupied = new Set(sessions.map((session) => session.fixedSlot));
  if (preferredSlot !== null && !occupied.has(preferredSlot)) {
    return preferredSlot;
  }

  let slot = 0;
  while (occupied.has(slot)) slot += 1;
  return slot;
}

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
    templateSlots: [],
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
    templateSlots: [],
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

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeRedditLimit(value: number) {
  return clamp(value || DEFAULT_REDDIT_MEDIA_LIMIT, 1, MAX_REDDIT_MEDIA_LIMIT);
}

export function splitRedditUrls(value: string) {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildSubredditListingUrls(
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

export function buildSubredditListingUrl(
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

export function normalizeSubredditName(value: string) {
  const trimmed = value.trim().replace(/^\/?r\//i, "");
  const withoutSlashes = trimmed.split(/[/?#]/)[0] ?? "";

  return /^[A-Za-z0-9_]{2,21}$/.test(withoutSlashes) ? withoutSlashes : null;
}

export async function redditHashesForItemId(itemId: string) {
  const itemHashInput = redditItemHashInput(itemId);
  const parentHashInput = redditParentPostHashInput(itemId);
  const hashes = [await hashRedditItemId(itemHashInput)];

  if (parentHashInput !== itemHashInput) {
    hashes.push(await hashRedditItemId(parentHashInput));
  }

  return hashes;
}

export async function hashRedditItemId(itemId: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(redditItemHashInput(itemId)),
  );

  return `sha256:${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function redditItemHashInput(itemId: string) {
  return itemId;
}

export function redditParentPostHashInput(itemId: string) {
  const [source, postId] = itemId.split(":");
  return source === "reddit" && postId ? `reddit:${postId}` : itemId;
}

export function redditHiddenItemHashes(sourceConfig: PersistedSourceConfig) {
  if (sourceConfig.kind !== "reddit") return [];

  return [
    ...(sourceConfig.hiddenItemIdHashes ?? []),
    ...(sourceConfig.hiddenPostIdHashes ?? []),
  ];
}

export function redditRuntimeItemLabels(items: RuntimeFeedItem[]) {
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

export function redditLinksTitle(urls: string[], items: RuntimeFeedItem[]) {
  const subredditsFromUrls = uniqueSubreddits(urls.map(subredditFromRedditUrl));
  const subreddits = subredditsFromUrls.length
    ? subredditsFromUrls
    : uniqueSubreddits(items.map((item) => item.subreddit));

  if (subreddits.length) {
    return subreddits.map((subreddit) => `r/${subreddit}`).join(", ");
  }

  return urls.length === 1 ? "Reddit post" : "Reddit links";
}

export function uniqueSubreddits(values: Array<string | null | undefined>) {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    if (!value) return [];

    const key = value.toLowerCase();
    if (seen.has(key)) return [];

    seen.add(key);
    return [value];
  });
}

export function subredditFromRedditUrl(value: string | undefined) {
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

export function keyMoveDirection(key: string): 1 | -1 | null {
  if (key === "ArrowDown" || key === "ArrowRight") return 1;
  if (key === "ArrowUp" || key === "ArrowLeft") return -1;
  return null;
}

export function isKeyboardEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      "input, textarea, select, button, a, [contenteditable=true]",
    ),
  );
}

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2)}`;
}

export function nextLayoutName(
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

export function uniqueWorkspaceName(
  baseName: string,
  tabs: WorkspaceTab[],
  savedWorkspaces: Record<string, SerializedWorkspace>,
) {
  const trimmedBase = limitLayoutName(baseName.trim() || "Layout");
  const usedNames = new Set([
    ...tabs.map((tab) => normalizeLayoutName(tab.name)),
    ...Object.values(savedWorkspaces).map((workspace) =>
      normalizeLayoutName(workspace.name),
    ),
  ]);

  if (!usedNames.has(normalizeLayoutName(trimmedBase))) return trimmedBase;

  let index = 2;
  while (
    usedNames.has(
      normalizeLayoutName(limitLayoutName(`${trimmedBase} ${index}`)),
    )
  ) {
    index += 1;
  }

  return limitLayoutName(`${trimmedBase} ${index}`);
}

export function hasDuplicateLayoutName(
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

export function hasDuplicateTemplateName(
  name: string,
  currentId: string,
  savedTemplates: Record<string, SerializedWorkspaceTemplate>,
) {
  const normalized = normalizeLayoutName(name);

  return Object.values(savedTemplates).some(
    (template) =>
      template.id !== currentId &&
      normalizeLayoutName(template.name) === normalized,
  );
}

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

export function normalizeLayoutName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function limitLayoutName(name: string) {
  return name.slice(0, MAX_LAYOUT_NAME_LENGTH);
}

export function normalizeLegacyLayoutName(name: string) {
  return name.replace(/^Session(\s+\d+)$/i, "Layout$1");
}

export function normalizeStoredLayoutNames(
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
