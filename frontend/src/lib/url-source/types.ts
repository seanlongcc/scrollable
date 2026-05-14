import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { VideoTimeRange } from "@/lib/viewer/video-time-range";

export type UrlResolverHint =
  | "direct-media"
  | `provider:${string}`
  | "metadata"
  | "iframe";

export type UrlSourceConfig = {
  kind: "url";
  url: string;
  urls?: string[];
  urlRows?: UrlSourceRow[];
  title?: string;
  resolverHint?: UrlResolverHint;
};

export type UrlSourceRow = {
  id: string;
  url: string;
  videoTimeRange?: VideoTimeRange;
};

export type UrlMetadata = {
  title?: string;
  description?: string;
  siteName?: string;
  thumbnailUrl?: string;
};

export type UrlResolvedRuntimeResolution =
  | {
      status: "resolved";
      mode: "direct-media";
      hint: "direct-media";
      title: string;
      externalUrl: string;
      items: RuntimeFeedItem[];
    }
  | {
      status: "resolved";
      mode: "provider";
      hint: `provider:${string}`;
      provider: string;
      title: string;
      externalUrl: string;
      items?: RuntimeFeedItem[];
      iframeUrl?: string;
      metadata?: UrlMetadata;
    }
  | {
      status: "resolved";
      mode: "metadata";
      hint: "metadata";
      title: string;
      externalUrl: string;
      metadata: UrlMetadata;
    }
  | {
      status: "resolved";
      mode: "iframe";
      hint: "iframe";
      title: string;
      externalUrl: string;
      iframeUrl: string;
    };

export type UrlRuntimeResolution =
  | UrlResolvedRuntimeResolution
  | {
      status: "blocked";
      title: string;
      externalUrl: string;
      reason: "url_source_frame_blocked" | "url_source_iframe_limit";
    }
  | {
      status: "unsupported";
      title: string;
      externalUrl: string;
      reason: "url_source_unsupported";
    };

export function isUrlResolvedResolution(
  resolution: UrlRuntimeResolution,
): resolution is UrlResolvedRuntimeResolution {
  return resolution.status === "resolved";
}
