import type { RuntimeFeedItem } from "@/lib/feed/types";

export function flattenRuntimeMediaItems(items: RuntimeFeedItem[]) {
  return items.flatMap((item) => {
    if (item.media.length <= 1) return [item];

    return item.media.map((media, index) => ({
      ...item,
      id: `${item.id}:media:${index}`,
      media: [media],
    }));
  });
}
