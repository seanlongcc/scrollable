import { describe, expect, it } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import type { FeedSession, WorkspaceLayer } from "./types";
import {
  prepareAddLayerState,
  prepareDeleteActiveLayerState,
  prepareSelectLayerState,
} from "./layer-actions";
import {
  activeLayerSessions,
  availableSeparateSourceSlots,
  deriveLayerStats,
  selectedActiveLayerSession,
  visibleFixedEmptySlots,
} from "./selection-state";

describe("workbench layer actions", () => {
  it("selects a layer while clearing source selection and pending placement", () => {
    expect(prepareSelectLayerState("layer-2")).toEqual({
      activeLayerId: "layer-2",
      selectedId: null,
      maximizedId: null,
      pendingFixedSlot: null,
      pendingTemplateSlotId: null,
    });
  });

  it("adds a layer and activates it with cleared source selection state", () => {
    expect(
      prepareAddLayerState({
        layers: [{ id: "layer-1", name: "Layer 1" }],
        createId: () => "layer-2",
      }),
    ).toEqual({
      layers: [
        { id: "layer-1", name: "Layer 1" },
        { id: "layer-2", name: "Layer 2" },
      ],
      activeLayerId: "layer-2",
      selectedId: null,
      maximizedId: null,
      pendingFixedSlot: null,
      pendingTemplateSlotId: null,
    });
  });

  it("does not add a layer past the configured maximum", () => {
    expect(
      prepareAddLayerState({
        layers: [
          { id: "layer-1", name: "Layer 1" },
          { id: "layer-2", name: "Layer 2" },
        ],
        createId: () => "layer-3",
        maxLayers: 2,
      }),
    ).toBeNull();
  });

  it("deletes the middle layer while preserving remaining content and pruning stale runtime positions", () => {
    const sessions = [
      session({ id: "first", layerId: "layer-1", itemIds: ["first-item"] }),
      session({ id: "middle", layerId: "layer-2", itemIds: ["middle-item"] }),
      session({ id: "third", layerId: "layer-3", itemIds: ["third-item"] }),
    ];

    const result = prepareDeleteActiveLayerState({
      layers: layers(),
      activeLayerId: "layer-2",
      sessions,
      templateSlots: [
        {
          id: "slot-1",
          layerId: "layer-2",
          freeRect: { column: 1, row: 1, columnSpan: 1, rowSpan: 1 },
        },
        {
          id: "slot-2",
          layerId: "layer-3",
          freeRect: { column: 2, row: 1, columnSpan: 1, rowSpan: 1 },
        },
      ],
      galleryIndexes: {
        "first-item": 1,
        "middle-item": 2,
        "third-item": 3,
      },
      videoPositions: {
        "first:first-item": 10,
        "middle:middle-item": 20,
        "third:third-item": 30,
      },
    });

    expect(result.nextLayers).toEqual([
      { id: "layer-1", name: "Layer 1" },
      { id: "layer-3", name: "Layer 2" },
    ]);
    expect(result.nextActiveLayerId).toBe("layer-3");
    expect(result.nextSessions.map((item) => item.id)).toEqual([
      "first",
      "third",
    ]);
    expect(result.nextTemplateSlots.map((slot) => slot.id)).toEqual(["slot-2"]);
    expect(result.nextGalleryIndexes).toEqual({
      "first-item": 1,
      "third-item": 3,
    });
    expect(result.nextVideoPositions).toEqual({
      "first:first-item": 10,
      "third:third-item": 30,
    });
    expect(result.nextSelectedId).toBe("third");
    expect(result.nextMaximizedId).toBeNull();
    expect(result.nextPendingFixedSlot).toBeNull();
    expect(result.nextPendingTemplateSlotId).toBeNull();
  });
});

