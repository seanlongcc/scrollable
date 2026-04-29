const YOUTUBE_PLAYBACK_PARAMS = {
  autoplay: "1",
  mute: "1",
  playsinline: "1",
} as const;

export function youtubeEmbedUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);
  const videoId =
    host === "youtu.be"
      ? segments[0]
      : segments[0] === "watch"
        ? url.searchParams.get("v")
        : segments[0] === "shorts" || segments[0] === "embed"
          ? segments[1]
          : null;

  return youtubeEmbedUrlFromId(videoId, youtubeStartSeconds(url));
}

export function youtubeEmbedUrlFromId(
  videoId: string | null | undefined,
  startSeconds = 0,
) {
  if (!videoId || !/^[A-Za-z0-9_-]{6,64}$/.test(videoId)) return null;

  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
  if (startSeconds > 0) {
    embedUrl.searchParams.set("start", String(startSeconds));
  }
  for (const [key, value] of Object.entries(YOUTUBE_PLAYBACK_PARAMS)) {
    embedUrl.searchParams.set(key, value);
  }

  return embedUrl.toString();
}

function youtubeStartSeconds(url: URL) {
  const raw = url.searchParams.get("start") ?? url.searchParams.get("t");
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);

  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return 0;

  return (
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
  );
}
