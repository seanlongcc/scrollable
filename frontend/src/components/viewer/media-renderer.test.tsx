import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hlsState = vi.hoisted(() => ({
  configs: [] as unknown[],
}));

vi.mock("hls.js", () => {
  class MockHls {
    static isSupported = vi.fn(() => true);

    constructor(config?: unknown) {
      hlsState.configs.push(config);
    }

    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
  }

  return { default: MockHls };
});

import { MediaRenderer } from "./media-renderer";

describe("MediaRenderer", () => {
  beforeEach(() => {
    hlsState.configs = [];
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(video).toHaveAttribute("preload", "auto");
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

  it("reports video time before browser unload resets the element", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0",
    );
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      this.currentTime = 0;
    });
    const onVideoTimeChange = vi.fn();
    const { container, unmount } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
        onVideoTimeChange={onVideoTimeChange}
      />,
    );

    const video = container.querySelector("video");
    if (video) {
      video.currentTime = 42;
    }
    unmount();

    expect(onVideoTimeChange).toHaveBeenLastCalledWith(42);
  });

  it("adds signed HLS params to segment requests", () => {
    render(
      <MediaRenderer
        media={{
          type: "video",
          url: "https://stream.test/master.m3u8",
          isHls: true,
          hlsSegmentQuery: "__gda__=signed-token",
        }}
        title="Signed HLS"
      />,
    );

    const config = hlsState.configs.at(-1) as {
      xhrSetup?: (xhr: XMLHttpRequest, url: string) => void;
      maxBufferLength?: number;
      maxMaxBufferLength?: number;
      capLevelToPlayerSize?: boolean;
      startFragPrefetch?: boolean;
    };
    const xhr = { open: vi.fn() } as unknown as XMLHttpRequest;

    config.xhrSetup?.(xhr, "https://stream.test/segment-000000.ts");

    expect(xhr.open).toHaveBeenCalledWith(
      "GET",
      "https://stream.test/segment-000000.ts?__gda__=signed-token",
      true,
    );
    expect(config.maxBufferLength).toBeGreaterThan(30);
    expect(config.maxMaxBufferLength).toBeGreaterThan(60);
    expect(config.capLevelToPlayerSize).toBe(true);
    expect(config.startFragPrefetch).toBe(true);
  });

  it("does not load or autoplay video when playback is inactive", () => {
    const { container } = render(
      <MediaRenderer
        media={{
          type: "video",
          url: "https://stream.test/master.m3u8",
          isHls: true,
        }}
        title="Hidden video"
        shouldPlay={false}
      />,
    );

    const video = container.querySelector("video");

    expect(video?.autoplay).toBe(false);
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).not.toHaveAttribute("src");
    expect(hlsState.configs).toHaveLength(0);
  });

  it("keeps started video loaded when playback becomes inactive", () => {
    const { container, rerender } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Layer video"
      />,
    );
    const video = container.querySelector("video");

    expect(video).toHaveAttribute("src", "https://cdn.test/video.mp4");
    fireEvent.loadedMetadata(video!);

    rerender(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Layer video"
        shouldPlay={false}
      />,
    );

    expect(video).toHaveAttribute("src", "https://cdn.test/video.mp4");
  });

  it("keeps started audio loaded when playback becomes inactive", () => {
    const { container, rerender } = render(
      <MediaRenderer
        media={{ type: "audio", url: "https://cdn.test/sound.mp3" }}
        title="Layer audio"
      />,
    );
    const audio = container.querySelector("audio");

    expect(audio).toHaveAttribute("src", "https://cdn.test/sound.mp3");
    fireEvent.loadedMetadata(audio!);

    rerender(
      <MediaRenderer
        media={{ type: "audio", url: "https://cdn.test/sound.mp3" }}
        title="Layer audio"
        shouldPlay={false}
      />,
    );

    expect(audio).toHaveAttribute("src", "https://cdn.test/sound.mp3");
  });

  it("shows a load error screen when direct media is blocked", () => {
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/blocked-video.mp4" }}
        title="Blocked video"
      />,
    );

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();

    fireEvent.error(video!);

    expect(screen.getByRole("alert")).toHaveTextContent("Media failed to load");
    expect(screen.getByText(/cdn.test/)).toBeInTheDocument();
  });
});
