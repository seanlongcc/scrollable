export type VideoPlaybackInput = {
  url: string;
  isHls?: boolean;
  canPlayNativeHls?: boolean;
  hlsSegmentQuery?: string;
};

export type VideoPlayback =
  | { mode: "native"; src: string }
  | { mode: "hls.js"; src: string };

export function chooseVideoPlayback(input: VideoPlaybackInput): VideoPlayback {
  const isHls = input.isHls ?? input.url.includes(".m3u8");

  if (isHls && (input.hlsSegmentQuery || !input.canPlayNativeHls)) {
    return { mode: "hls.js", src: input.url };
  }

  return { mode: "native", src: input.url };
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
