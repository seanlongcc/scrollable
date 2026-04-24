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
      sessions: [
        {
          id: "session-1",
          title: "r/pics",
          timerMode: "local",
          timerSeconds: 12,
          fixedSlot: 0,
          freeRect: { column: 1, row: 1, columnSpan: 2, rowSpan: 2 },
          sourceConfig: {
            kind: "reddit",
            subreddit: "pics",
            sort: "top",
            timeRange: "day",
            limit: 20,
            skip: 0,
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
              media: [{ type: "image", url: "https://cdn.test/runtime-image.jpg" }],
            },
          ],
        },
      ],
    });

    const encoded = JSON.stringify(snapshot);

    expect(encoded).toContain("pics");
    expect(encoded).not.toContain("https://cdn.test/runtime-image.jpg");
    expect(encoded).not.toContain("runtime-1");
    expect(snapshot.sessions[0]).not.toHaveProperty("runtimeItems");
  });
});
