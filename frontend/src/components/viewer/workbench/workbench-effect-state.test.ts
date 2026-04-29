import { describe, expect, it } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import { advanceSessionTimers } from "./workbench-effect-state";
import type { FeedSession } from "./types";

describe("advanceSessionTimers", () => {
  it("returns the same sessions reference when there is no timer work", () => {
    const emptySessions: FeedSession[] = [];
    const pausedSessions = [
      session({
        id: "paused",
        timer: {
          ...createTimerState({ durationSeconds: 10, itemCount: 1 }),
          isPaused: true,
        },
      }),
    ];

    expect(advanceSessionTimers(emptySessions)).toBe(emptySessions);
    expect(advanceSessionTimers(pausedSessions)).toBe(pausedSessions);
  });

  it("returns updated sessions when an active timer advances", () => {
    const sessions = [
      session({
        id: "active",
        timer: createTimerState({ durationSeconds: 10, itemCount: 2 }),
      }),
    ];

    const next = advanceSessionTimers(sessions, 250);

    expect(next).not.toBe(sessions);
    expect(next[0]).not.toBe(sessions[0]);
    expect(next[0].timer.elapsedMs).toBe(250);
  });
});

function session({
  id,
  timer,
}: {
  id: string;
  timer: FeedSession["timer"];
}): FeedSession {
  return {
    id,
    title: id,
    layerId: "layer-1",
    timerMode: "global",
    timer,
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
    items: [
      {
        id,
        source: "url",
        title: id,
        isNsfw: false,
        createdAt: "2026-04-29T00:00:00.000Z",
        media: [{ type: "image", url: `https://cdn.test/${id}.jpg` }],
      },
    ],
    sourceConfig: {
      kind: "url",
      url: `https://example.test/${id}`,
    },
  };
}
