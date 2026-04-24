import { describe, expect, it } from "vitest";

import {
  advanceTimerState,
  applyMasterDuration,
  createMultiTimerState,
  createTimerState,
  masterMoveTimerIndexes,
  masterRestartTimers,
  masterTogglePaused,
  moveTimerIndex,
  togglePaused,
} from "./timer";

describe("timer state", () => {
  it("advances when elapsed reaches duration and wraps at feed end", () => {
    const initial = createTimerState({ durationSeconds: 3, itemCount: 2 });

    const next = advanceTimerState(initial, 3000);

    expect(next.activeIndex).toBe(1);
    expect(next.elapsedMs).toBe(0);
    expect(advanceTimerState(next, 3000).activeIndex).toBe(0);
  });

  it("does not advance while paused", () => {
    const paused = togglePaused(
      createTimerState({ durationSeconds: 3, itemCount: 2 }),
    );

    expect(advanceTimerState(paused, 9000).activeIndex).toBe(0);
    expect(advanceTimerState(paused, 9000).elapsedMs).toBe(0);
  });

  it("preserves residual elapsed time for multi-step advances", () => {
    const initial = createTimerState({ durationSeconds: 3, itemCount: 5 });
    const next = advanceTimerState(initial, 6500);

    expect(next.activeIndex).toBe(2);
    expect(next.elapsedMs).toBe(500);
  });

  it("moves manually in both directions and handles empty feeds", () => {
    const initial = createTimerState({ durationSeconds: 3, itemCount: 3 });

    expect(moveTimerIndex(initial, -1).activeIndex).toBe(2);
    expect(moveTimerIndex(initial, 1).activeIndex).toBe(1);
    expect(
      moveTimerIndex(createTimerState({ durationSeconds: 3, itemCount: 0 }), 1)
        .activeIndex,
    ).toBe(0);
  });

  it("creates own timers and master timers without sharing duration", () => {
    const timers = createMultiTimerState([
      { id: "a", durationSeconds: 9, itemCount: 2, mode: "own" },
      { id: "b", durationSeconds: 12, itemCount: 2, mode: "master" },
    ]);

    expect(timers.a.mode).toBe("own");
    expect(timers.a.timer.durationSeconds).toBe(9);
    expect(timers.b.mode).toBe("master");
    expect(timers.b.timer.durationSeconds).toBe(12);
  });

  it("master next advances all timers and preserves per-view timer duration", () => {
    const timers = createMultiTimerState([
      { id: "a", durationSeconds: 9, itemCount: 2, mode: "own" },
      { id: "b", durationSeconds: 12, itemCount: 3, mode: "master" },
    ]);

    const next = masterMoveTimerIndexes(timers, 1);

    expect(next.a.timer.activeIndex).toBe(1);
    expect(next.a.timer.durationSeconds).toBe(9);
    expect(next.b.timer.activeIndex).toBe(1);
    expect(next.b.timer.durationSeconds).toBe(12);
  });

  it("master pause and restart affect every timer state", () => {
    const timers = createMultiTimerState([
      { id: "a", durationSeconds: 9, itemCount: 2, mode: "own" },
      { id: "b", durationSeconds: 12, itemCount: 3, mode: "master" },
    ]);
    const advanced = {
      a: { ...timers.a, timer: advanceTimerState(timers.a.timer, 500) },
      b: { ...timers.b, timer: advanceTimerState(timers.b.timer, 500) },
    };

    expect(masterTogglePaused(advanced).a.timer.isPaused).toBe(true);
    expect(masterRestartTimers(advanced).a.timer.elapsedMs).toBe(0);
  });

  it("applies master duration only to views in master mode", () => {
    const timers = createMultiTimerState([
      { id: "a", durationSeconds: 9, itemCount: 2, mode: "own" },
      { id: "b", durationSeconds: 12, itemCount: 3, mode: "master" },
    ]);

    const next = applyMasterDuration(timers, 20);

    expect(next.a.timer.durationSeconds).toBe(9);
    expect(next.b.timer.durationSeconds).toBe(20);
  });
});
