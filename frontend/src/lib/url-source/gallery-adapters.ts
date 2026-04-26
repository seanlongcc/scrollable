import type { GalleryContext, GalleryExtraction } from "./gallery-types";
import { fetchHtml } from "./gallery-network";
import { extractNHentai } from "./gallery-nhentai";
import { extractHitomi } from "./gallery-hitomi";
import {
  decodedChapterImageSources,
  firstImageWithClass,
  fullImageHref,
  gThCodes,
  hrefs,
  imageById,
  inputValueById,
  metaContent,
  pageDataImages,
  scriptObjectStringValue,
  titleFromHtml,
} from "./gallery-html";
import {
  absoluteUrl,
  ensureTrailingSlash,
  normalizedHost,
  parentUrl,
  pathJoin,
  safeUrl,
  unique,
} from "./gallery-utils";

export function adapterForUrl(url: URL) {
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
