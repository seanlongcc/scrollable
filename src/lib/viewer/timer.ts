export type TimerState = {
  durationSeconds: number;
  itemCount: number;
  activeIndex: number;
  elapsedMs: number;
  isPaused: boolean;
};

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
