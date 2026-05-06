import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import { WorkbenchPanelContent } from "./workbench-panel";

describe("WorkbenchPanelContent", () => {
  it("shows global settings with unmute-all and finish-video controls", async () => {
    const user = userEvent.setup();
    const onGlobalAudioEnabledChange = vi.fn();
    const onFinishVideoBeforeAdvanceChange = vi.fn();
    const onRandomVideoStartChange = vi.fn();
    const onGlobalOrderRandomizedChange = vi.fn();

    render(
      <WorkbenchPanelContent
        {...panelProps({
          globalAudioEnabled: false,
          finishVideoBeforeAdvance: false,
          randomVideoStart: false,
          onGlobalAudioEnabledChange,
          onFinishVideoBeforeAdvanceChange,
          onRandomVideoStartChange,
          globalOrderRandomized: true,
          onGlobalOrderRandomizedChange,
        })}
      />,
    );

    expect(screen.getByText("Global settings")).toBeInTheDocument();
    expect(screen.queryByText("Global timer")).not.toBeInTheDocument();

    const unmuteAll = screen.getByRole("button", { name: "Unmute all" });
    const finishVideo = screen.getByRole("button", { name: "Finish video" });
    const randomSeek = screen.getByRole("button", {
      name: "Random seek",
    });
    const shuffle = screen.getByRole("button", { name: "Shuffle all sources" });

    expect(unmuteAll).toHaveAttribute("aria-pressed", "false");
    expect(unmuteAll).toHaveAttribute("data-variant", "outline");
    expect(finishVideo).toHaveAttribute("aria-pressed", "false");
    expect(finishVideo).toHaveAttribute("data-variant", "outline");
    expect(randomSeek).toHaveTextContent("Random seek");
    expect(randomSeek).toHaveAttribute("aria-pressed", "false");
    expect(randomSeek).toHaveAttribute("data-variant", "outline");
    expect(shuffle).toHaveTextContent("Shuffle");
    expect(shuffle).toHaveAttribute("aria-pressed", "true");
    expect(shuffle).toHaveAttribute("data-variant", "default");
    expect(
      randomSeek.compareDocumentPosition(shuffle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(unmuteAll);
    await user.click(finishVideo);
    await user.click(randomSeek);
    await user.click(shuffle);

    expect(onGlobalAudioEnabledChange).toHaveBeenCalledWith(true);
    expect(onFinishVideoBeforeAdvanceChange).toHaveBeenCalledWith(true);
    expect(onRandomVideoStartChange).toHaveBeenCalledWith(true);
    expect(onGlobalOrderRandomizedChange).toHaveBeenCalledWith(false);
  });

  it("shows disabled global shuffle state and toggles it back on", async () => {
    const user = userEvent.setup();
    const onGlobalOrderRandomizedChange = vi.fn();

    render(
      <WorkbenchPanelContent
        {...panelProps({
          globalOrderRandomized: false,
          onGlobalOrderRandomizedChange,
        })}
      />,
    );

    const shuffle = screen.getByRole("button", { name: "Shuffle all sources" });

    expect(shuffle).toHaveAttribute("aria-pressed", "false");
    expect(shuffle).toHaveAttribute("data-variant", "outline");

    await user.click(shuffle);

    expect(onGlobalOrderRandomizedChange).toHaveBeenCalledWith(true);
  });

  it("renames global audio action to mute-all when audio is enabled", async () => {
    const user = userEvent.setup();
    const onGlobalAudioEnabledChange = vi.fn();

    render(
      <WorkbenchPanelContent
        {...panelProps({
          globalAudioEnabled: true,
          onGlobalAudioEnabledChange,
        })}
      />,
    );

    const muteAll = screen.getByRole("button", { name: "Mute all" });

    expect(muteAll).toHaveAttribute("aria-pressed", "true");
    expect(muteAll).toHaveAttribute("data-variant", "default");

    await user.click(muteAll);

    expect(onGlobalAudioEnabledChange).toHaveBeenCalledWith(false);
  });

  it("shows selected source unmute control", async () => {
    const user = userEvent.setup();
    const onSelectedAudioEnabledChange = vi.fn();

    render(
      <WorkbenchPanelContent
        {...panelProps({
          globalAudioEnabled: false,
          selected: selectedSession("url"),
          onSelectedAudioEnabledChange,
        })}
      />,
    );

    const unmute = screen.getByRole("button", {
      name: "Unmute selected source",
    });

    expect(unmute).toHaveAttribute("aria-pressed", "false");
    expect(unmute).toHaveAttribute("data-variant", "outline");

    await user.click(unmute);

    expect(onSelectedAudioEnabledChange).toHaveBeenCalledWith(true);
  });

  it("renames selected audio action to mute when source audio is enabled", async () => {
    const user = userEvent.setup();
    const onSelectedAudioEnabledChange = vi.fn();

    render(
      <WorkbenchPanelContent
        {...panelProps({
          globalAudioEnabled: true,
          selected: selectedSession("url"),
          onSelectedAudioEnabledChange,
        })}
      />,
    );

    const mute = screen.getByRole("button", {
      name: "Mute selected source",
    });

    expect(mute).toHaveAttribute("aria-pressed", "true");
    expect(mute).toHaveAttribute("data-variant", "default");

    await user.click(mute);

    expect(onSelectedAudioEnabledChange).toHaveBeenCalledWith(false);
  });

  it("places selected source controls side by side for URL sources", async () => {
    const user = userEvent.setup();
    const onRandomizeSelectedSource = vi.fn();
    const onSelectedFinishVideoBeforeAdvanceChange = vi.fn();
    const onSelectedRandomVideoStartChange = vi.fn();

    render(
      <WorkbenchPanelContent
        {...panelProps({
          selected: selectedSession("url"),
          onRandomizeSelectedSource,
          onSelectedFinishVideoBeforeAdvanceChange,
          onSelectedRandomVideoStartChange,
        })}
      />,
    );

    const shuffle = screen.getByRole("button", {
      name: "Shuffle selected source",
    });
    const unmute = screen.getByRole("button", {
      name: "Unmute selected source",
    });
    const finishVideo = screen.getByRole("button", {
      name: "Finish selected source video",
    });
    const randomStart = screen.getByRole("button", {
      name: "Use random seek for selected source videos",
    });
    const remove = screen.getByRole("button", { name: "Remove" });

    expect(shuffle).toHaveTextContent("Shuffle");
    expect(shuffle).not.toHaveClass("col-span-2");
    expect(finishVideo).toHaveAttribute("aria-pressed", "false");
    expect(finishVideo).toHaveAttribute("data-variant", "outline");
    expect(randomStart).toHaveTextContent("Random seek");
    expect(randomStart).toHaveAttribute("aria-pressed", "false");
    expect(randomStart).toHaveAttribute("data-variant", "outline");
    expect(unmute).not.toHaveClass("col-span-2");
    expect(finishVideo).not.toHaveClass("col-span-2");
    expect(randomStart).not.toHaveClass("col-span-2");
    expect(remove).not.toHaveClass("col-span-2");
    expect(
      shuffle.compareDocumentPosition(unmute) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      unmute.compareDocumentPosition(finishVideo) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      finishVideo.compareDocumentPosition(remove) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(shuffle);
    await user.click(finishVideo);
    await user.click(randomStart);

    expect(onRandomizeSelectedSource).toHaveBeenCalledTimes(1);
    expect(onSelectedFinishVideoBeforeAdvanceChange).toHaveBeenCalledWith(true);
    expect(onSelectedRandomVideoStartChange).toHaveBeenCalledWith(true);
  });

  it("places randomize and unmute side by side for randomizable sources", () => {
    render(
      <WorkbenchPanelContent
        {...panelProps({
          globalAudioEnabled: false,
          selected: { ...selectedSession("reddit"), isOrderRandomized: false },
        })}
      />,
    );

    const shuffle = screen.getByRole("button", {
      name: "Shuffle selected source",
    });
    const unmute = screen.getByRole("button", {
      name: "Unmute selected source",
    });
    const finishVideo = screen.getByRole("button", {
      name: "Finish selected source video",
    });
    const randomStart = screen.getByRole("button", {
      name: "Use random seek for selected source videos",
    });
    const remove = screen.getByRole("button", { name: "Remove" });

    expect(shuffle).toHaveTextContent("Shuffle");
    expect(shuffle).not.toHaveClass("col-span-2");
    expect(unmute).not.toHaveClass("col-span-2");
    expect(finishVideo).not.toHaveClass("col-span-2");
    expect(randomStart).toHaveTextContent("Random seek");
    expect(randomStart).not.toHaveClass("col-span-2");
    expect(remove).not.toHaveClass("col-span-2");
    expect(
      shuffle.compareDocumentPosition(unmute) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows normal shuffle color when random order is disabled", () => {
    render(
      <WorkbenchPanelContent
        {...panelProps({
          selected: { ...selectedSession("reddit"), isOrderRandomized: false },
        })}
      />,
    );

    const shuffle = screen.getByRole("button", {
      name: "Shuffle selected source",
    });

    expect(shuffle).toHaveAttribute("aria-pressed", "false");
    expect(shuffle).toHaveAttribute("data-variant", "outline");
  });

  it("shows normal selected unmute color when source audio is disabled", () => {
    render(
      <WorkbenchPanelContent
        {...panelProps({
          selected: { ...selectedSession("reddit"), isAudioEnabled: false },
        })}
      />,
    );

    const unmute = screen.getByRole("button", {
      name: "Unmute selected source",
    });

    expect(unmute).toHaveAttribute("aria-pressed", "false");
    expect(unmute).toHaveAttribute("data-variant", "outline");
  });

  it("lets selected unmute toggle audio on when global audio is muted", async () => {
    const user = userEvent.setup();
    const onSelectedAudioEnabledChange = vi.fn();

    render(
      <WorkbenchPanelContent
        {...panelProps({
          globalAudioEnabled: false,
          selected: selectedSession("url"),
          onSelectedAudioEnabledChange,
        })}
      />,
    );

    const unmute = screen.getByRole("button", {
      name: "Unmute selected source",
    });

    expect(unmute).toHaveAttribute("aria-pressed", "false");

    await user.click(unmute);

    expect(onSelectedAudioEnabledChange).toHaveBeenCalledWith(true);
  });

  it("shows selected source shuffle for URL sources", () => {
    render(
      <WorkbenchPanelContent
        {...panelProps({
          selected: selectedSession("url"),
        })}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Shuffle selected source" }),
    ).toBeInTheDocument();
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
    globalAudioEnabled: false,
    finishVideoBeforeAdvance: false,
    randomVideoStart: false,
    onGlobalAudioEnabledChange: vi.fn(),
    onFinishVideoBeforeAdvanceChange: vi.fn(),
    onRandomVideoStartChange: vi.fn(),
    globalOrderRandomized: true,
    onGlobalOrderRandomizedChange: vi.fn(),
    onCloneSelectedSource: vi.fn(),
    onFillSelectedSourceSpace: vi.fn(),
    onRemoveSelectedSource: vi.fn(),
    onRandomizeSelectedSource: vi.fn(),
    onSelectedAudioEnabledChange: vi.fn(),
    onSelectedFinishVideoBeforeAdvanceChange: vi.fn(),
    onSelectedRandomVideoStartChange: vi.fn(),
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
