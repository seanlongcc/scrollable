export type FeedSource = "reddit" | "local";

export type RuntimeMedia = {
  type: "image" | "video" | "audio";
  url: string;
  width?: number;
  height?: number;
  galleryIndex?: number;
  isHls?: boolean;
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
