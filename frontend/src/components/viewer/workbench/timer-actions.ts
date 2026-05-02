import {
  applyGlobalDuration,
  globalMoveTimerIndexes,
  globalRestartTimers,
  globalTogglePaused,
  syncTimerToGlobal,
  type TimerMode,
} from "@/lib/viewer/timer";
import { clamp, toMultiTimerState } from "./helpers";
import type { FeedSession } from "./types";

export type GlobalTimerAction = "back" | "next" | "pause" | "restart";

export function applyGlobalTimerSecondsState({
  sessions,
  value,
}: {
  sessions: FeedSession[];
  value: number;
}) {
  const globalSeconds = clamp(value, 1, 120);
  const timers = applyGlobalDuration(
    toMultiTimerState(sessions),
    globalSeconds,
  );

  return {
    globalSeconds,
    sessions: applyTimerState(sessions, timers),
  };
}

export function applyViewTimerSecondsState({
  sessions,
  id,
  value,
}: {
  sessions: FeedSession[];
  id: string;
  value: number;
}) {
  return sessions.map((session) =>
    session.id === id
      ? {
          ...session,
          timerMode: "local" as const,
          timer: {
            ...session.timer,
            durationSeconds: clamp(value, 1, 120),
            elapsedMs: 0,
          },
        }
      : session,
  );
}

export function applyViewTimerModeState({
  sessions,
  id,
  mode,
  globalSeconds,
}: {
  sessions: FeedSession[];
  id: string;
  mode: TimerMode;
  globalSeconds: number;
}) {
  const globalTimer =
    sessions.find(
      (session) => session.id !== id && session.timerMode === "global",
    )?.timer ?? null;

  return sessions.map((session) =>
    session.id === id
      ? {
          ...session,
          timerMode: mode,
          timer:
            mode === "global"
              ? syncTimerToGlobal(session.timer, globalTimer, globalSeconds)
              : session.timer,
        }
      : session,
  );
}

export function applyGlobalTimerActionState({
  sessions,
  action,
}: {
  sessions: FeedSession[];
  action: GlobalTimerAction;
}) {
  const timers = toMultiTimerState(sessions);
  const nextTimers =
    action === "back"
      ? globalMoveTimerIndexes(timers, -1)
      : action === "next"
        ? globalMoveTimerIndexes(timers, 1)
        : action === "pause"
          ? globalTogglePaused(timers)
          : globalRestartTimers(timers);

  return applyTimerState(sessions, nextTimers);
}

function applyTimerState(
  sessions: FeedSession[],
  timers: ReturnType<typeof toMultiTimerState>,
) {
  return sessions.map((session) => ({
    ...session,
    timer: timers[session.id]?.timer ?? session.timer,
  }));
}
