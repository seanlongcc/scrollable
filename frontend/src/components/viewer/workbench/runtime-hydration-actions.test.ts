import { afterEach, describe, expect, it, vi } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import { hydrateRuntimeSessionsAction } from "./runtime-hydration-actions";
import type { FeedSession } from "./types";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hydrateRuntimeSessionsAction", () => {
  it("returns a warning notice when a saved Reddit source is rate-limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ error: "reddit_rate_limited" }), {
          headers: { "Content-Type": "application/json" },
          status: 502,
        });
      }),
    );
    const onError = vi.fn();

    const result = await hydrateRuntimeSessionsAction({
      sessions: [redditSession()],
      visibility: {
        activeLayerId: "layer-main",
        layoutMode: "fixed",
        visibleFixedCells: 1,
      },
      createLocalRuntimeItems: () => [],
      onError,
    });

    expect(result.status).toBe("hydrated");
    expect(onError).toHaveBeenCalledWith({
      tone: "warning",
      message:
        "Could not load STAYC source: Reddit rate-limited this request. Try again later.",
    });
  });
});

function redditSession(): FeedSession {
  return {
    id: "session-reddit",
    title: "STAYC source",
    layerId: "layer-main",
    timerMode: "global",
    timer: createTimerState({ durationSeconds: 8, itemCount: 0 }),
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
    items: [],
    sourceConfig: {
      kind: "reddit",
      urls: ["https://www.reddit.com/r/STAYC/top/?t=week"],
      limit: 10,
      allowNsfw: true,
    },
  };
}
