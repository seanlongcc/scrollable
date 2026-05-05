import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import { WorkbenchPanelContent } from "./workbench-panel";

describe("WorkbenchPanelContent", () => {
  it("places selected source randomize before remove and shows enabled random order", async () => {
    const user = userEvent.setup();
    const onRandomizeSelectedSource = vi.fn();

    render(
      <WorkbenchPanelContent
        {...panelProps({
          selected: selectedSession("reddit"),
          onRandomizeSelectedSource,
        })}
      />,
    );

    const randomize = screen.getByRole("button", {
      name: "Randomize selected source",
    });
    const remove = screen.getByRole("button", { name: "Remove" });

    expect(randomize).toHaveAttribute("aria-pressed", "true");
    expect(randomize).toHaveAttribute("data-variant", "default");
    expect(
      randomize.compareDocumentPosition(remove) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(randomize);

    expect(onRandomizeSelectedSource).toHaveBeenCalledOnce();
  });

  it("shows normal randomize color when random order is disabled", () => {
    render(
      <WorkbenchPanelContent
        {...panelProps({
          selected: { ...selectedSession("reddit"), isOrderRandomized: false },
        })}
      />,
    );

    const randomize = screen.getByRole("button", {
      name: "Randomize selected source",
    });

    expect(randomize).toHaveAttribute("aria-pressed", "false");
    expect(randomize).toHaveAttribute("data-variant", "outline");
  });

  it("hides selected source randomize for URL sources", () => {
    render(
      <WorkbenchPanelContent
        {...panelProps({
          selected: selectedSession("url"),
        })}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Randomize selected source" }),
    ).not.toBeInTheDocument();
  });
});

function panelProps(
  overrides: Partial<ComponentProps<typeof WorkbenchPanelContent>> = {},
): ComponentProps<typeof WorkbenchPanelContent> {
  return {
    mode: "desktop",
    workspaceName: "Layout 1",
    layoutMode: "fixed",
    layoutModeLocked: false,
    fixedGrid: { columns: 2, rows: 2 },
    globalSeconds: 10,
    hasRunningSessionTimer: false,
    selected: null,
    canCloneOrFillSelectedSource: false,
    showAllInfo: false,
    isClearDisabled: false,
    layers: [{ id: "layer-1", name: "Layer 1" }],
    layerStats: [
      { id: "layer-1", name: "Layer 1", sourceCount: 1, fileCount: 2 },
    ],
    activeLayerId: "layer-1",
    onLayoutModeChange: vi.fn(),
    onFixedGridChange: vi.fn(),
    onGlobalTimerSecondsChange: vi.fn(),
    onGlobalTimerAction: vi.fn(),
    onCloneSelectedSource: vi.fn(),
    onFillSelectedSourceSpace: vi.fn(),
    onRemoveSelectedSource: vi.fn(),
    onRandomizeSelectedSource: vi.fn(),
    onSelectedTimerModeChange: vi.fn(),
    onSelectedTimerSecondsChange: vi.fn(),
    onSelectedMove: vi.fn(),
    onSelectedTogglePaused: vi.fn(),
    onSelectedRestart: vi.fn(),
    onEditSelectedSource: vi.fn(),
    onOpenSatellite: vi.fn(),
    onToggleShowAllInfo: vi.fn(),
    onHideUi: vi.fn(),
    onAddSource: vi.fn(),
    onOpenSaveDialog: vi.fn(),
    onImportJson: vi.fn(),
    onExportCurrentJson: vi.fn(),
    onOpenClearDialog: vi.fn(),
    onPreloadOverlays: vi.fn(),
    onSelectLayer: vi.fn(),
    ...overrides,
  } as ComponentProps<typeof WorkbenchPanelContent>;
}

function selectedSession(kind: "local" | "reddit" | "url"): FeedSession {
  const items: FeedSession["items"] = [
    {
      id: `${kind}:first`,
      source: kind,
      title: "First",
      isNsfw: false,
      createdAt: "2026-04-24T00:00:00.000Z",
      media: [{ type: "image", url: "https://cdn.test/first.jpg" }],
    },
    {
      id: `${kind}:second`,
      source: kind,
      title: "Second",
      isNsfw: false,
      createdAt: "2026-04-24T00:00:00.000Z",
      media: [{ type: "image", url: "https://cdn.test/second.jpg" }],
    },
  ];

  return {
    id: "session-1",
    title: "Selected",
    layerId: "layer-1",
    timerMode: "global",
    timer: createTimerState({ durationSeconds: 10, itemCount: items.length }),
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 2, rowSpan: 2 },
    items,
    sourceConfig:
      kind === "local"
        ? { kind: "local", fileCount: items.length }
        : kind === "reddit"
          ? {
              kind: "reddit",
              urls: ["https://www.reddit.com/r/pics/top/?t=week"],
              limit: 10,
              allowNsfw: true,
            }
          : { kind: "url", url: "https://example.com/source" },
  };
}
