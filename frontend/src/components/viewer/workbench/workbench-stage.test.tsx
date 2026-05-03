import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_FIXED_GRID } from "@/lib/viewer/layout";
import { createTimerState } from "@/lib/viewer/timer";
import { WorkbenchStage } from "./workbench-stage";
import type { FeedSession, WorkspaceLayer } from "./types";

describe("WorkbenchStage", () => {
  it("renders only the active fixed-layout layer", () => {
    render(
      <WorkbenchStage
        {...stageProps({
          layoutMode: "fixed",
          activeLayerId: "layer-1",
          sessions: [
            session({
              id: "active",
              title: "Active image",
              layerId: "layer-1",
            }),
            session({
              id: "inactive",
              title: "Inactive image",
              layerId: "layer-2",
            }),
          ],
        })}
      />,
    );

    expect(screen.getByAltText("Active image")).toBeInTheDocument();
    expect(screen.queryByAltText("Inactive image")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("layer-2-fixed-cell-0"),
    ).not.toBeInTheDocument();
  });

  it("renders only the active free-layout layer", () => {
    render(
      <WorkbenchStage
        {...stageProps({
          layoutMode: "free",
          activeLayerId: "layer-2",
          sessions: [
            session({
              id: "inactive",
              title: "Inactive image",
              layerId: "layer-1",
            }),
            session({
              id: "active",
              title: "Active image",
              layerId: "layer-2",
            }),
          ],
        })}
      />,
    );

    expect(screen.getByAltText("Active image")).toBeInTheDocument();
    expect(screen.queryByAltText("Inactive image")).not.toBeInTheDocument();
    expect(screen.queryByTestId("free-cell-inactive")).not.toBeInTheDocument();
  });
});

function stageProps({
  layoutMode,
  activeLayerId,
  sessions,
}: {
  layoutMode: "fixed" | "free";
  activeLayerId: string;
  sessions: FeedSession[];
}): Parameters<typeof WorkbenchStage>[0] {
  return {
    maximized: null,
    sessions,
    galleryIndexes: {},
    videoPositions: {},
    isUiHidden: false,
    isDesktopWorkbenchCollapsed: false,
    showAllInfo: false,
    setMaximizedId: vi.fn(),
    changeGallery: vi.fn(),
    rememberVideoPosition: vi.fn(),
    updateSession: vi.fn(),
    setViewTimerMode: vi.fn(),
    setViewTimerSeconds: vi.fn(),
    replaceLocalSessionFiles: vi.fn(),
    requestLocalCacheAccess: vi.fn(),
    openEditSource: vi.fn(),
    layoutMode,
    layers: layers(),
    activeLayerId,
    fixedGrid: DEFAULT_FIXED_GRID,
    visibleFixedCells: DEFAULT_FIXED_GRID.columns * DEFAULT_FIXED_GRID.rows,
    selectedId: null,
    openSourcePanel: vi.fn(),
    setSelectedId: vi.fn(),
    removeSession: vi.fn(),
    freeGridRef: createRef<HTMLDivElement>(),
    templateSlots: [],
    freeDrag: null,
    removeTemplateSlot: vi.fn(),
    beginFreeDrag: vi.fn(),
  };
}

function layers(): WorkspaceLayer[] {
  return [
    { id: "layer-1", name: "Layer 1" },
    { id: "layer-2", name: "Layer 2" },
  ];
}

function session({
  id,
  title,
  layerId,
}: {
  id: string;
  title: string;
  layerId: string;
}): FeedSession {
  return {
    id,
    title,
    layerId,
    timerMode: "global",
    timer: createTimerState({ durationSeconds: 10, itemCount: 1 }),
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
    items: [
      {
        id,
        source: "url",
        title,
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
