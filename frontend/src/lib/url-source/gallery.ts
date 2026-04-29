import type { RuntimeFeedItem } from "@/lib/feed/types";
import { adapterForUrl } from "./gallery-adapters";
import type {
  GalleryExtraction,
  GalleryResolverOptions,
} from "./gallery-types";
import {
  hashValue,
  isHttpUrl,
  safeUrl,
  titleFromUrl,
  unique,
} from "./gallery-utils";

export type { GalleryFetchLike } from "./gallery-types";

const DEFAULT_MAX_GALLERY_ITEMS = 100;

export async function extractGalleryRuntimeItems(
  value: string,
  options: GalleryResolverOptions = {},
): Promise<RuntimeFeedItem[]> {
  const url = safeUrl(value);
  if (!url) return [];

  const adapter = adapterForUrl(url);
  if (!adapter) return [];

  const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetcher) return [];

  try {
    const extraction = await adapter(url, {
      fetcher,
      maxItems: options.maxItems ?? DEFAULT_MAX_GALLERY_ITEMS,
      nhentaiApiKey: options.nhentaiApiKey ?? process.env.NHENTAI_API_KEY,
    });
    return galleryItemsFromExtraction(value, extraction, {
      now: options.now,
      maxItems: options.maxItems ?? DEFAULT_MAX_GALLERY_ITEMS,
    });
  } catch {
    return [];
  }
}

function galleryItemsFromExtraction(
  sourceUrl: string,
  extraction: GalleryExtraction | null,
  options: { now?: () => string; maxItems: number },
): RuntimeFeedItem[] {
  if (!extraction?.imageUrls.length) return [];

  const title = extraction.title ?? titleFromUrl(sourceUrl);
  return unique(extraction.imageUrls)
    .filter(isHttpUrl)
    .slice(0, options.maxItems)
    .map((url, index) => ({
      id: `url:gallery:${hashValue(`${sourceUrl}:${index}:${url}`)}`,
      source: "url" as const,
      title,
      isNsfw: true,
      createdAt: options.now?.() ?? new Date().toISOString(),
      media: [{ type: "image" as const, url }],
    }));
}
