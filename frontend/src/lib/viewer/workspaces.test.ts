import { describe, expect, it } from "vitest";

import {
  WORKSPACE_TEMPLATE_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  createEmptyWorkspace,
  parseWorkspaceTemplateStore,
  serializeWorkspaceTemplate,
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

  it("serializes free-layout empty boxes with layouts", () => {
    const workspace = {
      ...createEmptyWorkspace("workspace-1", "Layout 1"),
      layoutMode: "free" as const,
      templateSlots: [
        {
          id: "slot-1",
          layerId: "layer-1",
          freeRect: { column: 5, row: 5, columnSpan: 4, rowSpan: 4 },
        },
      ],
    };

    const snapshot = serializeWorkspace(workspace) as ReturnType<
      typeof serializeWorkspace
    > & {
      templateSlots?: typeof workspace.templateSlots;
    };

    expect(snapshot.templateSlots).toEqual([
      {
        id: "slot-1",
        layerId: "layer-1",
        freeRect: { column: 5, row: 5, columnSpan: 4, rowSpan: 4 },
      },
    ]);
  });

  it("serializes URL sources with resolver hints but without runtime URL payloads", () => {
    const workspace = createEmptyWorkspace("workspace-1", "Layout 1");

    const snapshot = serializeWorkspace({
      ...workspace,
      sessions: [
        {
          id: "session-1",
          title: "Example URL",
          timerMode: "global",
          timerSeconds: 10,
          fixedSlot: 0,
          freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
          sourceConfig: {
            kind: "url",
            url: "https://example.com/watch",
            title: "User title",
            resolverHint: "metadata",
          },
          runtimeItems: [
            {
              id: "runtime-url",
              source: "url",
              title: "Extracted media",
              isNsfw: false,
              createdAt: "2026-04-25T00:00:00.000Z",
              media: [{ type: "image", url: "https://cdn.test/extracted.jpg" }],
            },
          ],
          urlResolution: {
            status: "resolved",
            mode: "metadata",
            hint: "metadata",
            title: "Extracted title",
            externalUrl: "https://example.com/watch",
            metadata: {
              title: "Extracted title",
              description: "Fetched description",
              thumbnailUrl: "https://cdn.test/thumb.jpg",
            },
          },
        },
      ],
    });

    const encoded = JSON.stringify(snapshot);

    expect(encoded).toContain("https://example.com/watch");
    expect(encoded).toContain('"resolverHint":"metadata"');
    expect(encoded).toContain("User title");
    expect(encoded).not.toContain("https://cdn.test/extracted.jpg");
    expect(encoded).not.toContain("https://cdn.test/thumb.jpg");
    expect(encoded).not.toContain("Fetched description");
    expect(snapshot.sessions[0]).not.toHaveProperty("runtimeItems");
    expect(snapshot.sessions[0]).not.toHaveProperty("urlResolution");
  });

  it("serializes gallery URL hints without runtime image payloads", () => {
    const workspace = createEmptyWorkspace("workspace-1", "Layout 1");

    const snapshot = serializeWorkspace({
      ...workspace,
      sessions: [
        {
          id: "session-1",
          title: "Gallery URL",
          timerMode: "global",
          timerSeconds: 10,
          fixedSlot: 0,
          freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
          sourceConfig: {
            kind: "url",
            url: "https://nhentai.net/g/123456/",
            title: "User gallery title",
            resolverHint: "provider:gallery",
          },
          runtimeItems: [
            {
              id: "url:gallery:runtime",
              source: "url",
              title: "Runtime gallery image",
              isNsfw: true,
              createdAt: "2026-04-25T00:00:00.000Z",
              media: [
                {
                  type: "image",
                  url: "https://i.nhentai.net/galleries/98765/1.jpg",
                },
              ],
            },
          ],
          urlResolution: {
            status: "resolved",
            mode: "provider",
            hint: "provider:gallery",
            provider: "gallery",
            title: "Runtime gallery",
            externalUrl: "https://nhentai.net/g/123456/",
            items: [
              {
                id: "url:gallery:runtime",
                source: "url",
                title: "Runtime gallery image",
                isNsfw: true,
                createdAt: "2026-04-25T00:00:00.000Z",
                media: [
                  {
                    type: "image",
                    url: "https://i.nhentai.net/galleries/98765/1.jpg",
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    const encoded = JSON.stringify(snapshot);

    expect(encoded).toContain("https://nhentai.net/g/123456/");
    expect(encoded).toContain('"resolverHint":"provider:gallery"');
    expect(encoded).toContain("User gallery title");
    expect(encoded).not.toContain(
      "https://i.nhentai.net/galleries/98765/1.jpg",
    );
    expect(encoded).not.toContain("url:gallery:runtime");
    expect(snapshot.sessions[0]).not.toHaveProperty("runtimeItems");
    expect(snapshot.sessions[0]).not.toHaveProperty("urlResolution");
  });

  it("creates the default editable layers for new workspaces", () => {
    expect(createEmptyWorkspace("workspace-1", "Layout 1")).toMatchObject({
      layers: [
        { id: "layer-1", name: "Layer 1" },
        { id: "layer-2", name: "Layer 2" },
        { id: "layer-3", name: "Layer 3" },
      ],
      activeLayerId: "layer-1",
    });
  });

  it("serializes free layout templates as empty boxes without source metadata", () => {
    const workspace = createEmptyWorkspace("workspace-1", "Layout 1");

    const template = serializeWorkspaceTemplate({
      ...workspace,
      layoutMode: "free",
      globalTimerSeconds: 17,
      templateSlots: [
        {
          id: "slot-1",
          layerId: "layer-1",
          freeRect: { column: 5, row: 5, columnSpan: 4, rowSpan: 4 },
        },
      ],
      sessions: [
        {
          id: "session-1",
          title: "Runtime source",
          layerId: "layer-1",
          timerMode: "global",
          timerSeconds: 10,
          fixedSlot: 0,
          freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
          sourceConfig: {
            kind: "url",
            url: "https://example.com/gallery",
            resolverHint: "provider:gallery",
          },
          runtimeItems: [
            {
              id: "runtime-1",
              source: "url",
              title: "Runtime image",
              isNsfw: false,
              createdAt: "2026-04-25T00:00:00.000Z",
              media: [{ type: "image", url: "https://cdn.test/image.jpg" }],
            },
          ],
        },
      ],
    });

    const encoded = JSON.stringify(template);

    expect(WORKSPACE_TEMPLATE_STORAGE_KEY).toBe(
      "scrollable.workspace-templates.v1",
    );
    expect(template.slots).toEqual([
      {
        id: "slot-1",
        layerId: "layer-1",
        freeRect: { column: 5, row: 5, columnSpan: 4, rowSpan: 4 },
      },
      {
        id: "session-1",
        layerId: "layer-1",
        freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
      },
    ]);
    expect(template.globalTimerSeconds).toBe(17);
    expect(encoded).not.toContain("sourceConfig");
    expect(encoded).not.toContain("https://example.com/gallery");
    expect(encoded).not.toContain("https://cdn.test/image.jpg");
    expect(encoded).not.toContain("runtime-1");
  });

  it("parses template stores with valid free boxes and rejects malformed stores", () => {
    const encoded = JSON.stringify({
      templates: [
        {
          id: "template-1",
          name: "Poster wall",
          layers: [{ id: "layer-1", name: "Layer 1" }],
          activeLayerId: "layer-1",
          globalTimerSeconds: 11,
          slots: [
            {
              id: "slot-1",
              layerId: "layer-1",
              freeRect: { column: 1, row: 2, columnSpan: 3, rowSpan: 4 },
            },
          ],
          updatedAt: "2026-04-25T00:00:00.000Z",
        },
      ],
    });

    expect(parseWorkspaceTemplateStore(encoded)).toEqual({
      templates: [
        {
          id: "template-1",
          name: "Poster wall",
          layers: [{ id: "layer-1", name: "Layer 1" }],
          activeLayerId: "layer-1",
          globalTimerSeconds: 11,
          slots: [
            {
              id: "slot-1",
              layerId: "layer-1",
              freeRect: { column: 1, row: 2, columnSpan: 3, rowSpan: 4 },
            },
          ],
          updatedAt: "2026-04-25T00:00:00.000Z",
        },
      ],
    });
    expect(parseWorkspaceTemplateStore(null)).toBeNull();
    expect(parseWorkspaceTemplateStore('{"templates":{}}')).toBeNull();
    expect(
      parseWorkspaceTemplateStore(
        '{"templates":[{"id":"bad","name":"Bad","slots":[{"id":"slot","freeRect":{"column":0,"row":1,"columnSpan":1,"rowSpan":1}}]}]}',
      ),
    ).toBeNull();
  });
});
