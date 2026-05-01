import { useCallback } from "react";

import { moveTimerIndex, togglePaused } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";

export function useSelectedSessionTimerControls({
  selected,
  updateSession,
  setViewTimerMode,
  setViewTimerSeconds,
}: {
  selected: FeedSession | null;
  updateSession: (
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) => void;
  setViewTimerMode: (id: string, mode: FeedSession["timerMode"]) => void;
  setViewTimerSeconds: (id: string, seconds: number) => void;
}) {
  const moveSelectedSource = useCallback(
    (direction: 1 | -1) => {
      if (!selected) return;
      updateSession(selected.id, (session) => ({
        ...session,
        timer: moveTimerIndex(session.timer, direction),
      }));
    },
    [selected, updateSession],
  );

  const toggleSelectedSourcePaused = useCallback(() => {
    if (!selected) return;
    updateSession(selected.id, (session) => ({
      ...session,
      timer: togglePaused(session.timer),
    }));
  }, [selected, updateSession]);

  const restartSelectedSource = useCallback(() => {
    if (!selected) return;
    updateSession(selected.id, (session) => ({
      ...session,
      timer: { ...session.timer, elapsedMs: 0 },
    }));
  }, [selected, updateSession]);

  const setSelectedTimerMode = useCallback(
    (mode: FeedSession["timerMode"]) => {
      if (selected) setViewTimerMode(selected.id, mode);
    },
    [selected, setViewTimerMode],
  );

  const setSelectedTimerSeconds = useCallback(
    (seconds: number) => {
      if (selected) setViewTimerSeconds(selected.id, seconds);
    },
    [selected, setViewTimerSeconds],
  );

  return {
    moveSelectedSource,
    toggleSelectedSourcePaused,
    restartSelectedSource,
    setSelectedTimerMode,
    setSelectedTimerSeconds,
  };
}
