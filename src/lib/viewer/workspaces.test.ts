import { describe, expect, it } from "vitest";

import {
  WORKSPACE_STORAGE_KEY,
  createEmptyWorkspace,
  serializeWorkspace,
} from "./workspaces";

describe("viewer workspaces", () => {
  it("uses a stable localStorage key for metadata-only workspace tabs", () => {
    expect(WORKSPACE_STORAGE_KEY).toBe("scrollable.workspaces.v1");
  });

  it("serializes source and layout metadata without runtime media payloads", () => {
    const workspace = createEmptyWorkspace("workspace-1", "Layout 1");

    const snapshot = serializeWorkspace({
      ...workspace,
      layers: [
        { id: "layer-background", name: "Background" },
        { id: "layer-main", name: "Main" },
      ],
      activeLayerId: "layer-background",
      globalTimerSeconds: 17,
      sessions: [
        {
          id: "session-1",
          title: "r/pics",
          layerId: "layer-background",
          timerMode: "local",
          timerSeconds: 12,
          fixedSlot: 0,
          freeRect: { column: 1, row: 1, columnSpan: 2, rowSpan: 2 },
          sourceConfig: {
            kind: "reddit",
            urls: ["https://www.reddit.com/r/pics/top/?t=week"],
            limit: 24,
            allowNsfw: true,
          },
          runtimeItems: [
            {
              id: "runtime-1",
              source: "reddit",
              title: "Runtime image",
              subreddit: "pics",
              isNsfw: false,
              createdAt: "2026-04-24T00:00:00.000Z",
              media: [
                { type: "image", url: "https://cdn.test/runtime-image.jpg" },
              ],
            },
          ],
        },
      ],
    });

    const encoded = JSON.stringify(snapshot);

    expect(encoded).toContain("https://www.reddit.com/r/pics/top/?t=week");
    expect(encoded).toContain('"limit":24');
    expect(snapshot.layers).toEqual([
      { id: "layer-background", name: "Layer 1" },
      { id: "layer-main", name: "Layer 2" },
    ]);
    expect(snapshot.activeLayerId).toBe("layer-background");
    expect(snapshot.sessions[0]?.layerId).toBe("layer-background");
    expect(encoded).not.toContain("https://cdn.test/runtime-image.jpg");
    expect(encoded).not.toContain("runtime-1");
    expect(snapshot.globalTimerSeconds).toBe(17);
    expect(snapshot.sessions[0]).not.toHaveProperty("runtimeItems");
  });

  it("creates a default editable layer for new workspaces", () => {
    expect(createEmptyWorkspace("workspace-1", "Layout 1")).toMatchObject({
      layers: [{ id: "layer-1", name: "Layer 1" }],
      activeLayerId: "layer-1",
    });
  });
});
