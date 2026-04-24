import { describe, expect, it } from "vitest";

import {
  advanceTimerState,
  applyGlobalDuration,
  createMultiTimerState,
  createTimerState,
  globalMoveTimerIndexes,
  globalRestartTimers,
  globalTogglePaused,
  moveTimerIndex,
  normalizeTimerMode,
  syncTimerToGlobal,
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

  it("creates local timers and global timers without sharing duration", () => {
    const timers = createMultiTimerState([
      { id: "a", durationSeconds: 9, itemCount: 2, mode: "local" },
      { id: "b", durationSeconds: 12, itemCount: 2, mode: "global" },
    ]);

    expect(timers.a.mode).toBe("local");
    expect(timers.a.timer.durationSeconds).toBe(9);
    expect(timers.b.mode).toBe("global");
    expect(timers.b.timer.durationSeconds).toBe(12);
  });

  it("global next advances all timers and preserves per-view timer duration", () => {
    const timers = createMultiTimerState([
      { id: "a", durationSeconds: 9, itemCount: 2, mode: "local" },
      { id: "b", durationSeconds: 12, itemCount: 3, mode: "global" },
    ]);

    const next = globalMoveTimerIndexes(timers, 1);

    expect(next.a.timer.activeIndex).toBe(1);
    expect(next.a.timer.durationSeconds).toBe(9);
    expect(next.b.timer.activeIndex).toBe(1);
    expect(next.b.timer.durationSeconds).toBe(12);
  });

  it("global pause and restart affect every timer state", () => {
    const timers = createMultiTimerState([
      { id: "a", durationSeconds: 9, itemCount: 2, mode: "local" },
      { id: "b", durationSeconds: 12, itemCount: 3, mode: "global" },
    ]);
    const advanced = {
      a: { ...timers.a, timer: advanceTimerState(timers.a.timer, 500) },
      b: { ...timers.b, timer: advanceTimerState(timers.b.timer, 500) },
    };

    expect(globalTogglePaused(advanced).a.timer.isPaused).toBe(true);
    expect(globalRestartTimers(advanced).a.timer.elapsedMs).toBe(0);
  });

  it("applies global duration only to views in global mode", () => {
    const timers = createMultiTimerState([
      { id: "a", durationSeconds: 9, itemCount: 2, mode: "local" },
      { id: "b", durationSeconds: 12, itemCount: 3, mode: "global" },
    ]);

    const next = applyGlobalDuration(timers, 20);

    expect(next.a.timer.durationSeconds).toBe(9);
    expect(next.b.timer.durationSeconds).toBe(20);
  });

  it("normalizes legacy timer mode names", () => {
    expect(normalizeTimerMode("own")).toBe("local");
    expect(normalizeTimerMode("master")).toBe("global");
    expect(normalizeTimerMode("local")).toBe("local");
    expect(normalizeTimerMode("global")).toBe("global");
  });

  it("syncs a local timer onto the current global clock when mode changes", () => {
    const local = {
      ...createTimerState({ durationSeconds: 20, itemCount: 5 }),
      activeIndex: 3,
      elapsedMs: 7500,
      isPaused: true,
    };
    const global = {
      ...createTimerState({ durationSeconds: 10, itemCount: 2 }),
      activeIndex: 1,
      elapsedMs: 2500,
      isPaused: false,
    };

    expect(syncTimerToGlobal(local, global, 10)).toEqual({
      durationSeconds: 10,
      itemCount: 5,
      activeIndex: 3,
      elapsedMs: 2500,
      isPaused: false,
    });
  });
});
