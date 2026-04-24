import { describe, expect, it } from "vitest";

import { chooseVideoPlayback } from "./video";

describe("chooseVideoPlayback", () => {
  it("uses native playback for regular videos", () => {
    expect(chooseVideoPlayback({ url: "https://cdn.test/video.mp4" })).toEqual({
      mode: "native",
      src: "https://cdn.test/video.mp4",
    });
  });

  it("uses hls.js for HLS when native support is unavailable", () => {
    expect(
      chooseVideoPlayback({
        url: "https://cdn.test/playlist.m3u8",
        isHls: true,
        canPlayNativeHls: false,
      }),
    ).toEqual({
      mode: "hls.js",
      src: "https://cdn.test/playlist.m3u8",
    });
  });
});
