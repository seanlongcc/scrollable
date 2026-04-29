import type { UrlResolvedRuntimeResolution, UrlSourceConfig } from "./types";
import type { UrlResolverOptions } from "./resolver-types";
import { titleFromUrl } from "./resolver-title";

export async function resolveMetadata(
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
