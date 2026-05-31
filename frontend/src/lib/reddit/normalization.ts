import type { RuntimeFeedItem, RuntimeMedia } from "@/lib/feed/types";

type RedditPost = {
  id?: string;
  name?: string;
  title?: string;
  subreddit?: string;
  permalink?: string;
  author?: string;
  created_utc?: number;
  over_18?: boolean;
  stickied?: boolean;
  post_hint?: string;
  url?: string;
  url_overridden_by_dest?: string;
  is_video?: boolean;
  is_gallery?: boolean;
  gallery_data?: { items?: Array<{ media_id?: string; id?: number }> };
  media_metadata?: Record<
    string,
    {
      status?: string;
      e?: string;
      m?: string;
      s?: { u?: string; gif?: string; mp4?: string; x?: number; y?: number };
    }
  >;
  secure_media?: {
    reddit_video?: {
      hls_url?: string;
      fallback_url?: string;
      width?: number;
      height?: number;
    };
  };
  preview?: {
    reddit_video_preview?: {
      hls_url?: string;
      fallback_url?: string;
      width?: number;
      height?: number;
    };
  };
};

type RedditListing = {
  data?: {
    children?: Array<{ data?: RedditPost }>;
  };
};

export type NormalizeRedditListingOptions = {
  subreddit: string;
  skip?: number;
  limit?: number;
  allowNsfw?: boolean;
};

export type NormalizedRedditListing = {
  items: RuntimeFeedItem[];
  unsupportedIds: string[];
};

export function normalizeRedditListing(
  listing: RedditListing,
  options: NormalizeRedditListingOptions,
): NormalizedRedditListing {
  const skip = options.skip ?? 0;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const children = listing.data?.children ?? [];
  const posts = children
    .map((child) => child.data)
    .filter((post): post is RedditPost => Boolean(post))
    .filter((post) => !post.stickied)
    .filter((post) => options.allowNsfw !== false || !post.over_18)
    .slice(skip);

  const unsupportedIds: string[] = [];
  const items: RuntimeFeedItem[] = [];

  for (const post of posts) {
    if (items.length >= limit) break;

    const media = extractMedia(post);
    if (media.length === 0) {
      if (post.id) unsupportedIds.push(post.id);
      continue;
    }

    items.push({
      id: `reddit:${post.id ?? post.name ?? crypto.randomUUID()}`,
      source: "reddit",
      title: post.title ?? "Untitled Reddit post",
      permalink: post.permalink
        ? `https://www.reddit.com${post.permalink}`
        : undefined,
      author: post.author,
      subreddit: post.subreddit ?? options.subreddit,
      isNsfw: Boolean(post.over_18),
      createdAt: post.created_utc
        ? new Date(post.created_utc * 1000).toISOString()
        : new Date().toISOString(),
      media,
    });
  }

  return { items, unsupportedIds };
}

function extractMedia(post: RedditPost): RuntimeMedia[] {
  if (post.is_gallery) {
    return extractGalleryMedia(post);
  }

  const video =
    post.secure_media?.reddit_video ?? post.preview?.reddit_video_preview;
  if (video?.hls_url || video?.fallback_url) {
    const url = decodeRedditUrl(video.hls_url ?? video.fallback_url ?? "");

    return [
      {
        type: "video",
        url,
        width: video.width,
        height: video.height,
        isHls: url.includes(".m3u8"),
      },
    ];
  }

  const imageUrl = post.url_overridden_by_dest ?? post.url;
  if (post.post_hint === "image" && imageUrl) {
    return [{ type: "image", url: decodeRedditUrl(imageUrl) }];
  }

  return [];
}

function extractGalleryMedia(post: RedditPost): RuntimeMedia[] {
  const items = post.gallery_data?.items ?? [];

  return items.flatMap((item, index) => {
    const mediaId = item.media_id;
    const metadata = mediaId ? post.media_metadata?.[mediaId] : undefined;
    const url =
      metadata?.s?.u ?? metadata?.s?.gif ?? metadata?.s?.mp4 ?? undefined;

    if (!metadata || metadata.status !== "valid" || !url) {
      return [];
    }

    const type = metadata.m?.startsWith("video/") ? "video" : "image";
    const decodedUrl = decodeRedditUrl(url);

    return [
      {
        type,
        url: type === "image" ? redditImageUrl(decodedUrl) : decodedUrl,
        width: metadata.s?.x,
        height: metadata.s?.y,
        galleryIndex: index,
      } satisfies RuntimeMedia,
    ];
  });
}

function decodeRedditUrl(url: string) {
  return url.replaceAll("&amp;", "&");
}

function redditImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "preview.redd.it") return url;

    const mediaPath = parsed.pathname.replace(/^\/+/, "");
    return mediaPath ? `https://i.redd.it/${mediaPath}` : url;
  } catch {
    return url;
  }
}
