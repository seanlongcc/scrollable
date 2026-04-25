import { createHash } from "node:crypto";

import type { RuntimeFeedItem } from "@/lib/feed/types";

export type GalleryFetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type GalleryResolverOptions = {
  fetch?: GalleryFetchLike;
  now?: () => string;
  maxItems?: number;
  nhentaiApiKey?: string;
};

type GalleryContext = {
  fetcher: GalleryFetchLike;
  maxItems: number;
  nhentaiApiKey?: string;
};

type GalleryExtraction = {
  title?: string;
  imageUrls: string[];
};

type HitomiRouting = {
  pathPrefix: string;
  shardOneCases: Set<number>;
};

const DEFAULT_MAX_GALLERY_ITEMS = 100;
const HITOMI_ASSET_ORIGIN = "https://ltn.gold-usergeneratedcontent.net";

export async function extractGalleryRuntimeItems(
  value: string,
  options: GalleryResolverOptions = {},
): Promise<RuntimeFeedItem[]> {
  const url = safeUrl(value);
  if (!url) return [];

  const adapter = adapterForUrl(url);
  if (!adapter) return [];

  const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetcher) return [];

  try {
    const extraction = await adapter(url, {
      fetcher,
      maxItems: options.maxItems ?? DEFAULT_MAX_GALLERY_ITEMS,
      nhentaiApiKey: options.nhentaiApiKey ?? process.env.NHENTAI_API_KEY,
    });
    return galleryItemsFromExtraction(value, extraction, {
      now: options.now,
      maxItems: options.maxItems ?? DEFAULT_MAX_GALLERY_ITEMS,
    });
  } catch {
    return [];
  }
}

function adapterForUrl(url: URL) {
  const host = normalizedHost(url);

  if (host === "nhentai.net") return extractNHentai;
  if (host === "imhentai.xxx") return extractIMHentai;
  if (host === "hentaifox.com") return extractHentaiFox;
  if (host === "hentainexus.com") return extractHentaiNexus;
  if (host === "hentairead.com") return extractHentaiRead;
  if (host === "akuma.moe") return extractAkuma;
  if (host === "e-hentai.org") return extractEHentai;
  if (host === "hitomi.la") return extractHitomi;

  return null;
}

async function extractNHentai(
  url: URL,
  context: GalleryContext,
): Promise<GalleryExtraction | null> {
  const galleryId = url.pathname.match(/^\/g\/(\d+)\/?$/)?.[1];
  if (!galleryId) return null;

  const apiExtraction = await extractNHentaiApi(url, context, galleryId);
  if (apiExtraction?.imageUrls.length) return apiExtraction;

  const html = await fetchHtml(url, context.fetcher);
  if (!html) return null;

  const imageUrls = imageElements(html)
    .map((source) => absoluteUrl(source, url))
    .filter((source): source is string => Boolean(source))
    .filter((source) => source.includes("/galleries/"))
    .map(nhentaiPageImageUrl);

  return { title: titleFromHtml(html), imageUrls };
}

async function extractNHentaiApi(
  url: URL,
  context: GalleryContext,
  galleryId: string,
): Promise<GalleryExtraction | null> {
  const v2ApiUrl = new URL(`/api/v2/galleries/${galleryId}`, url.origin);
  v2ApiUrl.searchParams.set("include", "pages");
  const v2Payload = await fetchJson(v2ApiUrl, context.fetcher, url, {
    apiKey: context.nhentaiApiKey,
  });
  const v2Extraction = nhentaiV2ApiExtraction(url, v2Payload);
  if (v2Extraction?.imageUrls.length) return v2Extraction;

  const legacyApiUrl = new URL(`/api/gallery/${galleryId}`, url.origin);
  const payload = await fetchJson(legacyApiUrl, context.fetcher, url, {
    apiKey: context.nhentaiApiKey,
  });
  if (!isRecord(payload)) return null;

  const mediaId = stringValue(payload.media_id);
  const images = isRecord(payload.images) ? payload.images.pages : undefined;
  if (!mediaId || !Array.isArray(images)) return null;

  const imageUrls = images
    .map((image, index) => {
      if (!isRecord(image)) return null;
      const extension = nhentaiImageExtension(stringValue(image.t));
      if (!extension) return null;
      return `https://i.nhentai.net/galleries/${mediaId}/${index + 1}.${extension}`;
    })
    .filter((source): source is string => Boolean(source));

  return { title: nhentaiApiTitle(payload), imageUrls };
}

