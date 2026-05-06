import { describe, expect, it } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import {
  placeSessions,
  type SessionPlacementSourceInput,
} from "./session-placement";
import type { FeedSession } from "./types";

describe("placeSessions", () => {
  it("starts added sessions paused when the current global pause state is paused", () => {
    const result = placeSessions({
      current: [session({ id: "existing", isPaused: true })],
      sources: [source()],
      activeLayerId: "layer-1",
      globalSeconds: 10,
      pendingFixedSlot: null,
      pendingTemplateSlotId: null,
      templateSlots: [],
      createId: () => "new-source",
    });

    expect(
      result.sessions.find((item) => item.id === "new-source")?.timer,
    ).toMatchObject({
      isPaused: true,
    });
  });

  it("starts the first added session running when no global pause state exists", () => {
    const result = placeSessions({
      current: [],
      sources: [source()],
      activeLayerId: "layer-1",
      globalSeconds: 10,
      pendingFixedSlot: null,
      pendingTemplateSlotId: null,
      templateSlots: [],
      createId: () => "new-source",
    });

    expect(
      result.sessions.find((item) => item.id === "new-source")?.timer,
    ).toMatchObject({
      isPaused: false,
    });
  });
});

function source(): SessionPlacementSourceInput {
  return {
    title: "New source",
    items: [
      {
        id: "item-1",
        source: "local",
        title: "Item 1",
        isNsfw: false,
        createdAt: "2026-04-26T00:00:00.000Z",
        media: [{ type: "image", url: "blob:item-1" }],
      },
    ],
    sourceConfig: { kind: "local", fileCount: 1 },
  };
}

function session({
  id,
  isPaused = false,
}: {
  id: string;
  isPaused?: boolean;
}): FeedSession {
  return {
    id,
    title: id,
    layerId: "layer-1",
    timerMode: "global",
    timer: {
      ...createTimerState({ durationSeconds: 10, itemCount: 1 }),
      isPaused,
    },
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
    items: source().items,
    sourceConfig: { kind: "local", fileCount: 1 },
  };
}
