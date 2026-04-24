export type TimerState = {
  durationSeconds: number;
  itemCount: number;
  activeIndex: number;
  elapsedMs: number;
  isPaused: boolean;
};

export type TimerMode = "own" | "master";

export type ViewTimerState = {
  mode: TimerMode;
  timer: TimerState;
};

export type MultiTimerState = Record<string, ViewTimerState>;

export function createTimerState({
  durationSeconds,
  itemCount,
}: {
  durationSeconds: number;
  itemCount: number;
}): TimerState {
  return {
    durationSeconds,
    itemCount,
    activeIndex: 0,
    elapsedMs: 0,
    isPaused: false,
  };
}

export function togglePaused(state: TimerState): TimerState {
  return {
    ...state,
    isPaused: !state.isPaused,
    elapsedMs: state.isPaused ? state.elapsedMs : 0,
  };
}

export function moveTimerIndex(state: TimerState, direction: 1 | -1): TimerState {
  if (state.itemCount <= 0) return { ...state, activeIndex: 0, elapsedMs: 0 };

  return {
    ...state,
    activeIndex:
      (state.activeIndex + direction + state.itemCount) % state.itemCount,
    elapsedMs: 0,
  };
}

export function advanceTimerState(
  state: TimerState,
  elapsedDeltaMs: number,
): TimerState {
  if (state.isPaused || state.itemCount <= 0) {
    return { ...state, elapsedMs: state.isPaused ? 0 : state.elapsedMs };
  }

  const durationMs = state.durationSeconds * 1000;
  const elapsedMs = state.elapsedMs + elapsedDeltaMs;

  if (elapsedMs < durationMs) {
    return { ...state, elapsedMs };
  }

  const steps = Math.floor(elapsedMs / durationMs);

  return {
    ...state,
    activeIndex: (state.activeIndex + steps) % state.itemCount,
    elapsedMs: elapsedMs % durationMs,
  };
}

export function createMultiTimerState(
  views: Array<{
    id: string;
    durationSeconds: number;
    itemCount: number;
    mode: TimerMode;
  }>,
): MultiTimerState {
  return Object.fromEntries(
    views.map((view) => [
      view.id,
      {
        mode: view.mode,
        timer: createTimerState({
          durationSeconds: view.durationSeconds,
          itemCount: view.itemCount,
        }),
      },
    ]),
  );
}

export function masterMoveTimerIndexes(
  timers: MultiTimerState,
  direction: 1 | -1,
): MultiTimerState {
  return mapMultiTimerState(timers, (viewTimer) => ({
    ...viewTimer,
    timer: moveTimerIndex(viewTimer.timer, direction),
  }));
}

export function masterTogglePaused(timers: MultiTimerState): MultiTimerState {
  return mapMultiTimerState(timers, (viewTimer) => ({
    ...viewTimer,
    timer: togglePaused(viewTimer.timer),
  }));
}

export function masterRestartTimers(timers: MultiTimerState): MultiTimerState {
  return mapMultiTimerState(timers, (viewTimer) => ({
    ...viewTimer,
    timer: { ...viewTimer.timer, elapsedMs: 0 },
  }));
}

export function applyMasterDuration(
  timers: MultiTimerState,
  durationSeconds: number,
): MultiTimerState {
  return mapMultiTimerState(timers, (viewTimer) => {
    if (viewTimer.mode !== "master") return viewTimer;

    return {
      ...viewTimer,
      timer: {
        ...viewTimer.timer,
        durationSeconds,
        elapsedMs: 0,
      },
    };
  });
}

function mapMultiTimerState(
  timers: MultiTimerState,
  mapper: (viewTimer: ViewTimerState, id: string) => ViewTimerState,
): MultiTimerState {
  return Object.fromEntries(
    Object.entries(timers).map(([id, viewTimer]) => [id, mapper(viewTimer, id)]),
  );
}