function nhentaiV2ApiExtraction(
  url: URL,
  payload: unknown,
): GalleryExtraction | null {
  if (!isRecord(payload)) return null;

  const mediaId = stringValue(payload.media_id);
  const pages = Array.isArray(payload.pages) ? payload.pages : [];
  if (!mediaId || !pages.length) return null;

  const imageUrls = pages
    .map((page, index) => {
      if (!isRecord(page)) return null;
      const path = stringValue(page.path);
      const extension = nhentaiImageExtensionFromPath(path);
      if (!extension) return null;
      return `${nhentaiImageBaseUrl(url)}/${mediaId}/${index + 1}.${extension}`;
    })
    .filter((source): source is string => Boolean(source));

  return { title: nhentaiApiTitle(payload), imageUrls };
}

async function extractIMHentai(
  url: URL,
  context: GalleryContext,
): Promise<GalleryExtraction | null> {
  const html = await fetchHtml(url, context.fetcher);
  if (!html) return null;

  const server = inputValueById(html, "load_server");
  const dir = inputValueById(html, "load_dir");
  const id = inputValueById(html, "load_id");
  if (!server || !dir || !id) return null;

  const imageUrls = gThCodes(html).map((code, index) => {
    const extension = imhentaiExtension(code);
    return `https://m${server}.${url.hostname}/${pathJoin(dir, id, `${index + 1}${extension}`)}`;
  });

  return { title: titleFromHtml(html), imageUrls };
}

async function extractHentaiFox(
  url: URL,
  context: GalleryContext,
): Promise<GalleryExtraction | null> {
  const match = url.pathname.match(/^\/gallery\/(\d+)\/?$/);
  if (!match) return null;

  const html = await fetchHtml(url, context.fetcher);
  if (!html) return null;

  const dir = inputValueById(html, "load_dir");
  const id = inputValueById(html, "load_id");
  if (!dir || !id) return null;

  const cdn =
    Number(match[1]) > 140_236
      ? "https://i3.hentaifox.com"
      : "https://i.hentaifox.com";
  const imageUrls = gThCodes(html).map((code, index) => {
    const extension = hentaifoxExtension(code);
    return `${cdn}/${pathJoin(dir, id, `${index + 1}${extension}`)}`;
  });

  return { title: titleFromHtml(html), imageUrls };
}

async function extractHentaiNexus(
  url: URL,
  context: GalleryContext,
): Promise<GalleryExtraction | null> {
  const readerUrl = new URL(url);
  if (/^\/view\/\d+\/?$/.test(readerUrl.pathname)) {
    readerUrl.pathname = readerUrl.pathname.replace("/view/", "/read/");
  }
  if (!/^\/read\/\d+\/?$/.test(readerUrl.pathname)) return null;

  const html = await fetchHtml(readerUrl, context.fetcher);
  if (!html) return null;

  const imageUrls = pageDataImages(html)
    .map((source) => absoluteUrl(source, readerUrl))
    .filter((source): source is string => Boolean(source));

  return { title: titleFromHtml(html), imageUrls };
}

