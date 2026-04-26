import { describe, expect, it } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import {
  applyGlobalTimerActionState,
  applyGlobalTimerSecondsState,
  applyViewTimerModeState,
  applyViewTimerSecondsState,
} from "./timer-actions";

describe("timer actions", () => {
  it("applies global duration only to global timer sessions", () => {
    const sessions = [
      session({ id: "local", timerMode: "local", durationSeconds: 9 }),
      session({ id: "global", timerMode: "global", durationSeconds: 12 }),
    ];

    const result = applyGlobalTimerSecondsState({
      sessions,
      value: 500,
    });

    expect(result.globalSeconds).toBe(120);
    expect(
      result.sessions.find((item) => item.id === "local")?.timer,
    ).toMatchObject({
      durationSeconds: 9,
    });
    expect(
      result.sessions.find((item) => item.id === "global")?.timer,
    ).toMatchObject({
      durationSeconds: 120,
      elapsedMs: 0,
    });
  });

  it("sets one view to local timer mode when changing its seconds", () => {
    const sessions = [
      session({
        id: "source",
        timerMode: "global",
        durationSeconds: 10,
        elapsedMs: 500,
      }),
    ];

    expect(
      applyViewTimerSecondsState({
        sessions,
        id: "source",
        value: 0,
      })[0],
    ).toMatchObject({
      timerMode: "local",
      timer: {
        durationSeconds: 1,
        elapsedMs: 0,
      },
    });
  });

  it("syncs a view back to the current global timer clock", () => {
    const sessions = [
      session({
        id: "other-global",
        timerMode: "global",
        durationSeconds: 10,
        elapsedMs: 750,
        isPaused: true,
      }),
      session({ id: "source", timerMode: "local", durationSeconds: 7 }),
    ];

    const result = applyViewTimerModeState({
      sessions,
      id: "source",
      mode: "global",
      globalSeconds: 17,
    });

    expect(result.find((item) => item.id === "source")).toMatchObject({
      timerMode: "global",
      timer: {
        durationSeconds: 17,
        elapsedMs: 750,
        isPaused: true,
      },
    });
  });

  it("applies global next, pause, and restart actions to existing timer state", () => {
    const sessions = [
      session({
        id: "first",
        itemCount: 3,
        activeIndex: 0,
        elapsedMs: 500,
      }),
      session({
        id: "second",
        itemCount: 2,
        activeIndex: 1,
        elapsedMs: 800,
      }),
    ];

    const next = applyGlobalTimerActionState({ sessions, action: "next" });
    expect(next.map((item) => item.timer.activeIndex)).toEqual([1, 0]);

    const paused = applyGlobalTimerActionState({ sessions, action: "pause" });
    expect(paused.every((item) => item.timer.isPaused)).toBe(true);
    expect(paused.every((item) => item.timer.elapsedMs === 0)).toBe(true);

    const restarted = applyGlobalTimerActionState({
      sessions,
      action: "restart",
    });
    expect(restarted.every((item) => item.timer.elapsedMs === 0)).toBe(true);
  });
});

function session({
  id,
  timerMode = "global",
  durationSeconds = 10,
  itemCount = 2,
  activeIndex = 0,
  elapsedMs = 0,
  isPaused = false,
}: {
  id: string;
  timerMode?: FeedSession["timerMode"];
  durationSeconds?: number;
  itemCount?: number;
  activeIndex?: number;
  elapsedMs?: number;
  isPaused?: boolean;
}): FeedSession {
  return {
    id,
    title: id,
    layerId: "layer-1",
    timerMode,
    timer: {
      ...createTimerState({ durationSeconds, itemCount }),
      activeIndex,
      elapsedMs,
      isPaused,
    },
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
    items: Array.from({ length: itemCount }, (_, index) => ({
      id: `${id}-item-${index}`,
      source: "local" as const,
      title: `${id} item ${index}`,
      isNsfw: false,
      createdAt: "2026-04-26T00:00:00.000Z",
      media: [{ type: "image" as const, url: `blob:${id}-${index}` }],
    })),
    sourceConfig: { kind: "local", fileCount: itemCount },
  };
}
