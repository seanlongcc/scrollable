import type { RuntimeFeedItem } from "@/lib/feed/types";
import {
  hydrateRuntimeSources,
  type RuntimeHydrationResult,
} from "./runtime-sources";
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
  createLocalRuntimeItems: (files: File[]) => RuntimeFeedItem[];
  onError: (message: string) => void;
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
        onError(runtimeHydrationErrorMessage(session, error)),
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

function runtimeHydrationErrorMessage(session: FeedSession, error: unknown) {
  return error instanceof Error
    ? `Could not load ${session.title}: ${error.message}`
    : `Could not load ${session.title}`;
}
