import { advanceTimerState, moveTimerIndex } from "@/lib/viewer/timer";
import type { TimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import { isKeyboardEditingTarget, keyMoveDirection } from "./helpers";

export const TIMER_TICK_MS = 250;
export const HIDDEN_UI_REVEAL_TIMEOUT_MS = 1800;

export function hasActiveSessionTimers(sessions: FeedSession[]) {
  return sessions.some(
    (session) =>
      !session.timer.isPaused &&
      session.timer.itemCount > 0 &&
      session.timer.durationSeconds > 0,
  );
}

export function advanceSessionTimers(
  sessions: FeedSession[],
  elapsedMs = TIMER_TICK_MS,
  options: {
    finishVideoBeforeAdvance?: boolean;
    finishedVideoKeys?: Record<string, boolean>;
    galleryIndexes?: Record<string, number>;
  } = {},
) {
  if (!sessions.length) return sessions;

  let changed = false;
  const nextSessions = sessions.map((session) => {
    const timer = shouldReleaseFinishedVideo(session, options)
      ? moveTimerIndex(session.timer, 1)
      : shouldHoldForUnfinishedVideo(session, elapsedMs, options)
        ? {
            ...session.timer,
            elapsedMs: session.timer.durationSeconds * 1000,
          }
        : advanceTimerState(session.timer, elapsedMs);
    if (sameTimerState(session.timer, timer)) return session;

    changed = true;
    return { ...session, timer };
  });

  return changed ? nextSessions : sessions;
}

function shouldReleaseFinishedVideo(
  session: FeedSession,
  {
    finishVideoBeforeAdvance,
    finishedVideoKeys = {},
    galleryIndexes = {},
  }: {
    finishVideoBeforeAdvance?: boolean;
    finishedVideoKeys?: Record<string, boolean>;
    galleryIndexes?: Record<string, number>;
  },
) {
  if (!sessionFinishVideoBeforeAdvance(session, finishVideoBeforeAdvance)) {
    return false;
  }
  if (session.timer.elapsedMs < session.timer.durationSeconds * 1000) {
    return false;
  }

  const videoKey = activeVideoCompletionKey(session, galleryIndexes);
  return Boolean(videoKey && finishedVideoKeys[videoKey]);
}

function shouldHoldForUnfinishedVideo(
  session: FeedSession,
  elapsedMs: number,
  {
    finishVideoBeforeAdvance,
    finishedVideoKeys = {},
    galleryIndexes = {},
  }: {
    finishVideoBeforeAdvance?: boolean;
    finishedVideoKeys?: Record<string, boolean>;
    galleryIndexes?: Record<string, number>;
  },
) {
  if (!sessionFinishVideoBeforeAdvance(session, finishVideoBeforeAdvance)) {
    return false;
  }
  if (session.timer.isPaused || session.timer.itemCount <= 0) return false;
  if (session.timer.durationSeconds <= 0) return false;
  if (
    session.timer.elapsedMs + elapsedMs <
    session.timer.durationSeconds * 1000
  ) {
    return false;
  }

  const videoKey = activeVideoCompletionKey(session, galleryIndexes);
  return Boolean(videoKey && !finishedVideoKeys[videoKey]);
}

export function sessionFinishVideoBeforeAdvance(
  session: FeedSession,
  globalFinishVideoBeforeAdvance: boolean | undefined,
) {
  return (
    session.finishVideoBeforeAdvance ?? Boolean(globalFinishVideoBeforeAdvance)
  );
}

export function sessionRandomVideoStart(
  session: FeedSession,
  globalRandomVideoStart: boolean | undefined,
) {
  return session.randomVideoStart ?? Boolean(globalRandomVideoStart);
}

export function activeVideoCompletionKey(
  session: FeedSession,
  galleryIndexes: Record<string, number> = {},
) {
  const activeItem = session.items[session.timer.activeIndex];
  const activeGalleryIndex = activeItem
    ? (galleryIndexes[activeItem.id] ?? 0)
    : 0;
  const activeMedia = activeItem?.media[activeGalleryIndex];

  return activeMedia?.type === "video"
    ? `${session.id}:${activeItem.id}:${activeGalleryIndex}`
    : null;
}

export function keyboardTimerMoveDirection(event: KeyboardEvent) {
  const direction = keyMoveDirection(event.key);
  if (
    !direction ||
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    isKeyboardEditingTarget(event.target)
  ) {
    return null;
  }

  return direction;
}

export function moveActiveKeyboardSessionTimer({
  sessions,
  activeSessionId,
  direction,
}: {
  sessions: FeedSession[];
  activeSessionId: string;
  direction: 1 | -1;
}) {
  return sessions.map((session) =>
    session.id === activeSessionId
      ? { ...session, timer: moveTimerIndex(session.timer, direction) }
      : session,
  );
}

function sameTimerState(left: TimerState, right: TimerState) {
  return (
    left.durationSeconds === right.durationSeconds &&
    left.itemCount === right.itemCount &&
    left.activeIndex === right.activeIndex &&
    left.elapsedMs === right.elapsedMs &&
    left.isPaused === right.isPaused
  );
}
