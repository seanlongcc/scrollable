import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { VideoTimeRange } from "@/lib/viewer/video-time-range";
import {
  hydrateRuntimeSources,
  type RuntimeHydrationResult,
} from "./runtime-sources";
import {
  prefixRuntimeNotice,
  runtimeSourceNotice,
  type RuntimeNotice,
} from "./runtime-source-notices";
import {
  applyHydratedRuntimeSessions,
  runtimeHydrationCandidates,
  visibleUnresolvedUrlHydrationSessions,
  type RuntimeHydrationVisibilityState,
} from "./runtime-hydration-state";
import type { FeedSession } from "./types";

export type RuntimeHydrationActionResult =
  | {
      status: "empty";
    }
  | {
      status: "hydrated";
      hydrated: RuntimeHydrationResult[];
    };

export function visibleUrlRuntimeHydrationCandidates({
  sessions,
  visibility,
}: {
  sessions: FeedSession[];
  visibility: RuntimeHydrationVisibilityState;
}) {
  return visibleUnresolvedUrlHydrationSessions({
    sessions,
    ...visibility,
  });
}

export async function hydrateRuntimeSessionsAction({
  sessions,
  visibility,
  createLocalRuntimeItems,
  onError,
}: {
  sessions: FeedSession[];
  visibility: RuntimeHydrationVisibilityState;
  createLocalRuntimeItems: (
    files: File[],
    videoTimeRanges?: Record<string, VideoTimeRange>,
  ) => RuntimeFeedItem[];
  onError: (notice: RuntimeNotice) => void;
}): Promise<RuntimeHydrationActionResult> {
  const sessionsToHydrate = runtimeHydrationCandidates({
    sessions,
    ...visibility,
  });

  if (!sessionsToHydrate.length) return { status: "empty" };

  return {
    status: "hydrated",
    hydrated: await hydrateRuntimeSources({
      sessions: sessionsToHydrate,
      createLocalRuntimeItems,
      onError: (session, error) =>
        onError(runtimeHydrationErrorNotice(session, error)),
    }),
  };
}

export function applyRuntimeHydrationAction({
  sessions,
  hydrated,
}: {
  sessions: FeedSession[];
  hydrated: RuntimeHydrationResult[];
}) {
  return applyHydratedRuntimeSessions(sessions, hydrated);
}

function runtimeHydrationErrorNotice(
  session: FeedSession,
  error: unknown,
): RuntimeNotice {
  return prefixRuntimeNotice(
    runtimeSourceNotice(error, { fallback: "" }),
    `Could not load ${session.title}`,
  );
}
