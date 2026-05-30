import type { RuntimeMedia } from "@/lib/feed/types";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type FetchRedditMediaEmbedOptions = {
  fetch?: FetchLike;
  userAgent?: string;
};

export async function fetchRedditMediaEmbed(
  postId: string,
  options: FetchRedditMediaEmbedOptions = {},
): Promise<RuntimeMedia | null> {
  if (!/^[a-z0-9]+$/i.test(postId)) return null;

  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(
    `https://www.redditmedia.com/mediaembed/${encodeURIComponent(postId)}`,
    {
      headers: {
        ...(options.userAgent ? { "User-Agent": options.userAgent } : {}),
      },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  return redditMediaEmbedHtmlToMedia(await response.text());
}

export function redditMediaEmbedHtmlToMedia(html: string): RuntimeMedia | null {
  const tag = html.match(
    /<[^>]+\bdata-hls-url\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)[^>]*>/i,
  )?.[0];
  if (!tag) return null;

  const hlsUrl = htmlAttribute(tag, "data-hls-url");
  if (!hlsUrl) return null;

  return {
    type: "video",
    url: hlsUrl,
    isHls: true,
    ...optionalDimension("width", htmlAttribute(tag, "data-video-width")),
    ...optionalDimension("height", htmlAttribute(tag, "data-video-height")),
  };
}

export function isRedditHostedVideoUrl(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase().replace(/^www\./, "") === "v.redd.it";
  } catch {
    return false;
  }
}

function optionalDimension(name: "width" | "height", value: string | null) {
  const dimension = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isFinite(dimension) && dimension > 0
    ? { [name]: dimension }
    : {};
}

function htmlAttribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  const value = match?.[2] ?? match?.[3] ?? match?.[4];

  return value ? decodeHtmlEntities(value) : null;
}

function decodeHtmlEntities(value: string) {
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
