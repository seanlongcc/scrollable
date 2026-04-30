import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UrlSourcePane } from "./url-source-pane";

describe("UrlSourcePane", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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

  it("keeps YouTube iframe src stable when playback time arrives after mount", () => {
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
    const initialSrc = container.querySelector("iframe")?.getAttribute("src");

    rerender(
      <UrlSourcePane
        title="YouTube video"
        resolution={resolution}
        canMountIframe
        iframePlaybackSeconds={42}
      />,
    );

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

  it("seeks YouTube player when playback time arrives after iframe mount", async () => {
    const player = youtubePlayer();
    const playerConstructor = vi.fn(function (_element, options) {
      queueMicrotask(() => options.events?.onReady?.({ target: player }));
      return player;
    });
    vi.stubGlobal("YT", { Player: playerConstructor });
    const resolution = youtubeResolution();
    const { rerender } = render(
      <UrlSourcePane
        title="YouTube video"
        resolution={resolution}
        canMountIframe
        iframePlaybackSeconds={0}
      />,
    );

    await waitFor(() => expect(playerConstructor).toHaveBeenCalled());

    rerender(
      <UrlSourcePane
        title="YouTube video"
        resolution={resolution}
        canMountIframe
        iframePlaybackSeconds={42}
      />,
    );

    await waitFor(() => {
      expect(player.seekTo).toHaveBeenCalledWith(42, true);
    });
    expect(player.playVideo).toHaveBeenCalled();
  });

  it("reports YouTube player current time before unmount", async () => {
    const player = youtubePlayer({ currentTime: 55 });
    const playerConstructor = vi.fn(function (_element, options) {
      queueMicrotask(() => options.events?.onReady?.({ target: player }));
      return player;
    });
    vi.stubGlobal("YT", { Player: playerConstructor });
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

    await waitFor(() => expect(playerConstructor).toHaveBeenCalled());
    unmount();

    expect(onIframePlaybackTimeChange).toHaveBeenLastCalledWith(55);
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

  it("exposes a select control for mounted iframes", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <UrlSourcePane
        title="YouTube video"
        resolution={youtubeResolution()}
        canMountIframe
        onSelect={onSelect}
      />,
    );

    expect(container.querySelector("iframe")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Select YouTube video" }),
    );

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("uses the toggle-select handler when selecting a source", () => {
    const onSelect = vi.fn();
    const onToggleSelect = vi.fn();
    render(
      <UrlSourcePane
        title="YouTube video"
        resolution={youtubeResolution()}
        canMountIframe
        onSelect={onSelect}
        onToggleSelect={onToggleSelect}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Select YouTube video" }),
    );

    expect(onToggleSelect).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps action chrome visible when selected", () => {
    render(
      <UrlSourcePane
        title="Long URL source"
        resolution={{
          status: "unsupported",
          title: "Long URL source",
          externalUrl: "https://example.test/source",
          reason: "url_source_unsupported",
        }}
        isFocused
        canMountIframe
        onSelect={vi.fn()}
        onMaximize={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const selectButton = screen.getByRole("button", {
      name: "Select Long URL source",
    });

    expect(selectButton.parentElement).not.toHaveClass("opacity-0");
  });

  it("places selected URL source actions in the mobile rail opposite the workbench rail", () => {
    render(
      <UrlSourcePane
        title="Long URL source"
        resolution={{
          status: "unsupported",
          title: "Long URL source",
          externalUrl: "https://example.test/source",
          reason: "url_source_unsupported",
        }}
        isFocused
        canMountIframe
        onSelect={vi.fn()}
        onMaximize={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const actionRail = screen
      .getByRole("button", { name: "Select Long URL source" })
      .closest("[data-source-action-rail]");

    expect(actionRail).not.toBeNull();
    expect(actionRail).toHaveAttribute("data-focused", "true");
    expect(actionRail).toHaveClass(
      "max-md:fixed",
      "max-md:left-3",
      "max-md:bottom-[8.5rem]",
    );
  });
});

function youtubePlayer({ currentTime = 0 } = {}) {
  return {
    destroy: vi.fn(),
    getCurrentTime: vi.fn(() => currentTime),
    mute: vi.fn(),
    playVideo: vi.fn(),
    seekTo: vi.fn(),
  };
}

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