async function extractHentaiRead(
  url: URL,
  context: GalleryContext,
): Promise<GalleryExtraction | null> {
  if (!url.pathname.startsWith("/hentai/")) return null;

  const html = await fetchHtml(url, context.fetcher);
  if (!html) return null;

  const baseUrl = scriptObjectStringValue(html, "baseUrl");
  if (!baseUrl) return null;

  const imageUrls = decodedChapterImageSources(html)
    .map((source) => absoluteUrl(source, new URL(ensureTrailingSlash(baseUrl))))
    .filter((source): source is string => Boolean(source));

  return { title: titleFromHtml(html), imageUrls };
}

async function extractAkuma(
  url: URL,
  context: GalleryContext,
): Promise<GalleryExtraction | null> {
  if (!/^\/g\/[^/]+\/?$/.test(url.pathname)) return null;

  const html = await fetchHtml(url, context.fetcher);
  if (!html) return null;

  const csrf = metaContent(html, "csrf-token");
  const cover = firstImageWithClass(html, "img-thumbnail");
  const imageBase = cover ? parentUrl(absoluteUrl(cover, url)) : null;
  if (!csrf || !imageBase) return null;

  const response = await context.fetcher(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Referer: url.toString(),
      "X-CSRF-TOKEN": csrf,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!response.ok) return null;

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) return null;

  const imageUrls = payload
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => absoluteUrl(entry, new URL(ensureTrailingSlash(imageBase))))
    .filter((source): source is string => Boolean(source));

  return { title: titleFromHtml(html), imageUrls };
}

async function extractEHentai(
  url: URL,
  context: GalleryContext,
): Promise<GalleryExtraction | null> {
  if (!/^\/g\/\d+\/[a-z0-9]+\/?$/i.test(url.pathname)) return null;

  const imagePageUrls: string[] = [];
  let title: string | undefined;
  const maxGalleryPages = Math.ceil(context.maxItems / 40);

  for (let page = 0; page < maxGalleryPages; page += 1) {
    const pageUrl = new URL(url);
    if (page > 0) pageUrl.searchParams.set("p", String(page));
    const html = await fetchHtml(pageUrl, context.fetcher);
    if (!html) break;
    title ??= titleFromHtml(html);

    const links = hrefs(html)
      .map((href) => absoluteUrl(href, pageUrl))
      .filter((href): href is string => Boolean(href))
      .filter((href) => {
        const parsed = safeUrl(href);
        return (
          Boolean(parsed) &&
          normalizedHost(parsed!) === "e-hentai.org" &&
          parsed!.pathname.startsWith("/s/")
        );
      });

    const before = imagePageUrls.length;
    imagePageUrls.push(...links);
    if (
      imagePageUrls.length === before ||
      imagePageUrls.length >= context.maxItems
    ) {
      break;
    }
  }

  const imageUrls: string[] = [];
  for (const pageUrl of unique(imagePageUrls).slice(0, context.maxItems)) {
    const html = await fetchHtml(new URL(pageUrl), context.fetcher);
    if (!html) continue;
    const image = imageById(html, "img") ?? fullImageHref(html);
    const absolute = image ? absoluteUrl(image, new URL(pageUrl)) : null;
    if (absolute) imageUrls.push(absolute);
  }

  return { title, imageUrls };
}

