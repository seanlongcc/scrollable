import { fetchRedditRuntimePostLinks } from "@/lib/reddit/client";
import type {
  UrlResolvedRuntimeResolution,
  UrlRuntimeResolution,
  UrlSourceConfig,
} from "./types";
import { extractGalleryRuntimeItems } from "./gallery";
import { extractYtDlpRuntimeResolution } from "./ytdlp";
import type { UrlResolverOptions } from "./resolver-types";
import { flattenRuntimeMediaItems } from "./resolver-runtime-items";
import {
  isGalleryProviderUrl,
  isHitomiGalleryUrl,
  isRedditUrl,
  isTikTokUrl,
  isYoutubeUrl,
} from "./resolver-routing";
import { titleFromUrl } from "./resolver-title";
import { youtubeEmbedUrl } from "./youtube-embed";

export async function resolveProvider(
  source: UrlSourceConfig,
  options: UrlResolverOptions,
): Promise<UrlRuntimeResolution | null> {
  if (isYoutubeUrl(source.url)) {
    const embedUrl = youtubeEmbedUrl(source.url);
    if (!embedUrl) return null;

    return {
      status: "resolved",
      mode: "provider",
      hint: "provider:youtube",
      provider: "youtube",
      title: source.title ?? "YouTube video",
      externalUrl: source.url,
      iframeUrl: embedUrl,
    };
  }

  if (isRedditUrl(source.url)) {
    const redditResolver =
      options.redditResolver ??
      (async (url: string) => {
        const result = await fetchRedditRuntimePostLinks({
          urls: url,
          allowNsfw: true,
        });
        return result.items;
      });

    try {
      const items = flattenRuntimeMediaItems(await redditResolver(source.url));

      if (items.length) {
        const title =
          source.title ??
          (items.find((item) => item.subreddit)?.subreddit
            ? `r/${items.find((item) => item.subreddit)?.subreddit}`
            : items[0]?.title) ??
          "Reddit URL";

        return {
          status: "resolved",
          mode: "provider",
          hint: "provider:reddit",
          provider: "reddit",
          title,
          externalUrl: source.url,
          items,
        };
      }
    } catch {
      // Reddit posts can wrap externally hosted media. Let yt-dlp try next.
    }
  }

  const hitomi = resolveHitomiProvider(source);
  if (hitomi) return hitomi;

  const gallery = await resolveGalleryProvider(source, options);
  if (gallery) return gallery;
  if (isGalleryProviderUrl(source.url)) {
    return {
      status: "unsupported",
      title: source.title ?? titleFromUrl(source.url) ?? "Gallery URL",
      externalUrl: source.url,
      reason: "url_source_unsupported",
    };
  }

  if (isTikTokUrl(source.url)) return resolveTikTokEmbedProvider(source);

  const ytDlp = await resolveYtDlpProvider(source, options);
  if (ytDlp) return ytDlp;

  return resolveSocialEmbed(source);
}

async function resolveGalleryProvider(
  source: UrlSourceConfig,
  options: UrlResolverOptions,
): Promise<UrlResolvedRuntimeResolution | null> {
  try {
    const resolver =
      options.galleryResolver ??
      ((url: string) =>
        extractGalleryRuntimeItems(url, {
          ...(options.fetch ? { fetch: options.fetch } : {}),
          ...(options.now ? { now: options.now } : {}),
        }));
    const items = flattenRuntimeMediaItems(await resolver(source.url));

    if (!items.length) return null;

    return {
      status: "resolved",
      mode: "provider",
      hint: "provider:gallery",
      provider: "gallery",
      title: source.title ?? items[0]?.title ?? "Gallery URL",
      externalUrl: source.url,
      items,
    };
  } catch {
    return null;
  }
}

function resolveHitomiProvider(
  source: UrlSourceConfig,
): UrlResolvedRuntimeResolution | null {
  if (!isHitomiGalleryUrl(source.url)) return null;

  return {
    status: "resolved",
    mode: "provider",
    hint: "provider:hitomi",
    provider: "hitomi",
    title: source.title ?? "Hitomi gallery",
    externalUrl: source.url,
    iframeUrl: source.url,
  };
}

