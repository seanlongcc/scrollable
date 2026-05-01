import type { RuntimeFeedItem } from "@/lib/feed/types";

const DEFAULT_PREFETCH_NEXT_ITEM_COUNT = 6;
const MOBILE_PREFETCH_NEXT_ITEM_COUNT = 3;
const CONSERVATIVE_PREFETCH_NEXT_ITEM_COUNT = 2;
const CONSTRAINED_PREFETCH_CONNECTION_TYPES = new Set(["slow-2g", "2g"]);
const CONSERVATIVE_PREFETCH_CONNECTION_TYPES = new Set(["3g"]);

type NavigatorConnectionLike = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
};

export function getNextImagePrefetchCount() {
  if (typeof navigator === "undefined") return DEFAULT_PREFETCH_NEXT_ITEM_COUNT;

  const connection = (
    navigator as Navigator & {
      connection?: NavigatorConnectionLike;
    }
  ).connection;

  if (connection?.saveData) return 0;
  if (
    connection?.effectiveType &&
    CONSTRAINED_PREFETCH_CONNECTION_TYPES.has(connection.effectiveType)
  ) {
    return 0;
  }

  if (
    (connection?.effectiveType &&
      CONSERVATIVE_PREFETCH_CONNECTION_TYPES.has(connection.effectiveType)) ||
    (typeof connection?.downlink === "number" && connection.downlink <= 1.5) ||
    (typeof connection?.rtt === "number" && connection.rtt >= 600)
  ) {
    return CONSERVATIVE_PREFETCH_NEXT_ITEM_COUNT;
  }

  const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  if (typeof deviceMemory === "number" && deviceMemory <= 4) {
    return CONSERVATIVE_PREFETCH_NEXT_ITEM_COUNT;
  }

  if (isCoarsePointerDevice()) {
    return MOBILE_PREFETCH_NEXT_ITEM_COUNT;
  }

  return DEFAULT_PREFETCH_NEXT_ITEM_COUNT;
}

export function shouldPrefetchLocalImages() {
  if (typeof navigator === "undefined") return true;

  const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  if (typeof deviceMemory === "number" && deviceMemory <= 4) {
    return false;
  }

  return !isCoarsePointerDevice();
}

export function collectImagePrefetchUrls({
  items,
  activeIndex,
  activeGalleryIndex,
  prefetchNextItemCount,
  prefetchLocalImages,
}: {
  items: RuntimeFeedItem[];
  activeIndex: number;
  activeGalleryIndex: number;
  prefetchNextItemCount: number;
  prefetchLocalImages: boolean;
}) {
  const urls = new Set<string>();
  const activeItem = items[activeIndex];

  if (activeItem?.media.length && activeItem.media.length > 1) {
    for (const galleryIndex of [
      activeGalleryIndex - 1,
      activeGalleryIndex + 1,
    ]) {
      const media = activeItem.media[galleryIndex];
      if (
        media?.type === "image" &&
        canPrefetchImageUrl({
          source: activeItem.source,
          url: media.url,
          prefetchLocalImages,
        })
      ) {
        urls.add(media.url);
      }
    }
  }

  for (let offset = 1; offset <= prefetchNextItemCount; offset += 1) {
    const item = items[activeIndex + offset];
    const media = item?.media[0];
    if (
      item &&
      media?.type === "image" &&
      canPrefetchImageUrl({
        source: item.source,
        url: media.url,
        prefetchLocalImages,
      })
    ) {
      urls.add(media.url);
    }
  }

  return [...urls];
}

function isCoarsePointerDevice() {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  ) {
    return true;
  }

  return false;
}

function canPrefetchImageUrl({
  source,
  url,
  prefetchLocalImages,
}: {
  source: RuntimeFeedItem["source"];
  url: string;
  prefetchLocalImages: boolean;
}) {
  if (prefetchLocalImages) return true;
  return source !== "local" && !url.startsWith("blob:");
}
