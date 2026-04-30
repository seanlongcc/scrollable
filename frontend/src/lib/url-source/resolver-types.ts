import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { UrlRuntimeResolution, UrlResolverHint } from "./types";

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type UrlResolverOptions = {
  fetch?: FetchLike;
  redditResolver?: (url: string) => Promise<RuntimeFeedItem[]>;
  galleryResolver?: (url: string) => Promise<RuntimeFeedItem[]>;
  ytDlpResolver?: (url: string) => Promise<RuntimeFeedItem[]>;
  allowIframeFallback?: boolean;
  now?: () => string;
};

export type ResolvedUrlSource = {
  resolution: UrlRuntimeResolution;
  nextResolverHint?: UrlResolverHint;
};

export type ResolverName = "direct-media" | "provider" | "metadata" | "iframe";
