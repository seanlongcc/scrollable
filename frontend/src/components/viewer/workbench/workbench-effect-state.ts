import { advanceTimerState, moveTimerIndex } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import { isKeyboardEditingTarget, keyMoveDirection } from "./helpers";

export const TIMER_TICK_MS = 250;
export const HIDDEN_UI_REVEAL_TIMEOUT_MS = 1800;

export function advanceSessionTimers(
  sessions: FeedSession[],
  elapsedMs = TIMER_TICK_MS,
) {
  return sessions.map((session) => ({
    ...session,
    timer: advanceTimerState(session.timer, elapsedMs),
  }));
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