async function extractHitomi(
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

function galleryItemsFromExtraction(
  sourceUrl: string,
  extraction: GalleryExtraction | null,
  options: { now?: () => string; maxItems: number },
): RuntimeFeedItem[] {
  if (!extraction?.imageUrls.length) return [];

  const title = extraction.title ?? titleFromUrl(sourceUrl);
  return unique(extraction.imageUrls)
    .filter(isHttpUrl)
    .slice(0, options.maxItems)
    .map((url, index) => ({
      id: `url:gallery:${hashValue(`${sourceUrl}:${index}:${url}`)}`,
      source: "url" as const,
      title,
      isNsfw: true,
      createdAt: options.now?.() ?? new Date().toISOString(),
      media: [{ type: "image" as const, url }],
    }));
}

async function fetchHtml(
  url: URL,
  fetcher: GalleryFetchLike,
): Promise<string | null> {
  const text = await fetchText(url, fetcher, {
    Accept: "text/html,application/xhtml+xml",
    Referer: url.toString(),
  });
  if (!text) return null;

  return text;
}

async function fetchText(
  url: URL,
  fetcher: GalleryFetchLike,
  headers: Record<string, string>,
): Promise<string | null> {
  const response = await fetcher(url, {
    cache: "no-store",
    headers,
  });
  if (!response.ok) return null;

  const contentType = response.headers.get("content-type")?.toLowerCase();
  if (
    contentType &&
    !contentType.includes("html") &&
    !contentType.includes("javascript") &&
    !contentType.includes("json")
  ) {
    return null;
  }

  return response.text();
}

async function fetchJson(
  url: URL,
  fetcher: GalleryFetchLike,
  referer: URL,
  options: { apiKey?: string } = {},
): Promise<unknown> {
  const response = await fetcher(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Referer: referer.toString(),
      "X-Requested-With": "XMLHttpRequest",
      ...apiKeyHeaders(options.apiKey),
    },
  });
  if (!response.ok) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function apiKeyHeaders(value: string | undefined): Record<string, string> {
  const apiKey = value?.trim();
  if (!apiKey) return {};

  return {
    Authorization: `Key ${apiKey}`,
  };
}

function imageElements(html: string) {
  return Array.from(html.matchAll(/<img\s+[^>]*>/gi))
    .map((match) => {
      const tag = match[0];
      return getHtmlAttribute(tag, "data-src") ?? getHtmlAttribute(tag, "src");
    })
    .filter((source): source is string => Boolean(source));
}

function imageById(html: string, id: string) {
  const escaped = escapeRegExp(id);
  const match = html.match(
    new RegExp(`<(?:img|source)\\s+[^>]*id=["']${escaped}["'][^>]*>`, "i"),
  );
  return match ? getHtmlAttribute(match[0], "src") : null;
}

function firstImageWithClass(html: string, className: string) {
  const escaped = escapeRegExp(className);
  const tag = Array.from(html.matchAll(/<img\s+[^>]*>/gi))
    .map((match) => match[0])
    .find((candidate) => {
      const classValue = getHtmlAttribute(candidate, "class") ?? "";
      return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(classValue);
    });

  return tag ? getHtmlAttribute(tag, "src") : null;
}

function inputValueById(html: string, id: string) {
  const escaped = escapeRegExp(id);
  const match = html.match(
    new RegExp(`<input\\s+[^>]*id=["']${escaped}["'][^>]*>`, "i"),
  );
  return match ? getHtmlAttribute(match[0], "value") : null;
}

function getHtmlAttribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );

  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

