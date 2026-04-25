import type { RuntimeFeedItem, RuntimeMedia } from "@/lib/feed/types";
import { fetchRedditRuntimePostLinks } from "@/lib/reddit/client";
import type {
  UrlResolvedRuntimeResolution,
  UrlResolverHint,
  UrlRuntimeResolution,
  UrlSourceConfig,
} from "./types";
import { parseUrlSourceConfig } from "./validation";
import { extractGalleryRuntimeItems } from "./gallery";
import { extractYtDlpRuntimeResolution } from "./ytdlp";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type UrlResolverOptions = {
  fetch?: FetchLike;
  redditResolver?: (url: string) => Promise<RuntimeFeedItem[]>;
  galleryResolver?: (url: string) => Promise<RuntimeFeedItem[]>;
  ytDlpResolver?: (url: string) => Promise<RuntimeFeedItem[]>;
  allowIframeFallback?: boolean;
  now?: () => string;
};

type ResolvedUrlSource = {
  resolution: UrlRuntimeResolution;
  nextResolverHint?: UrlResolverHint;
};

type ResolverName = "direct-media" | "provider" | "metadata" | "iframe";

const DEFAULT_DIRECT_MEDIA_TITLE = "URL media";
const IMAGE_EXTENSIONS = new Set([
  ".apng",
  ".avif",
  ".gif",
  ".jpg",
  ".jpeg",
  ".png",
  ".svg",
  ".webp",
]);
const VIDEO_EXTENSIONS = new Set([
  ".m3u8",
  ".m4v",
  ".mov",
  ".mp4",
  ".mpeg",
  ".mpg",
  ".ogv",
  ".webm",
]);
const AUDIO_EXTENSIONS = new Set([
  ".aac",
  ".flac",
  ".m4a",
  ".mp3",
  ".oga",
  ".ogg",
  ".wav",
  ".weba",
]);

export async function resolveUrlSource(
  input: UrlSourceConfig,
  options: UrlResolverOptions = {},
): Promise<ResolvedUrlSource> {
  const source = parseUrlSourceConfig(input);
  const hintedResolver = resolverNameFromHint(source.resolverHint, source);
  const tried = new Set<ResolverName>();

  if (hintedResolver) {
    tried.add(hintedResolver);
    const hinted = await runResolver(hintedResolver, source, options);
    if (hinted?.status === "resolved") return toResolved(hinted);
  }

  for (const resolver of [
    "direct-media",
    "provider",
    "metadata",
    "iframe",
  ] satisfies ResolverName[]) {
    if (tried.has(resolver)) continue;

    const resolution = await runResolver(resolver, source, options);
    if (resolution) return toResolved(resolution);
  }

  return {
    resolution: {
      status: "unsupported",
      title: source.title ?? "Unsupported URL",
      externalUrl: source.url,
      reason: "url_source_unsupported",
    },
  };
}

function toResolved(resolution: UrlRuntimeResolution): ResolvedUrlSource {
  return {
    resolution,
    nextResolverHint:
      resolution.status === "resolved" ? resolution.hint : undefined,
  };
}

async function runResolver(
  resolver: ResolverName,
  source: UrlSourceConfig,
  options: UrlResolverOptions,
) {
  if (resolver === "direct-media") return resolveDirectMedia(source, options);
  if (resolver === "provider") return resolveProvider(source, options);
  if (resolver === "metadata") return resolveMetadata(source, options);
  return resolveIframe(source, options);
}

function resolverNameFromHint(
  hint: UrlResolverHint | undefined,
  source: UrlSourceConfig,
): ResolverName | null {
  if (!hint) return null;
  if (hint === "iframe" && isSocialProviderUrl(source.url)) return null;
  if (hint === "direct-media" || hint === "metadata" || hint === "iframe") {
    return hint;
  }

  return "provider";
}

async function resolveDirectMedia(
  source: UrlSourceConfig,
  options: UrlResolverOptions,
): Promise<UrlResolvedRuntimeResolution | null> {
  const media =
    mediaFromUrl(source.url) ??
    (isKnownProviderUrl(source.url)
      ? null
      : await mediaFromContentType(source.url, options));

  if (!media) return null;

  const title =
    source.title ?? titleFromUrl(source.url) ?? DEFAULT_DIRECT_MEDIA_TITLE;

  return {
    status: "resolved",
    mode: "direct-media",
    hint: "direct-media",
    title,
    externalUrl: source.url,
    items: [
      {
        id: `url:${source.url}`,
        source: "url",
        title,
        isNsfw: false,
        createdAt: options.now?.() ?? new Date().toISOString(),
        media: [media],
      },
    ],
  };
}

