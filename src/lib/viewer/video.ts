export type VideoPlaybackInput = {
  url: string;
  isHls?: boolean;
  canPlayNativeHls?: boolean;
};

export type VideoPlayback =
  | { mode: "native"; src: string }
  | { mode: "hls.js"; src: string };

export function chooseVideoPlayback(input: VideoPlaybackInput): VideoPlayback {
  const isHls = input.isHls ?? input.url.includes(".m3u8");

  if (isHls && !input.canPlayNativeHls) {
    return { mode: "hls.js", src: input.url };
  }

  return { mode: "native", src: input.url };
}
