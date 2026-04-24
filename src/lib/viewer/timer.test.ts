import { describe, expect, it } from "vitest";

import {
  advanceTimerState,
  createTimerState,
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
});
