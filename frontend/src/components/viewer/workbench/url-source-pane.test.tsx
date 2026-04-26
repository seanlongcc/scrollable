import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UrlSourcePane } from "./url-source-pane";

describe("UrlSourcePane", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("remounts YouTube iframes from the remembered playback time without reloading on position ticks", () => {
    const resolution = youtubeResolution();
    const { container, rerender } = render(
      <UrlSourcePane
        title="YouTube video"
        resolution={resolution}
        canMountIframe
        iframePlaybackSeconds={42}
      />,
    );
    const iframe = container.querySelector("iframe");
    const initialSrc = iframe?.getAttribute("src") ?? "";

    expect(new URL(initialSrc).searchParams.get("start")).toBe("42");

    rerender(
      <UrlSourcePane
        title="YouTube video"
        resolution={resolution}
        canMountIframe
        iframePlaybackSeconds={43}
      />,
    );

    expect(container.querySelector("iframe")).toHaveAttribute(
      "src",
      initialSrc,
    );
  });

  it("applies YouTube playback time when it arrives after iframe mount", async () => {
    const resolution = youtubeResolution();
    const { container, rerender } = render(
      <UrlSourcePane
        title="YouTube video"
        resolution={resolution}
        canMountIframe
        iframePlaybackSeconds={0}
      />,
    );

    expect(
      new URL(
        container.querySelector("iframe")?.getAttribute("src") ?? "",
      ).searchParams.get("start"),
    ).toBeNull();

    rerender(
      <UrlSourcePane
        title="YouTube video"
        resolution={resolution}
        canMountIframe
        iframePlaybackSeconds={42}
      />,
    );
    await waitFor(() => {
      const currentSrc = container.querySelector("iframe")?.getAttribute("src");
      expect(new URL(currentSrc ?? "").searchParams.get("start")).toBe("42");
    });
    const stableSrc = container.querySelector("iframe")?.getAttribute("src");

    rerender(
      <UrlSourcePane
        title="YouTube video"
        resolution={resolution}
        canMountIframe
        iframePlaybackSeconds={43}
      />,
    );

    expect(container.querySelector("iframe")).toHaveAttribute("src", stableSrc);
  });

  it("reports approximate YouTube playback time before unmount", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const onIframePlaybackTimeChange = vi.fn();
    const { unmount } = render(
      <UrlSourcePane
        title="YouTube video"
        resolution={youtubeResolution()}
        canMountIframe
        iframePlaybackSeconds={12}
        onIframePlaybackTimeChange={onIframePlaybackTimeChange}
      />,
    );

    vi.advanceTimersByTime(3000);
    unmount();

    expect(onIframePlaybackTimeChange).toHaveBeenLastCalledWith(15);
  });
});

function youtubeResolution() {
  return {
    status: "resolved" as const,
    mode: "provider" as const,
    hint: "provider:youtube" as const,
    provider: "youtube",
    title: "YouTube video",
    externalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    iframeUrl:
      "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&playsinline=1",
  };
}
