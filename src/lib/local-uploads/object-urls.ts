import type { RuntimeFeedItem } from "@/lib/feed/types";

export class LocalObjectUrlRegistry {
  private urls = new Set<string>();

  add(file: File): RuntimeFeedItem {
    const url = URL.createObjectURL(file);
    this.urls.add(url);

    return {
      id: `local:${crypto.randomUUID()}`,
      source: "local",
      title: file.name,
      isNsfw: false,
      createdAt: new Date().toISOString(),
      media: [
        {
          type: file.type.startsWith("video/") ? "video" : "image",
          url,
        },
      ],
    };
  }

  revoke(url: string) {
    if (!this.urls.has(url)) return;
    URL.revokeObjectURL(url);
    this.urls.delete(url);
  }

  revokeAll() {
    for (const url of this.urls) {
      URL.revokeObjectURL(url);
    }
    this.urls.clear();
  }
}
