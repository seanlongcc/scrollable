import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTimerState } from "@/lib/viewer/timer";
import { FocusLayout } from "./focus-layout";
import type { FeedSession } from "./types";

describe("FocusLayout", () => {
  it("keeps satellite videos playback-active and exposes a focus overlay", () => {
    const onFocus = vi.fn();
    const focused = session({
      id: "main",
      title: "Main image",
      media: [{ type: "image", url: "https://cdn.test/main.jpg" }],
    });
    const satellite = session({
      id: "satellite-video",
      title: "Satellite video",
      media: [{ type: "video", url: "https://cdn.test/video.mp4" }],
    });

    const { container } = render(
      <FocusLayout
        focused={focused}
        sessions={[focused, satellite]}
        galleryIndexes={{}}
        videoPositions={{}}
        hideUi={false}
        showInfo={false}
        onRestore={vi.fn()}
        onFocus={onFocus}
        onGalleryChange={vi.fn()}
        onVideoPositionChange={vi.fn()}
        onMove={vi.fn()}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
        onTimerModeChange={vi.fn()}
        onTimerSecondsChange={vi.fn()}
        onLocalFilesSelected={vi.fn()}
        onEditSource={vi.fn()}
      />,
    );

    const video = container.querySelector<HTMLVideoElement>(
      "video[aria-label='Satellite video']",
    );
    expect(video).toHaveAttribute("preload", "auto");
    expect(video?.autoplay).toBe(true);
    expect(
      screen.getByTestId("satellite-pane-satellite-video").tagName,
    ).not.toBe("BUTTON");
    expect(
      screen.getByRole("button", { name: "Exit satellite" }).closest("aside"),
    ).toHaveClass("md:gap-2", "md:p-2");

    fireEvent.click(
      screen.getByRole("button", { name: "Focus Satellite video" }),
    );

    expect(onFocus).toHaveBeenCalledWith("satellite-video");
  });
});

function session({
  id,
  title,
  media,
}: {
  id: string;
  title: string;
  media: FeedSession["items"][number]["media"];
}): FeedSession {
  return {
    id,
    title,
    layerId: "layer-1",
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
        createdAt: "2026-04-26T00:00:00.000Z",
        media,
      },
    ],
    sourceConfig: {
      kind: "url",
      url: `https://example.test/${id}`,
    },
  };
}
