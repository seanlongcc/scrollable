import type { GalleryContext, GalleryExtraction } from "./gallery-types";
import { fetchHtml, fetchJson } from "./gallery-network";
import { imageElements, titleFromHtml } from "./gallery-html";
import {
  absoluteUrl,
  isRecord,
  normalizedHost,
  stringValue,
} from "./gallery-utils";

export async function extractNHentai(
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
