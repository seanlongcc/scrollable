import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { VideoTimeRange } from "@/lib/viewer/video-time-range";

function mediaTypeForFile(file: File) {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

export class LocalObjectUrlRegistry {
  private urls = new Set<string>();

  add(file: File, videoTimeRange?: VideoTimeRange): RuntimeFeedItem {
    const url = URL.createObjectURL(file);
    this.urls.add(url);
    const mediaType = mediaTypeForFile(file);

    return {
      id: `local:${crypto.randomUUID()}`,
      source: "local",
      title: file.name,
      isNsfw: false,
      createdAt: new Date().toISOString(),
      media: [
        {
          type: mediaType,
          url,
          ...(mediaType === "video" && videoTimeRange
            ? { videoTimeRange }
            : {}),
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
