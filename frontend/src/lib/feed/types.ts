import type { VideoTimeRange } from "@/lib/viewer/video-time-range";

export type FeedSource = "reddit" | "local" | "url";

export type RuntimeMedia = {
  type: "image" | "video" | "audio";
  url: string;
  width?: number;
  height?: number;
  galleryIndex?: number;
  isHls?: boolean;
  hlsSegmentQuery?: string;
  videoTimeRange?: VideoTimeRange;
};

export type RuntimeFeedItem = {
  id: string;
  source: FeedSource;
  title: string;
  permalink?: string;
  author?: string;
  subreddit?: string;
  isNsfw: boolean;
  createdAt: string;
  media: RuntimeMedia[];
};
