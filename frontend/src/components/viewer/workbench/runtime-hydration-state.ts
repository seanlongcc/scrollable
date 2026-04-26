import { applyRuntimeHydrationResults } from "./runtime-sources";
import type { RuntimeHydrationResult } from "./runtime-sources";
import type { FeedSession, LayoutMode } from "./types";

export type RuntimeHydrationVisibilityState = {
  activeLayerId: string;
  layoutMode: LayoutMode;
  visibleFixedCells: number;
};

export function visibleUnresolvedUrlHydrationSessions({
  sessions,
  ...visibility
}: {
  sessions: FeedSession[];
} & RuntimeHydrationVisibilityState) {
  return sessions.filter(
    (session) =>
      session.sourceConfig.kind === "url" &&
      session.isRuntimeLoading &&
      session.items.length === 0 &&
      !session.urlResolution &&
      isSessionVisibleForUrlHydration(session, visibility),
  );
}

export function runtimeHydrationCandidates({
  sessions,
  ...visibility
}: {
  sessions: FeedSession[];
} & RuntimeHydrationVisibilityState) {
  return sessions.filter(
    (session) =>
      session.items.length === 0 &&
      (session.sourceConfig.kind === "reddit" ||
        (session.sourceConfig.kind === "url" &&
          !session.urlResolution &&
          isSessionVisibleForUrlHydration(session, visibility)) ||
        (session.sourceConfig.kind === "local" &&
          Boolean(session.sourceConfig.cacheSetId))),
  );
}

export function applyHydratedRuntimeSessions(
  sessions: FeedSession[],
  hydrated: RuntimeHydrationResult[],
) {
  return applyRuntimeHydrationResults(sessions, hydrated);
}

function isSessionVisibleForUrlHydration(
  session: FeedSession,
  {
    activeLayerId,
    layoutMode,
    visibleFixedCells,
  }: RuntimeHydrationVisibilityState,
) {
  if (session.sourceConfig.kind !== "url") return true;
  if (session.layerId !== activeLayerId) return false;
  if (layoutMode !== "fixed") return true;

  return session.fixedSlot < visibleFixedCells;
}
