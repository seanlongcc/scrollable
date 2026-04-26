import type { GalleryFetchLike } from "./gallery-types";

export async function fetchHtml(
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

export async function fetchText(
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

export async function fetchJson(
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
