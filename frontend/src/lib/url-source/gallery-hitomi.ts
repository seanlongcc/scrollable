import type {
  GalleryContext,
  GalleryExtraction,
  GalleryFetchLike,
} from "./gallery-types";
import { fetchHtml, fetchText } from "./gallery-network";
import { quotedStrings, titleFromHtml } from "./gallery-html";
import { isRecord, stringValue } from "./gallery-utils";

type HitomiRouting = {
  pathPrefix: string;
  shardOneCases: Set<number>;
};

const HITOMI_ASSET_ORIGIN = "https://ltn.gold-usergeneratedcontent.net";

export async function extractHitomi(
  url: URL,
  context: GalleryContext,
): Promise<GalleryExtraction | null> {
  if (!/^\/[^/]+\/[^/]+-\d+\.html$/i.test(url.pathname)) return null;

  const html = await fetchHtml(url, context.fetcher);
  if (!html) return null;

  const directUrls = quotedStrings(html).filter((value) =>
    /^https:\/\/[a-z]\.hitomi\.la\/(?:webp|avif|images)\//i.test(value),
  );
  const galleryId = hitomiGalleryIdFromUrl(url);
  const galleryInfo =
    galleryId !== null
      ? await fetchHitomiGalleryInfo(galleryId, context.fetcher)
      : null;
  const routing = galleryInfo
    ? await fetchHitomiRouting(context.fetcher)
    : null;
  const derivedUrls = galleryInfo?.files.length
    ? galleryInfo.files
        .map((file) =>
          routing
            ? hitomiWebpUrl(file.hash, routing)
            : hitomiLegacyWebpUrl(file.hash),
        )
        .filter((source): source is string => Boolean(source))
    : hitomiFileHashes(html).map(hitomiLegacyWebpUrl);

  return {
    title: titleFromHtml(html) ?? galleryInfo?.title,
    imageUrls: [...directUrls, ...derivedUrls],
  };
}

function hitomiFileHashes(html: string) {
  return Array.from(html.matchAll(/\bhash\s*:\s*["']([0-9a-f]{8,})["']/gi)).map(
    (match) => match[1]!.toLowerCase(),
  );
}

function hitomiGalleryIdFromUrl(url: URL) {
  return url.pathname.match(/-(\d+)\.html$/i)?.[1] ?? null;
}

async function fetchHitomiGalleryInfo(
  galleryId: string,
  fetcher: GalleryFetchLike,
): Promise<{
  title?: string;
  files: Array<{ hash: string; name: string }>;
} | null> {
  const url = new URL(`/galleries/${galleryId}.js`, HITOMI_ASSET_ORIGIN);
  const text = await fetchText(url, fetcher, {
    Accept: "application/javascript,*/*",
    Referer: `https://hitomi.la/`,
  });
  if (!text) return null;

  const json = text.replace(/^var\s+galleryinfo\s*=\s*/, "").trim();
  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(payload) || !Array.isArray(payload.files)) return null;

  const files = payload.files
    .map((file) => {
      if (!isRecord(file)) return null;
      const hash = stringValue(file.hash)?.toLowerCase();
      const name = stringValue(file.name) ?? "";
      return hash ? { hash, name } : null;
    })
    .filter((file): file is { hash: string; name: string } => Boolean(file));

  return {
    title: stringValue(payload.title) ?? stringValue(payload.japanese_title),
    files,
  };
}

async function fetchHitomiRouting(
  fetcher: GalleryFetchLike,
): Promise<HitomiRouting | null> {
  const url = new URL("/gg.js", HITOMI_ASSET_ORIGIN);
  const text = await fetchText(url, fetcher, {
    Accept: "application/javascript,*/*",
    Referer: `https://hitomi.la/`,
  });
  return text ? parseHitomiRouting(text) : null;
}

function parseHitomiRouting(script: string): HitomiRouting | null {
  const pathPrefix = script.match(/\bb:\s*["']([^"']+)["']/)?.[1];
  if (!pathPrefix) return null;

  const shardOneCases = new Set<number>();
  const shardOneBlock = script.match(
    /switch\s*\(g\)\s*{([\s\S]*?)o\s*=\s*1\s*;/,
  )?.[1];
  if (shardOneBlock) {
    for (const match of shardOneBlock.matchAll(/case\s+(\d+)\s*:/g)) {
      shardOneCases.add(Number(match[1]));
    }
  }

  return { pathPrefix, shardOneCases };
}

function hitomiWebpUrl(hash: string, routing: HitomiRouting) {
  if (!/^[0-9a-f]{3,}$/i.test(hash)) return null;

  const route = hitomiRouteFromHash(hash);
  const shard = routing.shardOneCases.has(route) ? 2 : 1;
  return `https://w${shard}.gold-usergeneratedcontent.net/${routing.pathPrefix}${route}/${hash}.webp`;
}

function hitomiLegacyWebpUrl(hash: string) {
  const path = realFullPathFromHash(hash);
  return `https://a.hitomi.la/webp/${path}.webp`;
}

function hitomiRouteFromHash(hash: string) {
  const match = hash.match(/(..)(.)$/);
  return match ? parseInt(`${match[2]}${match[1]}`, 16) : 0;
}

function realFullPathFromHash(hash: string) {
  if (hash.length < 3) return hash;
  return `${hash.at(-1)}/${hash.slice(-3, -1)}/${hash}`;
}
