import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hlsState = vi.hoisted(() => ({
  moduleLoads: 0,
  configs: [] as unknown[],
}));

vi.mock("hls.js", () => {
  hlsState.moduleLoads += 1;

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

import {
  MediaRenderer,
  canPrefetchReferrerlessBlobPlayback,
  prefetchReferrerlessBlobPlayback,
} from "./media-renderer";

describe("MediaRenderer", () => {
  beforeEach(() => {
    hlsState.configs = [];
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not import hls.js for native video playback", () => {
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
      />,
    );

    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      "https://cdn.test/video.mp4",
    );
    expect(hlsState.moduleLoads).toBe(0);
  });

  it("autoplays videos muted by default and inline", () => {
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
      />,
    );

    const video = container.querySelector("video");

    expect(video?.autoplay).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video?.defaultMuted).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("webkit-playsinline");
    expect(video).toHaveAttribute("preload", "auto");
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("loads Redgifs videos through a no-referrer object URL", async () => {
    const videoBlob = new Blob(["video"], { type: "video/mp4" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => videoBlob,
    });
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:redgifs-video");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);

    const { container, unmount } = render(
      <MediaRenderer
        media={{
          type: "video",
          url: "https://media.redgifs.com/EnergeticFemaleTuna.mp4",
        }}
        title="Runtime video"
      />,
    );

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();

    await waitFor(() =>
      expect(video).toHaveAttribute("src", "blob:redgifs-video"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://media.redgifs.com/EnergeticFemaleTuna.mp4",
      expect.objectContaining({
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(createObjectUrl).toHaveBeenCalledWith(videoBlob);

    unmount();

    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:redgifs-video");
  });

  it("reuses prefetched Redgifs object URLs without another fetch", async () => {
    const url = "https://media.redgifs.com/EnergeticFemaleTuna.mp4";
    const videoBlob = new Blob(["video"], { type: "video/mp4" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => videoBlob,
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:redgifs-prefetch");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);

    expect(canPrefetchReferrerlessBlobPlayback(url)).toBe(true);
    await expect(prefetchReferrerlessBlobPlayback(url)).resolves.toBe(
      "blob:redgifs-prefetch",
    );

    const { container } = render(
      <MediaRenderer
        media={{
          type: "video",
          url,
        }}
        title="Runtime video"
      />,
    );

    await waitFor(() =>
      expect(container.querySelector("video")).toHaveAttribute(
        "src",
        "blob:redgifs-prefetch",
      ),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("prioritizes active image loading", () => {
    const { container } = render(
      <MediaRenderer
        media={{ type: "image", url: "https://cdn.test/animated.gif" }}
        title="Runtime GIF"
      />,
    );

    const image = container.querySelector("img");

    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
  });

  it("unmutes video when audio is enabled", () => {
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
        audioEnabled
      />,
    );

    const video = container.querySelector("video");

    expect(video?.muted).toBe(false);
    expect(video?.defaultMuted).toBe(false);
  });

  it("mutes video when audio is disabled", () => {
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
        audioEnabled={false}
      />,
    );

    const video = container.querySelector("video");

    expect(video?.muted).toBe(true);
    expect(video?.defaultMuted).toBe(true);
  });

  it("disables video looping when finish-video advancement is enabled", () => {
    const onVideoEnded = vi.fn();
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
        finishVideoBeforeAdvance
        onVideoEnded={onVideoEnded}
      />,
    );

    const video = container.querySelector("video");
    expect(video?.loop).toBe(false);

    fireEvent.ended(video!);

    expect(onVideoEnded).toHaveBeenCalledOnce();
  });

  it("retries video playback when mobile browsers finish loading media", () => {
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
      />,
    );

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();

    vi.mocked(HTMLMediaElement.prototype.play).mockClear();
    fireEvent.loadedMetadata(video!);
    fireEvent.loadedData(video!);
    fireEvent.canPlay(video!);

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(3);
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

    expect(onVideoTimeChange).toHaveBeenLastCalledWith(11, undefined);
  });

  it("reports loaded video duration with playback position", () => {
    const onVideoTimeChange = vi.fn();
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
        onVideoTimeChange={onVideoTimeChange}
      />,
    );

    const video = container.querySelector("video");
    Object.defineProperty(video, "duration", {
      configurable: true,
      value: 360,
    });

    fireEvent.loadedMetadata(video!);

    expect(onVideoTimeChange).toHaveBeenLastCalledWith(0, 360);
  });

  it("starts videos from a random section instead of restoring saved position", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
        initialVideoTime={7}
        randomVideoStart
      />,
    );

    const video = container.querySelector("video");
    Object.defineProperty(video, "duration", {
      configurable: true,
      value: 101,
    });

    fireEvent.loadedMetadata(video!);

    expect(video?.currentTime).toBe(42);
  });

  it("starts and loops native video inside its selected time range", () => {
    const { container } = render(
      <MediaRenderer
        media={{
          type: "video",
          url: "https://cdn.test/video.mp4",
          videoTimeRange: { startSeconds: 10, endSeconds: 12 },
        }}
        title="Runtime video"
      />,
    );

    const video = container.querySelector("video");
    fireEvent.loadedMetadata(video!);

    expect(video?.currentTime).toBe(10);

    video!.currentTime = 12;
    fireEvent.timeUpdate(video!);

    expect(video?.currentTime).toBe(10);
  });

  it("falls back to the natural start when selected start exceeds video duration", () => {
    const { container } = render(
      <MediaRenderer
        media={{
          type: "video",
          url: "https://cdn.test/video.mp4",
          videoTimeRange: { startSeconds: 120 },
        }}
        title="Runtime video"
      />,
    );

    const video = container.querySelector("video");
    Object.defineProperty(video, "duration", {
      configurable: true,
      value: 30,
    });

    fireEvent.loadedMetadata(video!);

    expect(video?.currentTime).toBe(0);
  });

  it("does not pin playback to zero after an impossible selected start is ignored", () => {
    const { container } = render(
      <MediaRenderer
        media={{
          type: "video",
          url: "https://cdn.test/video.mp4",
          videoTimeRange: { startSeconds: 120 },
        }}
        title="Runtime video"
      />,
    );

    const video = container.querySelector("video");
    Object.defineProperty(video, "duration", {
      configurable: true,
      value: 30,
    });
    fireEvent.loadedMetadata(video!);

    video!.currentTime = 1;
    fireEvent.timeUpdate(video!);

    expect(video?.currentTime).toBe(1);
  });

  it("loops at the natural end when selected range end exceeds video duration", () => {
    const onVideoEnded = vi.fn();
    const { container } = render(
      <MediaRenderer
        media={{
          type: "video",
          url: "https://cdn.test/video.mp4",
          videoTimeRange: { startSeconds: 10, endSeconds: 120 },
        }}
        title="Runtime video"
        onVideoEnded={onVideoEnded}
      />,
    );

    const video = container.querySelector("video");
    Object.defineProperty(video, "duration", {
      configurable: true,
      value: 30,
    });
    fireEvent.loadedMetadata(video!);
    video!.currentTime = 30;
    fireEvent.ended(video!);

    expect(video?.currentTime).toBe(10);
    expect(onVideoEnded).not.toHaveBeenCalled();
  });

  it("treats the selected range end as ended when finish-video advancement is enabled", () => {
    const onVideoEnded = vi.fn();
    const { container } = render(
      <MediaRenderer
        media={{
          type: "video",
          url: "https://cdn.test/video.mp4",
          videoTimeRange: { startSeconds: 10, endSeconds: 12 },
        }}
        title="Runtime video"
        finishVideoBeforeAdvance
        onVideoEnded={onVideoEnded}
      />,
    );

    const video = container.querySelector("video");
    video!.currentTime = 12;
    fireEvent.timeUpdate(video!);

    expect(onVideoEnded).toHaveBeenCalledOnce();
  });

  it("uses saved video position when random start is disabled", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
        initialVideoTime={7}
        randomVideoStart={false}
      />,
    );

    const video = container.querySelector("video");
    Object.defineProperty(video, "duration", {
      configurable: true,
      value: 101,
    });
    fireEvent.loadedMetadata(video!);

    expect(video?.currentTime).toBe(7);
  });

  it("does not seek again when live playback time updates parent state", () => {
    const media = { type: "video" as const, url: "https://cdn.test/video.mp4" };
    const { container, rerender } = render(
      <MediaRenderer
        media={media}
        title="Runtime video"
        initialVideoTime={7}
        onVideoTimeChange={vi.fn()}
      />,
    );

    const video = container.querySelector("video");
    expect(video?.currentTime).toBe(7);

    if (video) {
      video.currentTime = 7.25;
    }

    rerender(
      <MediaRenderer
        media={media}
        title="Runtime video"
        initialVideoTime={11}
        onVideoTimeChange={vi.fn()}
      />,
    );

    expect(video?.currentTime).toBe(7.25);
  });

  it("reports video time at whole-second boundaries during playback", () => {
    const onVideoTimeChange = vi.fn();
    const { container } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Runtime video"
        onVideoTimeChange={onVideoTimeChange}
      />,
    );

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();

    video!.currentTime = 3.1;
    fireEvent.timeUpdate(video!);
    video!.currentTime = 3.8;
    fireEvent.timeUpdate(video!);
    video!.currentTime = 4;
    fireEvent.timeUpdate(video!);

    expect(onVideoTimeChange).toHaveBeenCalledTimes(2);
    expect(onVideoTimeChange).toHaveBeenNthCalledWith(1, 3, undefined);
    expect(onVideoTimeChange).toHaveBeenNthCalledWith(2, 4, undefined);
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

    expect(onVideoTimeChange).toHaveBeenLastCalledWith(42, undefined);
  });

  it("restores and reports audio playback position", () => {
    const onVideoTimeChange = vi.fn();
    const { container, unmount } = render(
      <MediaRenderer
        media={{ type: "audio", url: "https://cdn.test/sound.mp3" }}
        title="Runtime audio"
        initialVideoTime={7}
        onVideoTimeChange={onVideoTimeChange}
      />,
    );

    const audio = container.querySelector("audio");
    expect(audio?.currentTime).toBe(7);

    if (audio) {
      audio.currentTime = 11;
    }
    unmount();

    expect(onVideoTimeChange).toHaveBeenLastCalledWith(11, undefined);
  });

  it("adds signed HLS params to segment requests", async () => {
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

    await vi.waitFor(() => expect(hlsState.configs).toHaveLength(1));

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

  it("pauses and resumes started video when playback activity changes", () => {
    const { container, rerender } = render(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Layer video"
      />,
    );
    const video = container.querySelector("video");
    fireEvent.loadedMetadata(video!);
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear();

    rerender(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Layer video"
        shouldPlay={false}
      />,
    );

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();

    rerender(
      <MediaRenderer
        media={{ type: "video", url: "https://cdn.test/video.mp4" }}
        title="Layer video"
      />,
    );

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
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

  it("pauses and resumes started audio when playback activity changes", () => {
    const { container, rerender } = render(
      <MediaRenderer
        media={{ type: "audio", url: "https://cdn.test/sound.mp3" }}
        title="Layer audio"
      />,
    );
    const audio = container.querySelector("audio");
    fireEvent.loadedMetadata(audio!);
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear();

    rerender(
      <MediaRenderer
        media={{ type: "audio", url: "https://cdn.test/sound.mp3" }}
        title="Layer audio"
        shouldPlay={false}
      />,
    );

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();

    rerender(
      <MediaRenderer
        media={{ type: "audio", url: "https://cdn.test/sound.mp3" }}
        title="Layer audio"
      />,
    );

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
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
