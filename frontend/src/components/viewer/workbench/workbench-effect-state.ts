import { advanceTimerState, moveTimerIndex } from "@/lib/viewer/timer";
import type { TimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import { isKeyboardEditingTarget, keyMoveDirection } from "./helpers";

export const TIMER_TICK_MS = 250;
export const HIDDEN_UI_REVEAL_TIMEOUT_MS = 1800;

export function advanceSessionTimers(
  sessions: FeedSession[],
  elapsedMs = TIMER_TICK_MS,
) {
  if (!sessions.length) return sessions;

  let changed = false;
  const nextSessions = sessions.map((session) => {
    const timer = advanceTimerState(session.timer, elapsedMs);
    if (sameTimerState(session.timer, timer)) return session;

    changed = true;
    return { ...session, timer };
  });

  return changed ? nextSessions : sessions;
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
