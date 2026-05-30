import type { RuntimeMedia } from "@/lib/feed/types";

const IMAGE_EXTENSIONS = new Set([
  ".apng",
  ".avif",
  ".gif",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

export async function fetchOldRedditGalleryMedia({
  allowNsfw,
  permalink,
  postId,
  userAgent,
}: {
  allowNsfw?: boolean;
  permalink: string | null;
  postId: string;
  userAgent: string;
}): Promise<RuntimeMedia[]> {
  const response = await fetch(oldRedditGalleryUrl(permalink, postId), {
    cache: "no-store",
    headers: {
      ...(allowNsfw ? { Cookie: "over18=1" } : {}),
      "User-Agent": userAgent,
    },
  });

  if (!response.ok) return [];

  return oldRedditGalleryHtmlToMedia(await response.text());
}

export function oldRedditGalleryHtmlToMedia(html: string): RuntimeMedia[] {
  const media: RuntimeMedia[] = [];
  const seenUrls = new Set<string>();

  for (const fragment of galleryHtmlFragments(html)) {
    for (const match of fragment.matchAll(
      /<a\b(?=[^>]*\bgallery-item-thumbnail-link\b)([^>]*)>([\s\S]*?)<\/a>/gi,
    )) {
      const anchorTag = match[0];
      const anchorAttributes = match[1] ?? "";
      const anchorBody = match[2] ?? "";
      const href = xmlAttribute(`<a ${anchorAttributes}>`, "href");
      const url = href ? decodeXmlEntities(href) : null;
      if (!url || seenUrls.has(url)) continue;

      const parsed = mediaFromGalleryUrl(url);
      if (!parsed) continue;

      const imgTag = anchorBody.match(/<img\b[^>]*>/i)?.[0] ?? "";
      const position = numberAttribute(anchorTag, "data-position");
      media.push({
        ...parsed,
        width: numberAttribute(imgTag, "width"),
        height: numberAttribute(imgTag, "height"),
        galleryIndex: position ? position - 1 : media.length,
      });
      seenUrls.add(url);
    }
  }

  return media.sort(
    (first, second) => (first.galleryIndex ?? 0) - (second.galleryIndex ?? 0),
  );
}

export function isRedditGalleryUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      /^(.+\.)?reddit\.com$/i.test(url.hostname) &&
      /^\/gallery\/[^/]+\/?$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function oldRedditGalleryUrl(permalink: string | null, postId: string) {
  const url = new URL(permalink ?? `/comments/${postId}`, "https://reddit.com");
  url.protocol = "https:";
  url.hostname = "old.reddit.com";
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";

  return url.toString();
}

function mediaFromGalleryUrl(value: string): RuntimeMedia | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const pathname = url.pathname.toLowerCase();
  const extension = [...IMAGE_EXTENSIONS]
    .sort((first, second) => second.length - first.length)
    .find((candidate) => pathname.endsWith(candidate));

  if (!extension) return null;

  return {
    type: "image",
    url: url.toString(),
  };
}

function galleryHtmlFragments(html: string) {
  return [html, ...cachedGalleryHtmlFragments(html)];
}

function cachedGalleryHtmlFragments(html: string) {
  return Array.from(
    html.matchAll(/(?:^|[\s<])data-cachedhtml\s*=\s*("([^"]*)"|'([^']*)')/gi),
  ).flatMap((match) => {
    const value = match[2] ?? match[3];
    return value ? [decodeXmlEntities(value)] : [];
  });
}

function numberAttribute(tag: string, name: string) {
  const value = xmlAttribute(tag, name);
  const number = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isFinite(number) ? number : undefined;
}

function xmlAttribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(
      `(?:^|[\\s<])${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
      "i",
    ),
  );
  const value = match?.[2] ?? match?.[3] ?? match?.[4];

  return value ? decodeXmlEntities(value) : null;
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, codepoint: string) =>
      String.fromCodePoint(Number.parseInt(codepoint, 16)),
    )
    .replace(/&#(\d+);/g, (_match, codepoint: string) =>
      String.fromCodePoint(Number.parseInt(codepoint, 10)),
    )
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}
