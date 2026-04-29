import type { RuntimeMedia } from "@/lib/feed/types";
import type { UrlResolvedRuntimeResolution, UrlSourceConfig } from "./types";
import type { UrlResolverOptions } from "./resolver-types";
import { isKnownProviderUrl } from "./resolver-routing";
import { titleFromUrl } from "./resolver-title";

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

export async function resolveDirectMedia(
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
