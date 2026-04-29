import type { UrlResolverHint, UrlSourceConfig } from "./types";
import type { ResolverName } from "./resolver-types";

export function resolverNameFromHint(
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

export function isRedditUrl(value: string) {
  const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  return (
    host === "reddit.com" ||
    host === "old.reddit.com" ||
    host === "new.reddit.com" ||
    host === "redd.it"
  );
}

export function isKnownProviderUrl(value: string) {
  return (
    isRedditUrl(value) ||
    isYoutubeUrl(value) ||
    isSocialProviderUrl(value) ||
    isGalleryProviderUrl(value)
  );
}

export function isGalleryProviderUrl(value: string) {
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

export function isHitomiGalleryUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return (
    host === "hitomi.la" && /^\/[^/]+\/[^/]+-\d+\.html$/i.test(url.pathname)
  );
}

export function isSocialProviderUrl(value: string) {
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

export function isTikTokUrl(value: string) {
  const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  return host === "tiktok.com" || host.endsWith(".tiktok.com");
}

export function isYoutubeUrl(value: string) {
  const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");

  return (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtu.be" ||
    host === "youtube-nocookie.com"
  );
}
