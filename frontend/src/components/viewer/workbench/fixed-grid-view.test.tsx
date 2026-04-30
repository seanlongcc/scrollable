import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import { createTimerState } from "@/lib/viewer/timer";
import { FixedGridView } from "./fixed-grid-view";
import type { FeedSession } from "./types";

describe("FixedGridView", () => {
  it("uses a 1x2 mobile surface for the default 2x1 desktop grid", () => {
    const { container } = render(<FixedGridView {...fixedGridProps()} />);

    const grid = container.firstElementChild as HTMLElement;

    expect(grid.style.getPropertyValue("--mobile-grid-columns")).toBe("1");
    expect(grid.style.getPropertyValue("--mobile-grid-rows")).toBe("2");
  });

  it("caps the mobile grid surface at 3x3 while keeping the desktop grid dimensions", () => {
    const { container } = render(
      <FixedGridView
        {...fixedGridProps({
          fixedGrid: { columns: 16, rows: 16 },
          visibleCells: 256,
        })}
      />,
    );

    const grid = container.firstElementChild as HTMLElement;

    expect(grid.style.getPropertyValue("--mobile-grid-columns")).toBe("3");
    expect(grid.style.getPropertyValue("--mobile-grid-rows")).toBe("3");
    expect(grid.style.getPropertyValue("--desktop-grid-columns")).toBe("16");
    expect(grid.style.getPropertyValue("--desktop-grid-rows")).toBe("16");
    expect(screen.getByTestId("fixed-cell-8")).not.toHaveClass("max-md:hidden");
    expect(screen.getByTestId("fixed-cell-9")).toHaveClass("max-md:hidden");
  });

  it("does not draw the selected outline outside the grid cell", () => {
    render(
      <FixedGridView
        {...fixedGridProps({
          sessions: [session()],
          selectedId: "session-1",
        })}
      />,
    );

    expect(screen.getByTestId("fixed-cell-0")).not.toHaveClass(
      "outline-offset-1",
    );
    expect(screen.getByTestId("feed-selected-outline")).toBeInTheDocument();
  });

  it("keeps the selected outline inside url-only grid panes", () => {
    render(
      <FixedGridView
        {...fixedGridProps({
          sessions: [urlOnlySession()],
          selectedId: "session-1",
        })}
      />,
    );

    expect(screen.getByTestId("fixed-cell-0")).not.toHaveClass(
      "outline-offset-1",
    );
    expect(screen.getByTestId("source-selected-outline")).toBeInTheDocument();
  });
});

function fixedGridProps(
  overrides: Partial<React.ComponentProps<typeof FixedGridView>> = {},
): React.ComponentProps<typeof FixedGridView> {
  return {
    sessions: [],
    visibleCells: 2,
    fixedGrid: { columns: 2, rows: 1 },
    galleryIndexes: {},
    videoPositions: {},
    selectedId: null,
    hideUi: false,
    isPlaybackActive: true,
    showInfo: false,
    openSourcePanel: vi.fn(),
    setSelectedId: vi.fn(),
    setMaximizedId: vi.fn(),
    updateSession: vi.fn(),
    removeSession: vi.fn(),
    changeGallery: vi.fn(),
    onVideoPositionChange: vi.fn(),
    setViewTimerMode: vi.fn(),
    setViewTimerSeconds: vi.fn(),
    onLocalFilesSelected: vi.fn(),
    onLocalCacheAccessRequested: vi.fn(),
    onEditSource: vi.fn(),
    ...overrides,
  };
}

function session(): FeedSession {
  return {
    id: "session-1",
    title: "Selected source",
    layerId: "layer-1",
    timerMode: "global",
    timer: createTimerState({ durationSeconds: 10, itemCount: 1 }),
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
    items: [runtimeItem()],
    sourceConfig: { kind: "url", url: "https://example.test/source" },
  };
}

function urlOnlySession(): FeedSession {
  return {
    ...session(),
    items: [],
  };
}

function runtimeItem(): RuntimeFeedItem {
  return {
    id: "item-1",
    source: "url",
    title: "Selected source",
    isNsfw: false,
    createdAt: "2026-04-30T00:00:00.000Z",
    media: [{ type: "image", url: "https://cdn.test/source.jpg" }],
  };
}