describe("workbench selection state", () => {
  it("derives active-layer sessions without touching inactive layers", () => {
    const sessions = [
      session({ id: "first", layerId: "layer-1" }),
      session({ id: "second", layerId: "layer-2" }),
    ];

    expect(
      activeLayerSessions(sessions, "layer-2").map((item) => item.id),
    ).toEqual(["second"]);
  });

  it("only returns a selected source when selectedId matches the active layer", () => {
    const sessions = [
      session({ id: "first", layerId: "layer-1" }),
      session({ id: "second", layerId: "layer-2" }),
    ];

    expect(
      selectedActiveLayerSession({
        sessions,
        activeLayerId: "layer-1",
        selectedId: null,
      }),
    ).toBeUndefined();
    expect(
      selectedActiveLayerSession({
        sessions,
        activeLayerId: "layer-1",
        selectedId: "second",
      }),
    ).toBeUndefined();
    expect(
      selectedActiveLayerSession({
        sessions,
        activeLayerId: "layer-2",
        selectedId: "second",
      })?.id,
    ).toBe("second");
  });

  it("counts layer sources and files by layer", () => {
    const stats = deriveLayerStats({
      layers: layers(),
      sessions: [
        session({ id: "first", layerId: "layer-1", fileCount: 2 }),
        session({ id: "second", layerId: "layer-1", fileCount: 1 }),
        session({ id: "third", layerId: "layer-3", fileCount: 4 }),
      ],
    });

    expect(stats).toEqual([
      { id: "layer-1", name: "Layer 1", sourceCount: 2, fileCount: 3 },
      { id: "layer-2", name: "Layer 2", sourceCount: 0, fileCount: 0 },
      { id: "layer-3", name: "Layer 3", sourceCount: 1, fileCount: 4 },
    ]);
  });

  it("derives visible fixed empty slots for the active layer only", () => {
    expect(
      visibleFixedEmptySlots({
        sessions: [
          session({ id: "first", layerId: "layer-1", fixedSlot: 1 }),
          session({ id: "second", layerId: "layer-2", fixedSlot: 2 }),
        ],
        activeLayerId: "layer-1",
        visibleFixedCells: 4,
      }),
    ).toEqual([0, 2, 3]);
  });

  it("counts available separate-source slots for fixed and free layouts", () => {
    expect(
      availableSeparateSourceSlots({
        layoutMode: "fixed",
        visibleEmptySlots: [0, 2],
        activeLayerFreeRects: [],
        pendingTemplateSlotId: "slot-1",
      }),
    ).toBe(2);
    expect(
      availableSeparateSourceSlots({
        layoutMode: "free",
        visibleEmptySlots: [],
        activeLayerFreeRects: [
          { column: 1, row: 1, columnSpan: 1, rowSpan: 1 },
        ],
        pendingTemplateSlotId: "slot-1",
      }),
    ).toBe(256);
  });
});

function layers(): WorkspaceLayer[] {
  return [
    { id: "layer-1", name: "Layer 1" },
    { id: "layer-2", name: "Layer 2" },
    { id: "layer-3", name: "Layer 3" },
  ];
}

function session({
  id,
  layerId,
  fixedSlot = 0,
  itemIds = [`${id}-item`],
  fileCount = itemIds.length,
}: {
  id: string;
  layerId: string;
  fixedSlot?: number;
  itemIds?: string[];
  fileCount?: number;
}): FeedSession {
  const items = itemIds.map((itemId) => ({
    id: itemId,
    source: "local" as const,
    title: itemId,
    isNsfw: false,
    createdAt: "2026-04-26T00:00:00.000Z",
    media: [{ type: "image" as const, url: `blob:${itemId}` }],
  }));

  return {
    id,
    title: id,
    layerId,
    timerMode: "global",
    timer: createTimerState({
      durationSeconds: 10,
      itemCount: items.length,
    }),
    fixedSlot,
    freeRect: { column: 1, row: 1, columnSpan: 1, rowSpan: 1 },
    items,
    allItems: items,
    sourceConfig: { kind: "local", fileCount },
  };
}
