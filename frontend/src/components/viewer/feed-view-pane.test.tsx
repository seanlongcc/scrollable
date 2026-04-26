import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { TimerState } from "@/lib/viewer/timer";
import { FeedViewPane } from "./feed-view-pane";

describe("FeedViewPane", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefetches nearby image media without rendering extra images", async () => {
    const prefetchedUrls: string[] = [];

    class MockImage {
      set src(value: string) {
        prefetchedUrls.push(value);
      }
    }

    vi.stubGlobal("Image", MockImage);

    const { container } = render(
      <FeedViewPane
        title="r/pics"
        items={[
          feedItem("active", [
            { type: "image", url: "https://cdn.test/active.jpg" },
            { type: "image", url: "https://cdn.test/gallery-next.jpg" },
          ]),
          feedItem("next", [
            { type: "image", url: "https://cdn.test/next.jpg" },
          ]),
          feedItem("video", [
            { type: "video", url: "https://cdn.test/video.mp4" },
          ]),
          feedItem("second-next", [
            { type: "image", url: "https://cdn.test/second-next.jpg" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 4 })}
        galleryIndexes={{ active: 0 }}
        onGalleryChange={vi.fn()}
        onMove={vi.fn()}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(prefetchedUrls).toEqual([
        "https://cdn.test/gallery-next.jpg",
        "https://cdn.test/next.jpg",
        "https://cdn.test/second-next.jpg",
      ]),
    );
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });
});

function feedItem(
  id: string,
  media: RuntimeFeedItem["media"],
): RuntimeFeedItem {
  return {
    id,
    source: "reddit",
    title: id,
    isNsfw: false,
    createdAt: "2026-04-24T00:00:00.000Z",
    media,
  };
}

function timerState({
  activeIndex,
  itemCount,
}: {
  activeIndex: number;
  itemCount: number;
}): TimerState {
  return {
    durationSeconds: 10,
    itemCount,
    activeIndex,
    elapsedMs: 0,
    isPaused: false,
  };
}