async function mediaFromContentType(
  url: string,
  options: UrlResolverOptions,
): Promise<RuntimeMedia | null> {
  const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetcher) return null;

  try {
    const response = await fetcher(url, { method: "HEAD", cache: "no-store" });
    if (!response.ok) return null;

    return mediaFromMime(url, response.headers.get("content-type") ?? "");
  } catch {
    return null;
  }
}

function mediaFromUrl(url: string): RuntimeMedia | null {
  const pathname = new URL(url).pathname.toLowerCase();
  const extension = [
    ...IMAGE_EXTENSIONS,
    ...VIDEO_EXTENSIONS,
    ...AUDIO_EXTENSIONS,
  ]
    .sort((first, second) => second.length - first.length)
    .find((candidate) => pathname.endsWith(candidate));

  if (!extension) return null;
  if (IMAGE_EXTENSIONS.has(extension)) return { type: "image", url };
  if (VIDEO_EXTENSIONS.has(extension)) {
    return { type: "video", url, isHls: extension === ".m3u8" };
  }

  return { type: "audio", url };
}

function mediaFromMime(url: string, contentType: string): RuntimeMedia | null {
  const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime.startsWith("image/")) return { type: "image", url };
  if (mime.startsWith("video/")) {
    return {
      type: "video",
      url,
      isHls:
        mime === "application/vnd.apple.mpegurl" ||
        mime === "application/x-mpegurl",
    };
  }
  if (mime.startsWith("audio/")) return { type: "audio", url };
  if (mime === "application/vnd.apple.mpegurl") {
    return { type: "video", url, isHls: true };
  }

  return null;
}

async function resolveProvider(
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
    const resolution = await extractYtDlpRuntimeResolution(source.url);
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

  const tiktok = tiktokEmbedUrl(source.url);
  if (tiktok) {
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

async function resolveMetadata(
  source: UrlSourceConfig,
  options: UrlResolverOptions,
): Promise<UrlResolvedRuntimeResolution | null> {
  const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetcher) return null;

  try {
    const response = await fetcher(source.url, {
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.toLowerCase().includes("html")) {
      return null;
    }

    const html = await response.text();
    const metadata = parseHtmlMetadata(html);
    const title = source.title ?? metadata.title ?? titleFromUrl(source.url);

    if (!title && !metadata.description && !metadata.thumbnailUrl) {
      return null;
    }

    return {
      status: "resolved",
      mode: "metadata",
      hint: "metadata",
      title: title ?? "URL metadata",
      externalUrl: source.url,
      metadata,
    };
  } catch {
    return null;
  }
}

async function resolveIframe(
  source: UrlSourceConfig,
  options: UrlResolverOptions,
): Promise<UrlRuntimeResolution | null> {
  if (options.allowIframeFallback === false) return null;

  const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (fetcher) {
    try {
      const response = await fetcher(source.url, {
        method: "HEAD",
        cache: "no-store",
      });
      if (response.ok && responseBlocksIframe(response)) {
        return {
          status: "blocked",
          title: source.title ?? titleFromUrl(source.url) ?? "Blocked URL",
          externalUrl: source.url,
          reason: "url_source_frame_blocked",
        };
      }
    } catch {
      // Network/HEAD failures do not prove iframe is blocked.
    }
  }

  return {
    status: "resolved",
    mode: "iframe",
    hint: "iframe",
    title: source.title ?? titleFromUrl(source.url) ?? "URL",
    externalUrl: source.url,
    iframeUrl: source.url,
  };
}

function responseBlocksIframe(response: Response) {
  const xFrameOptions = response.headers.get("x-frame-options")?.toLowerCase();
  if (xFrameOptions === "deny" || xFrameOptions === "sameorigin") return true;

  const csp = response.headers.get("content-security-policy")?.toLowerCase();
  if (!csp) return false;

  const frameAncestors = csp
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("frame-ancestors"));

  return Boolean(
    frameAncestors &&
    (frameAncestors.includes("'none'") || frameAncestors.includes("'self'")),
  );
}

function isRedditUrl(value: string) {
  const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  return (
    host === "reddit.com" ||
    host === "old.reddit.com" ||
    host === "new.reddit.com" ||
    host === "redd.it"
  );
}

function isKnownProviderUrl(value: string) {
  return (
    isRedditUrl(value) ||
    isYoutubeUrl(value) ||
    isSocialProviderUrl(value) ||
    isGalleryProviderUrl(value)
  );
}

function isGalleryProviderUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname;

  if (host === "nhentai.net") return /^\/g\/\d+\/?$/.test(path);
  if (host === "imhentai.xxx") return /^\/gallery\//.test(path);
  if (host === "hentaifox.com") return /^\/gallery\/\d+\/?$/.test(path);
  if (host === "hentainexus.com") return /^\/(?:read|view)\/\d+\/?$/.test(path);
  if (host === "hentairead.com") return path.startsWith("/hentai/");
  if (host === "akuma.moe") return /^\/g\/[^/]+\/?$/.test(path);
  if (host === "e-hentai.org") return /^\/g\/\d+\/[a-z0-9]+\/?$/i.test(path);
  if (host === "hitomi.la") return isHitomiGalleryUrl(value);

  return false;
}

function isHitomiGalleryUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return (
    host === "hitomi.la" && /^\/[^/]+\/[^/]+-\d+\.html$/i.test(url.pathname)
  );
}

function isSocialProviderUrl(value: string) {
  const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");

  return (
    host === "instagram.com" ||
    host.endsWith(".instagram.com") ||
    host === "tiktok.com" ||
    host.endsWith(".tiktok.com") ||
    host === "x.com" ||
    host.endsWith(".x.com") ||
    host === "twitter.com" ||
    host.endsWith(".twitter.com")
  );
}

function isYoutubeUrl(value: string) {
  const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");

  return (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtu.be" ||
    host === "youtube-nocookie.com"
  );
}

function youtubeEmbedUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);
  const videoId =
    host === "youtu.be"
      ? segments[0]
      : segments[0] === "watch"
        ? url.searchParams.get("v")
        : segments[0] === "shorts" || segments[0] === "embed"
          ? segments[1]
          : null;

  if (!videoId || !/^[A-Za-z0-9_-]{6,64}$/.test(videoId)) return null;

  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
  const startSeconds = youtubeStartSeconds(url);
  if (startSeconds > 0)
    embedUrl.searchParams.set("start", String(startSeconds));

  return embedUrl.toString();
}

function youtubeStartSeconds(url: URL) {
  const raw = url.searchParams.get("start") ?? url.searchParams.get("t");
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);

  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return 0;

  return (
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
  );
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

function flattenRuntimeMediaItems(items: RuntimeFeedItem[]) {
  return items.flatMap((item) => {
    if (item.media.length <= 1) return [item];

    return item.media.map((media, index) => ({
      ...item,
      id: `${item.id}:media:${index}`,
      media: [media],
    }));
  });
}

function parseHtmlMetadata(html: string) {
  const tags = Array.from(html.matchAll(/<meta\s+[^>]*>/gi)).map(
    (match) => match[0],
  );
  const meta = new Map<string, string>();

  for (const tag of tags) {
    const key =
      getHtmlAttribute(tag, "property") ?? getHtmlAttribute(tag, "name");
    const content = getHtmlAttribute(tag, "content");
    if (key && content) meta.set(key.toLowerCase(), decodeHtml(content));
  }

  return {
    title:
      meta.get("og:title") ??
      meta.get("twitter:title") ??
      titleTagFromHtml(html),
    description:
      meta.get("og:description") ??
      meta.get("twitter:description") ??
      meta.get("description"),
    siteName: meta.get("og:site_name"),
    thumbnailUrl: meta.get("og:image") ?? meta.get("twitter:image"),
  };
}

function getHtmlAttribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );

  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

function titleTagFromHtml(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtml(match[1].trim()) : undefined;
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function titleFromUrl(value: string) {
  const url = new URL(value);
  const leaf = url.pathname.split("/").filter(Boolean).at(-1);
  return leaf
    ? decodeURIComponent(leaf).replace(/\.[a-z0-9]+$/i, "")
    : url.host;
}
