import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MediaRenderer } from "./media-renderer";

describe("MediaRenderer", () => {
  it("autoplays videos muted and inline", () => {
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
      />,
    );

    const video = container.querySelector("video");

    expect(video?.autoplay).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video).toHaveAttribute("playsinline");
  });

  it("restores and reports video playback position", () => {
    const onVideoTimeChange = vi.fn();
    const { container, unmount } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
        initialVideoTime={7}
        onVideoTimeChange={onVideoTimeChange}
      />,
    );

    const video = container.querySelector("video");
    expect(video?.currentTime).toBe(7);

    if (video) {
      video.currentTime = 11;
    }
    unmount();

    expect(onVideoTimeChange).toHaveBeenLastCalledWith(11);
  });
});