function metaContent(html: string, name: string) {
  const escaped = escapeRegExp(name);
  const match = html.match(
    new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${escaped}["'][^>]*>`, "i"),
  );
  return match ? getHtmlAttribute(match[0], "content") : null;
}

function hrefs(html: string) {
  return Array.from(html.matchAll(/<a\s+[^>]*>/gi))
    .map((match) => getHtmlAttribute(match[0], "href"))
    .filter((href): href is string => Boolean(href));
}

function fullImageHref(html: string) {
  return hrefs(html).find((href) => href.includes("fullimg.php")) ?? null;
}

function titleFromHtml(html: string) {
  const ogTitle = metaContent(html, "og:title");
  if (ogTitle) return decodeHtml(stripTags(ogTitle));

  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (heading) return decodeHtml(stripTags(heading).trim());

  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeHtml(stripTags(title).trim()) : undefined;
}

function gThCodes(html: string) {
  const objectMatch = html.match(/\bg_th\b\s*=\s*({[\s\S]*?});/);
  const objectSource = objectMatch?.[1] ?? "";
  return Array.from(objectSource.matchAll(/\[\s*["']?([a-z])["']?/gi)).map(
    (match) => match[1]!.toLowerCase(),
  );
}

function pageDataImages(html: string) {
  return Array.from(html.matchAll(/\bimage\s*:\s*["']([^"']+)["']/gi)).map(
    (match) => decodeJsString(match[1]!),
  );
}

function scriptObjectStringValue(html: string, key: string) {
  const escaped = escapeRegExp(key);
  const match = html.match(
    new RegExp(`\\b${escaped}\\b\\s*:\\s*["']([^"']+)["']`, "i"),
  );
  return match?.[1] ? decodeJsString(match[1]) : null;
}

function decodedChapterImageSources(html: string) {
  const results: string[] = [];

  for (const candidate of quotedStrings(html)) {
    if (!/^[A-Za-z0-9+/=]{20,}$/.test(candidate)) continue;

    try {
      const decoded = Buffer.from(candidate, "base64").toString("utf8");
      const payload: unknown = JSON.parse(decoded);
      results.push(...chapterImageSources(payload));
    } catch {
      // Ignore non-chapter strings.
    }
  }

  return results;
}

function chapterImageSources(value: unknown): string[] {
  if (!isRecord(value)) return [];

  const data = value.data;
  if (!isRecord(data)) return [];

  const chapter = data.chapter;
  if (!isRecord(chapter)) return [];

  const images = chapter.images;
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => (isRecord(image) ? image.src : undefined))
    .filter((source): source is string => typeof source === "string");
}

function quotedStrings(value: string) {
  return Array.from(value.matchAll(/["']([^"']+)["']/g)).map(
    (match) => match[1]!,
  );
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

function nhentaiApiTitle(payload: Record<string, unknown>) {
  const title = payload.title;
  if (!isRecord(title)) return undefined;

  return (
    stringValue(title.pretty) ??
    stringValue(title.english) ??
    stringValue(title.japanese)
  );
}

function nhentaiImageExtension(code: string | undefined) {
  const extensions: Record<string, string> = {
    g: "gif",
    j: "jpg",
    p: "png",
    w: "webp",
  };

  return code ? extensions[code] : undefined;
}

function nhentaiImageExtensionFromPath(path: string | undefined) {
  if (!path) return undefined;

  const filename = path.split("/").at(-1) ?? "";
  return filename
    .replace(/t(\.\w+)$/i, "$1")
    .split(".")
    .at(-1)
    ?.toLowerCase();
}

function nhentaiImageBaseUrl(url: URL) {
  const host = normalizedHost(url);
  return `${url.protocol}//i1.${host}/galleries`;
}

function nhentaiPageImageUrl(source: string) {
  const url = new URL(source);
  url.hostname = url.hostname.replace(/^t(\d*)\./, "i$1.");
  url.pathname = url.pathname
    .replace(/\/t(\d+)\./, "/i$1.")
    .replace(/\/(\d+)t\./, "/$1.")
    .replace(/(\.[a-z0-9]+){2,}$/i, "$1");
  return url.toString();
}

function imhentaiExtension(code: string) {
  const extensions: Record<string, string> = {
    g: ".gif",
    j: ".jpg",
    p: ".png",
    w: ".webp",
  };

  return extensions[code] ?? ".jpg";
}

function hentaifoxExtension(code: string) {
  const extensions: Record<string, string> = {
    b: ".bmp",
    g: ".gif",
    p: ".png",
    w: ".webp",
  };

  return extensions[code] ?? ".jpg";
}

function pathJoin(...parts: string[]) {
  return parts
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function absoluteUrl(value: string, base: URL) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function parentUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const segments = url.pathname.split("/");
    segments.pop();
    url.pathname = ensureTrailingSlash(segments.join("/"));
    return url.toString();
  } catch {
    return null;
  }
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizedHost(url: URL) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return isHttpUrl(value) ? url : null;
  } catch {
    return null;
  }
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function titleFromUrl(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "Gallery URL";
  }
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function decodeJsString(value: string) {
  return value
    .replaceAll("\\/", "/")
    .replaceAll('\\"', '"')
    .replaceAll("\\'", "'");
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
