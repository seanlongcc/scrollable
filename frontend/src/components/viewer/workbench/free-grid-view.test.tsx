import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import { createTimerState } from "@/lib/viewer/timer";
import { FreeGridView } from "./free-grid-view";
import type { FeedSession } from "./types";

describe("FreeGridView", () => {
  it("uses one selected outline for runtime media panes", () => {
    render(
      <FreeGridView
        {...freeGridProps({
          sessions: [session()],
          selectedId: "session-1",
        })}
      />,
    );

    expect(screen.getByTestId("free-cell-session-1")).not.toHaveClass(
      "outline-primary",
      "outline-offset-1",
      "ring-2",
    );
    expect(screen.getByTestId("feed-selected-outline")).toBeInTheDocument();
  });

  it("uses one selected outline for url-only panes", () => {
    render(
      <FreeGridView
        {...freeGridProps({
          sessions: [urlOnlySession()],
          selectedId: "session-1",
        })}
      />,
    );

    expect(screen.getByTestId("free-cell-session-1")).not.toHaveClass(
      "outline-primary",
      "outline-offset-1",
      "ring-2",
    );
    expect(screen.getByTestId("source-selected-outline")).toBeInTheDocument();
  });

  it("deselects the selected source when its media is clicked again", () => {
    const setSelectedId = vi.fn();
    render(
      <FreeGridView
        {...freeGridProps({
          sessions: [session()],
          selectedId: "session-1",
          setSelectedId,
        })}
      />,
    );

    fireEvent.click(screen.getByAltText("Selected source"));

    expect(setSelectedId).toHaveBeenCalledWith(null);
  });

  it("deselects the selected source when empty grid space is clicked", () => {
    const setSelectedId = vi.fn();
    const { container } = render(
      <FreeGridView
        {...freeGridProps({
          sessions: [session()],
          selectedId: "session-1",
          setSelectedId,
        })}
      />,
    );

    fireEvent.click(container.firstElementChild as HTMLElement);

    expect(setSelectedId).toHaveBeenCalledWith(null);
  });
});

function freeGridProps(
  overrides: Partial<React.ComponentProps<typeof FreeGridView>> = {},
): React.ComponentProps<typeof FreeGridView> {
  return {
    sessions: [],
    templateSlots: [],
    galleryIndexes: {},
    videoPositions: {},
    selectedId: null,
    hideUi: false,
    isPlaybackActive: true,
    showInfo: false,
    freeDrag: null,
    setSelectedId: vi.fn(),
    setMaximizedId: vi.fn(),
    updateSession: vi.fn(),
    removeSession: vi.fn(),
    removeTemplateSlot: vi.fn(),
    openSourcePanel: vi.fn(),
    changeGallery: vi.fn(),
    onVideoPositionChange: vi.fn(),
    setViewTimerMode: vi.fn(),
    setViewTimerSeconds: vi.fn(),
    beginFreeDrag: vi.fn(),
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
    createdAt: "2026-05-01T00:00:00.000Z",
    media: [{ type: "image", url: "https://cdn.test/source.jpg" }],
  };
}
