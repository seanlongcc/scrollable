import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import {
  collectImagePrefetchUrls,
  collectVideoPrefetchUrls,
  getNextImagePrefetchCount,
  getNextVideoPrefetchCount,
  prefetchImageUrl,
} from "./feed-view-pane-prefetch";

describe("feed view pane prefetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a larger default image lookahead on capable connections", () => {
    expect(getNextImagePrefetchCount()).toBe(10);
  });

  it("keeps a larger but bounded image lookahead on coarse pointer devices", () => {
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

    expect(getNextImagePrefetchCount()).toBe(5);
  });

  it("keeps a modest image lookahead on conservative connections", () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      connection: { effectiveType: "3g", downlink: 1.4 },
      deviceMemory: 4,
    });

    expect(getNextImagePrefetchCount()).toBe(3);
  });

  it("uses a small next-video lookahead for animated video sources", () => {
    expect(getNextVideoPrefetchCount()).toBe(2);
  });

  it("prefetches several active gallery pages plus upcoming feed items", () => {
    const urls = collectImagePrefetchUrls({
      items: [
        feedItem("gallery", [
          image("gallery-previous"),
          image("gallery-active"),
          image("gallery-next-1"),
          image("gallery-next-2"),
          image("gallery-next-3"),
          image("gallery-next-4"),
          image("gallery-next-5"),
        ]),
        feedItem("feed-next-1", [image("feed-next-1")]),
        feedItem("feed-next-2", [image("feed-next-2")]),
        feedItem("feed-next-3", [image("feed-next-3")]),
      ],
      activeIndex: 0,
      activeGalleryIndex: 1,
      prefetchNextItemCount: 3,
      prefetchLocalImages: true,
    });

    expect(urls).toEqual([
      "https://cdn.test/gallery-previous.jpg",
      "https://cdn.test/gallery-next-1.jpg",
      "https://cdn.test/gallery-next-2.jpg",
      "https://cdn.test/gallery-next-3.jpg",
      "https://cdn.test/gallery-next-4.jpg",
      "https://cdn.test/feed-next-1.jpg",
      "https://cdn.test/feed-next-2.jpg",
      "https://cdn.test/feed-next-3.jpg",
    ]);
  });

  it("prefetches only first video media from upcoming feed items", () => {
    const urls = collectVideoPrefetchUrls({
      items: [
        feedItem("active", [video("active")]),
        feedItem("next-video", [video("next-video")]),
        feedItem("next-image", [image("next-image")]),
        feedItem("next-gallery", [image("first"), video("second")]),
        feedItem("next-video-2", [video("next-video-2")]),
      ],
      activeIndex: 0,
      prefetchNextItemCount: 4,
    });

    expect(urls).toEqual([
      "https://media.redgifs.com/next-video.mp4",
      "https://media.redgifs.com/next-video-2.mp4",
    ]);
  });

  it("keeps a single next-video prefetch on coarse pointer devices", () => {
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

    expect(getNextVideoPrefetchCount()).toBe(1);
  });

  it("keeps image prefetch handles alive so animated GIF requests continue", () => {
    const images: FakeImage[] = [];
    vi.stubGlobal(
      "Image",
      class FakeImageConstructor extends FakeImage {
        constructor() {
          super();
          images.push(this);
        }
      },
    );
    const cache = new Map<string, HTMLImageElement>();

    expect(
      prefetchImageUrl({
        cache,
        url: "https://cdn.test/animated.gif",
      }),
    ).toBe(true);

    expect(images).toHaveLength(1);
    expect(cache.get("https://cdn.test/animated.gif")).toBe(images[0]);
    expect(images[0]?.decoding).toBe("async");
    expect(images[0]?.fetchPriority).toBe("low");
    expect(images[0]?.src).toBe("https://cdn.test/animated.gif");
    expect(images[0]?.decode).toHaveBeenCalledOnce();

    expect(
      prefetchImageUrl({
        cache,
        url: "https://cdn.test/animated.gif",
      }),
    ).toBe(false);
    expect(images).toHaveLength(1);
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

function image(id: string) {
  return { type: "image" as const, url: `https://cdn.test/${id}.jpg` };
}

function video(id: string) {
  return { type: "video" as const, url: `https://media.redgifs.com/${id}.mp4` };
}

class FakeImage {
  decoding: "async" | "auto" | "sync" = "auto";
  fetchPriority = "";
  src = "";
  decode = vi.fn(async () => undefined);
}