async function resolveYtDlpProvider(
  source: UrlSourceConfig,
  options: UrlResolverOptions,
): Promise<UrlResolvedRuntimeResolution | null> {
  if (options.ytDlpResolver) {
    try {
      const items = flattenRuntimeMediaItems(
        await options.ytDlpResolver(source.url),
      );
      if (items.length) {
        return {
          status: "resolved",
          mode: "provider",
          hint: "provider:yt-dlp",
          provider: "yt-dlp",
          title: source.title ?? items[0]?.title ?? "URL video",
          externalUrl: source.url,
          items,
        };
      }
    } catch {
      return null;
    }
  } else {
    const resolution = await extractYtDlpRuntimeResolution(source.url, {
      diagnostics: options.ytDlpDiagnostics,
    });
    if (resolution) {
      return {
        status: "resolved",
        mode: "provider",
        hint: "provider:yt-dlp",
        provider: resolution.provider,
        title: source.title ?? resolution.title,
        externalUrl: source.url,
        ...(resolution.items ? { items: resolution.items } : {}),
        ...(resolution.iframeUrl ? { iframeUrl: resolution.iframeUrl } : {}),
        ...(resolution.metadata ? { metadata: resolution.metadata } : {}),
      };
    }
  }

  return null;
}

function resolveTikTokEmbedProvider(
  source: UrlSourceConfig,
): UrlResolvedRuntimeResolution | null {
  const tiktok = tiktokEmbedUrl(source.url);
  if (!tiktok) return null;

  return {
    status: "resolved",
    mode: "provider",
    hint: "provider:tiktok",
    provider: "tiktok",
    title: source.title ?? "TikTok video",
    externalUrl: source.url,
    iframeUrl: tiktok,
  };
}

function resolveBrowserRequiredSocialEmbed(
  source: UrlSourceConfig,
): UrlResolvedRuntimeResolution | null {
  const instagram = instagramEmbedUrl(source.url);
  if (instagram) {
    return {
      status: "resolved",
      mode: "provider",
      hint: "provider:instagram",
      provider: "instagram",
      title: source.title ?? "Instagram post",
      externalUrl: source.url,
      iframeUrl: instagram,
    };
  }

  const tiktok = resolveTikTokEmbedProvider(source);
  if (tiktok) return tiktok;

  return null;
}

function resolveSocialEmbed(
  source: UrlSourceConfig,
): UrlResolvedRuntimeResolution | null {
  const browserRequired = resolveBrowserRequiredSocialEmbed(source);
  if (browserRequired) return browserRequired;

  const tweet = twitterEmbedUrl(source.url);
  if (tweet) {
    return {
      status: "resolved",
      mode: "provider",
      hint: "provider:twitter",
      provider: "twitter",
      title: source.title ?? "Twitter/X post",
      externalUrl: source.url,
      iframeUrl: tweet,
    };
  }

  return null;
}

function instagramEmbedUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "instagram.com") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const kind = segments[0];
  const shortcode = segments[1];
  if (
    !shortcode ||
    (kind !== "p" && kind !== "reel" && kind !== "tv") ||
    !/^[A-Za-z0-9_-]+$/.test(shortcode)
  ) {
    return null;
  }

  return `https://www.instagram.com/${kind}/${shortcode}/embed`;
}

function tiktokEmbedUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "tiktok.com") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const videoIndex = segments.indexOf("video");
  const videoId = videoIndex >= 0 ? segments[videoIndex + 1] : null;
  if (!videoId || !/^\d{6,32}$/.test(videoId)) return null;

  return `https://www.tiktok.com/embed/v2/${videoId}`;
}

function twitterEmbedUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "x.com" && host !== "twitter.com") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const statusIndex = segments.findIndex(
    (segment) => segment === "status" || segment === "statuses",
  );
  const statusId = statusIndex >= 0 ? segments[statusIndex + 1] : null;
  if (!statusId || !/^\d{6,32}$/.test(statusId)) return null;

  const embedUrl = new URL("https://platform.twitter.com/embed/Tweet.html");
  embedUrl.searchParams.set("id", statusId);

  return embedUrl.toString();
}
