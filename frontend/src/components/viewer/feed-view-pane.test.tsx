import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { TimerState } from "@/lib/viewer/timer";
import { FeedViewPane } from "./feed-view-pane";

describe("FeedViewPane", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefetches and decodes nearby image media without rendering extra images", async () => {
    const prefetchedUrls: string[] = [];
    const decodedUrls: string[] = [];

    class MockImage {
      currentSrc = "";

      set src(value: string) {
        this.currentSrc = value;
        prefetchedUrls.push(value);
      }

      decode = vi.fn(async () => {
        decodedUrls.push(this.currentSrc);
      });
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
          feedItem("third-next", [
            { type: "image", url: "https://cdn.test/third-next.jpg" },
          ]),
          feedItem("fourth-next", [
            { type: "image", url: "https://cdn.test/fourth-next.jpg" },
          ]),
          feedItem("fifth-next", [
            { type: "image", url: "https://cdn.test/fifth-next.jpg" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 7 })}
        galleryIndexes={{ active: 0 }}
        onGalleryChange={vi.fn()}
        onMove={vi.fn()}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    await waitFor(() => expect(prefetchedUrls).toHaveLength(6));
    expect(prefetchedUrls).toEqual([
      "https://cdn.test/gallery-next.jpg",
      "https://cdn.test/next.jpg",
      "https://cdn.test/second-next.jpg",
      "https://cdn.test/third-next.jpg",
      "https://cdn.test/fourth-next.jpg",
      "https://cdn.test/fifth-next.jpg",
    ]);
    await waitFor(() => expect(decodedUrls).toEqual(prefetchedUrls));
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("limits nearby image prefetching on mobile-class connections", async () => {
    const prefetchedUrls: string[] = [];

    class MockImage {
      currentSrc = "";

      set src(value: string) {
        this.currentSrc = value;
        prefetchedUrls.push(value);
      }

      decode = vi.fn(async () => undefined);
    }

    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("navigator", {
      ...navigator,
      connection: { effectiveType: "3g", downlink: 1.4 },
      deviceMemory: 4,
    });

    render(
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
          feedItem("second-next", [
            { type: "image", url: "https://cdn.test/second-next.jpg" },
          ]),
          feedItem("third-next", [
            { type: "image", url: "https://cdn.test/third-next.jpg" },
          ]),
          feedItem("fourth-next", [
            { type: "image", url: "https://cdn.test/fourth-next.jpg" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 5 })}
        galleryIndexes={{ active: 0 }}
        onGalleryChange={vi.fn()}
        onMove={vi.fn()}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    await waitFor(() => expect(prefetchedUrls).toHaveLength(3));
    expect(prefetchedUrls).toEqual([
      "https://cdn.test/gallery-next.jpg",
      "https://cdn.test/next.jpg",
      "https://cdn.test/second-next.jpg",
    ]);
  });

  it("skips local image prefetching on mobile devices to avoid decoding many file blobs", async () => {
    const prefetchedUrls: string[] = [];

    class MockImage {
      set src(value: string) {
        prefetchedUrls.push(value);
      }
    }

    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("navigator", {
      ...navigator,
      deviceMemory: 4,
    });
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(pointer: coarse)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <FeedViewPane
        title="Local upload"
        items={[
          feedItem(
            "active",
            [{ type: "image", url: "blob:http://localhost/active" }],
            "local",
          ),
          feedItem(
            "next",
            [{ type: "image", url: "blob:http://localhost/next" }],
            "local",
          ),
          feedItem(
            "second-next",
            [{ type: "image", url: "blob:http://localhost/second-next" }],
            "local",
          ),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 3 })}
        galleryIndexes={{ active: 0 }}
        onGalleryChange={vi.fn()}
        onMove={vi.fn()}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByAltText("active")).toHaveAttribute(
        "src",
        "blob:http://localhost/active",
      ),
    );
    expect(prefetchedUrls).toEqual([]);
  });

  it("skips nearby image prefetching on constrained connections", async () => {
    const prefetchedUrls: string[] = [];

    class MockImage {
      set src(value: string) {
        prefetchedUrls.push(value);
      }
    }

    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("navigator", {
      ...navigator,
      connection: { saveData: true },
    });

    const { container } = render(
      <FeedViewPane
        title="r/pics"
        items={[
          feedItem("active", [
            { type: "image", url: "https://cdn.test/active.jpg" },
          ]),
          feedItem("next", [
            { type: "image", url: "https://cdn.test/next.jpg" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 2 })}
        galleryIndexes={{ active: 0 }}
        onGalleryChange={vi.fn()}
        onMove={vi.fn()}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(container.querySelectorAll("img")).toHaveLength(1),
    );
    expect(prefetchedUrls).toEqual([]);
  });

  it("exposes a select control without blocking video controls", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <FeedViewPane
        title="Video source"
        items={[
          feedItem("video", [
            { type: "video", url: "https://cdn.test/video.mp4" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 1 })}
        galleryIndexes={{}}
        onGalleryChange={vi.fn()}
        onMove={vi.fn()}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
        onSelect={onSelect}
      />,
    );

    expect(container.querySelector("video")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Select Video source" }),
    );

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("moves active feed forward and backward with vertical touch swipes", () => {
    const onMove = vi.fn();
    const { container } = render(
      <FeedViewPane
        title="r/pics"
        items={[
          feedItem("active", [
            { type: "image", url: "https://cdn.test/active.jpg" },
          ]),
          feedItem("next", [
            { type: "image", url: "https://cdn.test/next.jpg" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 2 })}
        galleryIndexes={{}}
        onGalleryChange={vi.fn()}
        onMove={onMove}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
      />,
    );
    const pane = container.querySelector("article");
    expect(pane).not.toBeNull();

    fireEvent.touchStart(pane!, {
      touches: [{ clientX: 160, clientY: 320 }],
    });
    fireEvent.touchMove(pane!, {
      touches: [{ clientX: 158, clientY: 220 }],
    });
    fireEvent.touchEnd(pane!, {
      changedTouches: [{ clientX: 158, clientY: 220 }],
    });

    expect(onMove).toHaveBeenLastCalledWith(1);

    fireEvent.touchStart(pane!, {
      touches: [{ clientX: 160, clientY: 220 }],
    });
    fireEvent.touchEnd(pane!, {
      changedTouches: [{ clientX: 162, clientY: 320 }],
    });

    expect(onMove).toHaveBeenLastCalledWith(-1);
  });

  it("tracks touch movement without preventing default passive touch events", () => {
    const onMove = vi.fn();
    const { container } = render(
      <FeedViewPane
        title="r/pics"
        items={[
          feedItem("active", [
            { type: "image", url: "https://cdn.test/active.jpg" },
          ]),
          feedItem("next", [
            { type: "image", url: "https://cdn.test/next.jpg" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 2 })}
        galleryIndexes={{}}
        onGalleryChange={vi.fn()}
        onMove={onMove}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
      />,
    );
    const pane = container.querySelector("article");
    expect(pane).not.toBeNull();

    fireEvent.touchStart(pane!, {
      touches: [{ clientX: 160, clientY: 320 }],
    });

    const touchMove = new Event("touchmove", {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(touchMove, "touches", {
      value: [{ clientX: 158, clientY: 220 }],
    });
    const preventDefault = vi.spyOn(touchMove, "preventDefault");

    fireEvent(pane!, touchMove);
    fireEvent.touchEnd(pane!, {
      changedTouches: [{ clientX: 158, clientY: 220 }],
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onMove).toHaveBeenLastCalledWith(1);
  });

  it("moves gallery media with horizontal touch swipes", () => {
    const onGalleryChange = vi.fn();
    const onMove = vi.fn();
    const { container } = render(
      <FeedViewPane
        title="r/pics"
        items={[
          feedItem("active", [
            { type: "image", url: "https://cdn.test/active.jpg" },
            { type: "image", url: "https://cdn.test/second.jpg" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 1 })}
        galleryIndexes={{ active: 0 }}
        onGalleryChange={onGalleryChange}
        onMove={onMove}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
      />,
    );
    const pane = container.querySelector("article");
    expect(pane).not.toBeNull();

    fireEvent.touchStart(pane!, {
      touches: [{ clientX: 320, clientY: 180 }],
    });
    fireEvent.touchEnd(pane!, {
      changedTouches: [{ clientX: 180, clientY: 182 }],
    });

    expect(onGalleryChange).toHaveBeenLastCalledWith("active", 1);
    expect(onMove).not.toHaveBeenCalled();

    fireEvent.touchStart(pane!, {
      touches: [{ clientX: 180, clientY: 180 }],
    });
    fireEvent.touchEnd(pane!, {
      changedTouches: [{ clientX: 320, clientY: 178 }],
    });

    expect(onGalleryChange).toHaveBeenLastCalledWith("active", -1);
  });

  it("uses the toggle-select handler when selecting a source", () => {
    const onSelect = vi.fn();
    const onToggleSelect = vi.fn();
    render(
      <FeedViewPane
        title="r/pics"
        items={[
          feedItem("active", [
            { type: "image", url: "https://cdn.test/active.jpg" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 1 })}
        galleryIndexes={{}}
        onGalleryChange={vi.fn()}
        onMove={vi.fn()}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
        onSelect={onSelect}
        onToggleSelect={onToggleSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select r/pics" }));

    expect(onToggleSelect).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("places selected source actions in the mobile rail opposite the workbench rail", () => {
    render(
      <FeedViewPane
        title="r/pics"
        items={[
          feedItem("active", [
            { type: "image", url: "https://cdn.test/active.jpg" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 1 })}
        galleryIndexes={{}}
        isFocused
        onGalleryChange={vi.fn()}
        onMove={vi.fn()}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
        onSelect={vi.fn()}
        onMaximize={vi.fn()}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const actionRail = screen
      .getByRole("button", { name: "Select r/pics" })
      .closest("[data-source-action-rail]");

    expect(actionRail).not.toBeNull();
    expect(actionRail).toHaveAttribute("data-focused", "true");
    expect(actionRail).toHaveClass(
      "max-md:fixed",
      "max-md:left-3",
      "max-md:bottom-[8.5rem]",
    );
  });

  it("shows source info without per-source playback controls", () => {
    render(
      <FeedViewPane
        title="r/pics"
        items={[
          feedItem("active", [
            { type: "image", url: "https://cdn.test/active.jpg" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 1 })}
        galleryIndexes={{}}
        forceInfoVisible
        onGalleryChange={vi.fn()}
        onMove={vi.fn()}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText("active")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Previous item for r/pics" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pause r/pics" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next item for r/pics" }),
    ).not.toBeInTheDocument();
  });

  it("keeps timer progress inset at the top and item info at the bottom in compact grids", () => {
    render(
      <FeedViewPane
        title="Local source"
        items={[
          {
            ...feedItem("active-file", [
              { type: "image", url: "https://cdn.test/active.jpg" },
            ]),
            title: "추억여행 ✨ #STAYC #스테이씨 #ISA.mp4",
          },
          feedItem("next-file", [
            { type: "image", url: "https://cdn.test/next.jpg" },
          ]),
        ]}
        timer={timerState({ activeIndex: 0, itemCount: 2 })}
        galleryIndexes={{}}
        compact
        forceInfoVisible
        onGalleryChange={vi.fn()}
        onMove={vi.fn()}
        onTogglePaused={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByTestId("feed-timer-progress")).toHaveAttribute(
      "data-placement",
      "top-inset",
    );
    expect(screen.getByTestId("feed-item-info")).toHaveAttribute(
      "data-placement",
      "bottom",
    );
    expect(
      screen.getByText("추억여행 ✨ #STAYC #스테이씨 #ISA.mp4"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Local source")).not.toBeInTheDocument();
  });
});

function feedItem(
  id: string,
  media: RuntimeFeedItem["media"],
  source: RuntimeFeedItem["source"] = "reddit",
): RuntimeFeedItem {
  return {
    id,
    source,
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
