export type VideoPlaybackInput = {
  url: string;
  isHls?: boolean;
  canPlayNativeHls?: boolean;
  hlsSegmentQuery?: string;
};

export type VideoPlayback =
  | { mode: "native"; src: string }
  | { mode: "hls.js"; src: string };

export const VIDEO_PLAYBACK_SEEK_DRIFT_SECONDS = 1.5;

export function chooseVideoPlayback(input: VideoPlaybackInput): VideoPlayback {
  const isHls = input.isHls ?? input.url.includes(".m3u8");

  if (isHls && (input.hlsSegmentQuery || !input.canPlayNativeHls)) {
    return { mode: "hls.js", src: input.url };
  }

  return { mode: "native", src: input.url };
}

export function normalizedPlaybackSeconds(seconds: number) {
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
}

export function shouldSeekToPlaybackTime({
  currentSeconds,
  targetSeconds,
  driftSeconds = VIDEO_PLAYBACK_SEEK_DRIFT_SECONDS,
}: {
  currentSeconds: number;
  targetSeconds: number;
  driftSeconds?: number;
}) {
  const normalizedTargetSeconds = normalizedPlaybackSeconds(targetSeconds);
  if (normalizedTargetSeconds <= 0) return false;
  if (!Number.isFinite(currentSeconds) || currentSeconds < 0) return true;

  return Math.abs(currentSeconds - normalizedTargetSeconds) > driftSeconds;
}

export function appendHlsSegmentQuery(url: string, query?: string) {
  if (!query) return url;

  try {
    const target = new URL(url);
    const params = new URLSearchParams(query.replace(/^\?/, ""));
    for (const [key, value] of params) {
      if (!target.searchParams.has(key)) {
        target.searchParams.set(key, value);
      }
    }

    return target.toString();
  } catch {
    return url;
  }
}
