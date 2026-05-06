import { describe, expect, it } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import {
  createCurrentWorkspaceState,
  workspaceSnapshotToState,
} from "./workspace-state";
import type { FeedSession } from "./types";

describe("workspace state", () => {
  it("preserves paused source timers across workspace tab snapshots", () => {
    const snapshot = createCurrentWorkspaceState({
      activeWorkspaceId: "workspace-1",
      name: "Workspace 1",
      layers: [{ id: "layer-1", name: "Layer 1" }],
      activeLayerId: "layer-1",
      layoutMode: "fixed",
      fixedGrid: { columns: 2, rows: 1 },
      globalSeconds: 10,
      sessions: [session({ isPaused: true })],
      templateSlots: [],
    });

    const restored = workspaceSnapshotToState(snapshot);

    expect(snapshot.sessions[0]?.timerPaused).toBe(true);
    expect(restored.sessions[0]?.timer.isPaused).toBe(true);
  });
});

function session({ isPaused }: { isPaused: boolean }): FeedSession {
  return {
    id: "session-1",
    title: "Paused source",
    layerId: "layer-1",
    timerMode: "global",
    timer: {
      ...createTimerState({ durationSeconds: 10, itemCount: 1 }),
      isPaused,
    },
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
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
