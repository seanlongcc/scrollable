import { describe, expect, it } from "vitest";

import { appendHlsSegmentQuery, chooseVideoPlayback } from "./video";

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

  it("uses hls.js for signed HLS even when native HLS exists", () => {
    expect(
      chooseVideoPlayback({
        url: "https://cdn.test/playlist.m3u8",
        isHls: true,
        canPlayNativeHls: true,
        hlsSegmentQuery: "__gda__=signed-token",
      }),
    ).toEqual({
      mode: "hls.js",
      src: "https://cdn.test/playlist.m3u8",
    });
  });
});

describe("appendHlsSegmentQuery", () => {
  it("appends missing signed params to HLS segment URLs", () => {
    expect(
      appendHlsSegmentQuery(
        "https://stream.test/path/segment-000000.ts",
        "__gda__=signed-token",
      ),
    ).toBe("https://stream.test/path/segment-000000.ts?__gda__=signed-token");
  });

  it("keeps existing params and does not duplicate signed params", () => {
    expect(
      appendHlsSegmentQuery(
        "https://stream.test/path/segment-000000.ts?range=1&__gda__=signed-token",
        "__gda__=signed-token&hdnts=second-token",
      ),
    ).toBe(
      "https://stream.test/path/segment-000000.ts?range=1&__gda__=signed-token&hdnts=second-token",
    );
  });
});
