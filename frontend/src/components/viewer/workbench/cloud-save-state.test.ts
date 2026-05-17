import { describe, expect, it } from "vitest";

import type { SerializedWorkspace, SerializedWorkspaceTemplate } from "./types";
import * as cloudSaveState from "./cloud-save-state";
import {
  CLOUD_METADATA_QUOTA_BYTES,
  cloudLibraryUsage,
  cloudSaveBlockReason,
  cloudUsageLabel,
  cloudUsagePercent,
  formatCloudBytes,
  workspaceHasLocalSources,
} from "./cloud-save-state";

describe("cloud save state", () => {
  it("detects layouts that contain local file sources", () => {
    expect(workspaceHasLocalSources(workspace({ sourceKind: "local" }))).toBe(
      true,
    );
    expect(workspaceHasLocalSources(workspace({ sourceKind: "url" }))).toBe(
      false,
    );
  });

  it("allows Cloud layout save with local sources so they can become empty boxes", () => {
    expect(
      cloudSaveBlockReason({
        account: { status: "signed-in", email: "user@example.com" },
        usage: cloudLibraryUsage({
          workspaces: [],
          templates: [],
        }),
        hasLocalSources: true,
        isTemplate: false,
      }),
    ).toBeNull();
  });

  it("turns local free-layout sources into empty boxes for portable Cloud and JSON saves", () => {
    const toPortable = (
      cloudSaveState as unknown as {
        layoutWithLocalSourcesAsEmptyBoxes?: (
          workspace: SerializedWorkspace,
        ) => SerializedWorkspace & {
          templateSlots?: Array<{
            id: string;
            layerId: string;
            freeRect: {
              column: number;
              row: number;
              columnSpan: number;
              rowSpan: number;
            };
          }>;
        };
      }
    ).layoutWithLocalSourcesAsEmptyBoxes;

    const portable = toPortable?.(freeWorkspaceWithLocalAndUrlSources());

    expect(portable).toMatchObject({
      sessions: [
        {
          id: "session-url",
          sourceConfig: { kind: "url", url: "https://example.com/gallery" },
        },
      ],
      templateSlots: [
        {
          id: "slot-existing",
          layerId: "layer-1",
          freeRect: { column: 9, row: 1, columnSpan: 3, rowSpan: 3 },
        },
        {
          id: "session-local",
          layerId: "layer-1",
          freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
        },
      ],
    });
    expect(JSON.stringify(portable)).not.toContain('"kind":"local"');
    expect(JSON.stringify(portable)).not.toContain("cache-local-1");
    expect(JSON.stringify(portable)).not.toContain("videoTimeRanges");
  });

  it("measures cloud metadata usage across layouts and templates", () => {
    const usage = cloudLibraryUsage({
      workspaces: [workspace({ sourceKind: "url" })],
      templates: [template()],
      quotaBytes: CLOUD_METADATA_QUOTA_BYTES,
      isUnlimited: false,
    });

    expect(usage.layoutCount).toBe(1);
    expect(usage.templateCount).toBe(1);
    expect(usage.usedBytes).toBeGreaterThan(0);
    expect(usage.quotaBytes).toBe(CLOUD_METADATA_QUOTA_BYTES);
    expect(usage.isUnlimited).toBe(false);
  });

  it("formats cloud byte labels compactly", () => {
    expect(formatCloudBytes(2048)).toBe("2.0 KB");
    expect(formatCloudBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("labels Cloud load failures without implying the user is signed out", () => {
    expect(
      cloudUsageLabel({
        status: "error",
        message: "Cloud library load failed",
      }),
    ).toBe("Cloud unavailable: Cloud library load failed");
  });

  it("clamps near-full quota usage and labels admin usage as unlimited", () => {
    expect(
      cloudUsagePercent({
        status: "ready",
        usedBytes: 6 * 1024 * 1024,
        quotaBytes: CLOUD_METADATA_QUOTA_BYTES,
        isUnlimited: false,
        layoutCount: 3,
        templateCount: 2,
      }),
    ).toBe(100);

    expect(
      cloudUsageLabel({
        status: "ready",
        usedBytes: 6 * 1024,
        quotaBytes: CLOUD_METADATA_QUOTA_BYTES,
        isUnlimited: true,
        layoutCount: 3,
        templateCount: 2,
      }),
    ).toBe("6.0 KB / Unlimited");
  });
});

function workspace({
  sourceKind,
}: {
  sourceKind: "local" | "url";
}): SerializedWorkspace {
  return {
    id: "workspace-1",
    name: "Saved layout",
    layers: [{ id: "layer-1", name: "Layer 1" }],
    activeLayerId: "layer-1",
    layoutMode: "fixed",
    fixedGrid: { columns: 2, rows: 1 },
    globalTimerSeconds: 10,
    sessions: [
      {
        id: "session-1",
        title: "Source",
        layerId: "layer-1",
        timerMode: "global",
        timerSeconds: 10,
        timerActiveIndex: 0,
        fixedSlot: 0,
        freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
        sourceConfig:
          sourceKind === "local"
            ? { kind: "local", fileCount: 2 }
            : { kind: "url", url: "https://example.com/gallery" },
      },
    ],
    updatedAt: "2026-04-28T00:00:00.000Z",
  };
}

function freeWorkspaceWithLocalAndUrlSources(): SerializedWorkspace {
  const layout = {
    id: "workspace-1",
    name: "Free layout",
    layers: [{ id: "layer-1", name: "Layer 1" }],
    activeLayerId: "layer-1",
    layoutMode: "free",
    fixedGrid: { columns: 2, rows: 1 },
    globalTimerSeconds: 10,
    templateSlots: [
      {
        id: "slot-existing",
        layerId: "layer-1",
        freeRect: { column: 9, row: 1, columnSpan: 3, rowSpan: 3 },
      },
    ],
    sessions: [
      {
        id: "session-local",
        title: "Local source",
        layerId: "layer-1",
        timerMode: "global",
        timerSeconds: 10,
        timerActiveIndex: 0,
        fixedSlot: 0,
        freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
        sourceConfig: {
          kind: "local",
          fileCount: 2,
          cacheSetId: "cache-local-1",
          videoTimeRanges: {
            0: { startSeconds: 10, endSeconds: 30 },
          },
        },
      },
      {
        id: "session-url",
        title: "URL source",
        layerId: "layer-1",
        timerMode: "global",
        timerSeconds: 10,
        timerActiveIndex: 0,
        fixedSlot: 1,
        freeRect: { column: 5, row: 1, columnSpan: 4, rowSpan: 4 },
        sourceConfig: { kind: "url", url: "https://example.com/gallery" },
      },
    ],
    updatedAt: "2026-04-28T00:00:00.000Z",
  };

  return layout as SerializedWorkspace;
}

function template(): SerializedWorkspaceTemplate {
  return {
    id: "template-1",
    name: "Template",
    layers: [{ id: "layer-1", name: "Layer 1" }],
    activeLayerId: "layer-1",
    globalTimerSeconds: 10,
    slots: [
      {
        id: "slot-1",
        layerId: "layer-1",
        freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
      },
    ],
    updatedAt: "2026-04-28T00:00:00.000Z",
  };
}
