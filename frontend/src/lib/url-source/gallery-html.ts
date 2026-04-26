import {
  decodeHtml,
  decodeJsString,
  escapeRegExp,
  isRecord,
  stripTags,
} from "./gallery-utils";

export function imageElements(html: string) {
  return Array.from(html.matchAll(/<img\s+[^>]*>/gi))
    .map((match) => {
      const tag = match[0];
      return getHtmlAttribute(tag, "data-src") ?? getHtmlAttribute(tag, "src");
    })
    .filter((source): source is string => Boolean(source));
}

export function imageById(html: string, id: string) {
  const escaped = escapeRegExp(id);
  const match = html.match(
    new RegExp(`<(?:img|source)\\s+[^>]*id=["']${escaped}["'][^>]*>`, "i"),
  );
  return match ? getHtmlAttribute(match[0], "src") : null;
}

export function firstImageWithClass(html: string, className: string) {
  const escaped = escapeRegExp(className);
  const tag = Array.from(html.matchAll(/<img\s+[^>]*>/gi))
    .map((match) => match[0])
    .find((candidate) => {
      const classValue = getHtmlAttribute(candidate, "class") ?? "";
      return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(classValue);
    });

  return tag ? getHtmlAttribute(tag, "src") : null;
}

export function inputValueById(html: string, id: string) {
  const escaped = escapeRegExp(id);
  const match = html.match(
    new RegExp(`<input\\s+[^>]*id=["']${escaped}["'][^>]*>`, "i"),
  );
  return match ? getHtmlAttribute(match[0], "value") : null;
}

export function getHtmlAttribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );

  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

export function metaContent(html: string, name: string) {
  const escaped = escapeRegExp(name);
  const match = html.match(
    new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${escaped}["'][^>]*>`, "i"),
  );
  return match ? getHtmlAttribute(match[0], "content") : null;
}

export function hrefs(html: string) {
  return Array.from(html.matchAll(/<a\s+[^>]*>/gi))
    .map((match) => getHtmlAttribute(match[0], "href"))
    .filter((href): href is string => Boolean(href));
}

export function fullImageHref(html: string) {
  return hrefs(html).find((href) => href.includes("fullimg.php")) ?? null;
}

export function titleFromHtml(html: string) {
  const ogTitle = metaContent(html, "og:title");
  if (ogTitle) return decodeHtml(stripTags(ogTitle));

  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (heading) return decodeHtml(stripTags(heading).trim());

  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeHtml(stripTags(title).trim()) : undefined;
}

export function gThCodes(html: string) {
  const objectMatch = html.match(/\bg_th\b\s*=\s*({[\s\S]*?});/);
  const objectSource = objectMatch?.[1] ?? "";
  return Array.from(objectSource.matchAll(/\[\s*["']?([a-z])["']?/gi)).map(
    (match) => match[1]!.toLowerCase(),
  );
}

export function pageDataImages(html: string) {
  return Array.from(html.matchAll(/\bimage\s*:\s*["']([^"']+)["']/gi)).map(
    (match) => decodeJsString(match[1]!),
  );
}

export function scriptObjectStringValue(html: string, key: string) {
  const escaped = escapeRegExp(key);
  const match = html.match(
    new RegExp(`\\b${escaped}\\b\\s*:\\s*["']([^"']+)["']`, "i"),
  );
  return match?.[1] ? decodeJsString(match[1]) : null;
}

export function decodedChapterImageSources(html: string) {
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

export function quotedStrings(value: string) {
  return Array.from(value.matchAll(/["']([^"']+)["']/g)).map(
    (match) => match[1]!,
  );
}
