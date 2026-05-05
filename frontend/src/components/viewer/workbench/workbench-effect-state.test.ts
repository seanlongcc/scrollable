import { describe, expect, it } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import {
  advanceSessionTimers,
  hasActiveSessionTimers,
} from "./workbench-effect-state";
import type { FeedSession } from "./types";

describe("hasActiveSessionTimers", () => {
  it("detects only timers that can advance", () => {
    expect(hasActiveSessionTimers([])).toBe(false);
    expect(
      hasActiveSessionTimers([
        session({
          id: "paused",
          timer: {
            ...createTimerState({ durationSeconds: 10, itemCount: 2 }),
            isPaused: true,
          },
        }),
        session({
          id: "empty",
          timer: createTimerState({ durationSeconds: 10, itemCount: 0 }),
        }),
        session({
          id: "zero-duration",
          timer: createTimerState({ durationSeconds: 0, itemCount: 2 }),
        }),
      ]),
    ).toBe(false);

    expect(
      hasActiveSessionTimers([
        session({
          id: "active",
          timer: createTimerState({ durationSeconds: 10, itemCount: 2 }),
        }),
      ]),
    ).toBe(true);
  });
});

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

  it("holds a long active video at the timer boundary until it finishes", () => {
    const sessions = [
      session({
        id: "video-session",
        timer: {
          ...createTimerState({ durationSeconds: 1, itemCount: 2 }),
          elapsedMs: 750,
        },
        mediaType: "video",
      }),
    ];

    const held = advanceSessionTimers(sessions, 250, {
      finishVideoBeforeAdvance: true,
      finishedVideoKeys: {},
    });

    expect(held[0].timer.activeIndex).toBe(0);
    expect(held[0].timer.elapsedMs).toBe(1000);

    const advanced = advanceSessionTimers(held, 250, {
      finishVideoBeforeAdvance: true,
      finishedVideoKeys: { "video-session:video-session:0": true },
    });

    expect(advanced[0].timer.activeIndex).toBe(1);
    expect(advanced[0].timer.elapsedMs).toBe(0);
  });

  it("lets source finish-video override global timer behavior", () => {
    const videoSession = session({
      id: "source-video",
      timer: {
        ...createTimerState({ durationSeconds: 1, itemCount: 2 }),
        elapsedMs: 750,
      },
      mediaType: "video",
      finishVideoBeforeAdvance: true,
    });
    const optOutSession = session({
      id: "opt-out-video",
      timer: {
        ...createTimerState({ durationSeconds: 1, itemCount: 2 }),
        elapsedMs: 750,
      },
      mediaType: "video",
      finishVideoBeforeAdvance: false,
    });

    const held = advanceSessionTimers([videoSession], 250, {
      finishVideoBeforeAdvance: false,
      finishedVideoKeys: {},
    });
    const advanced = advanceSessionTimers([optOutSession], 250, {
      finishVideoBeforeAdvance: true,
      finishedVideoKeys: {},
    });

    expect(held[0].timer.activeIndex).toBe(0);
    expect(held[0].timer.elapsedMs).toBe(1000);
    expect(advanced[0].timer.activeIndex).toBe(1);
    expect(advanced[0].timer.elapsedMs).toBe(0);
  });
});

function session({
  id,
  timer,
  mediaType = "image",
  finishVideoBeforeAdvance,
}: {
  id: string;
  timer: FeedSession["timer"];
  mediaType?: "image" | "video";
  finishVideoBeforeAdvance?: boolean;
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
        media: [
          {
            type: mediaType,
            url: `https://cdn.test/${id}.${mediaType === "video" ? "mp4" : "jpg"}`,
          },
        ],
      },
    ],
    finishVideoBeforeAdvance,
    sourceConfig: {
      kind: "url",
      url: `https://example.test/${id}`,
    },
  };
}
