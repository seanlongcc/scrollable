import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import {
  collectImagePrefetchUrls,
  getNextImagePrefetchCount,
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
