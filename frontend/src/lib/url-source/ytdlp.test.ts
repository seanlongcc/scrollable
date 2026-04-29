import { describe, expect, it } from "vitest";

import {
  ytDlpCommandCandidates,
  ytDlpFailureDiagnostic,
  ytDlpInfoToRuntimeItems,
  ytDlpInfoToRuntimeResolution,
} from "./ytdlp";

describe("ytDlpCommandCandidates", () => {
  it("uses YTDLP_PATH before bundled or shell candidates", () => {
    expect(
      ytDlpCommandCandidates({
        cwd: "/vercel/path0/frontend",
        env: { YTDLP_PATH: "/opt/bin/yt-dlp" },
        platform: "linux",
      }),
    ).toEqual([{ command: "/opt/bin/yt-dlp", args: [] }]);
  });

  it("tries the bundled production binary before shell fallbacks", () => {
    expect(
      ytDlpCommandCandidates({
        cwd: "/vercel/path0/frontend",
        env: {},
        platform: "linux",
      }),
    ).toEqual([
      {
        command:
          "/vercel/path0/frontend/node_modules/youtube-dl-exec/bin/yt-dlp",
        args: [],
      },
      {
        command: "/vercel/path0/node_modules/youtube-dl-exec/bin/yt-dlp",
        args: [],
      },
      { command: "yt-dlp", args: [] },
      { command: "python3", args: ["-m", "yt_dlp"] },
      { command: "python", args: ["-m", "yt_dlp"] },
    ]);
  });
});

describe("ytDlpFailureDiagnostic", () => {
  it("classifies blocked upstream failures without logging full URLs", () => {
    expect(
      ytDlpFailureDiagnostic({
        url: "https://weverse.io/stayc/live/3-226763714",
        candidate: { command: "/app/node_modules/.bin/yt-dlp", args: [] },
        error: new Error(
          "ERROR: [weverse] 3-226763714: HTTP Error 403: Forbidden https://weverse-rmcnmv.akamaized.net/video.mp4?__gda__=secret",
        ),
      }),
    ).toEqual({
      event: "yt_dlp_resolution_failed",
      sourceHost: "weverse.io",
      candidate: "yt-dlp",
      reason: "upstream_forbidden",
      detail: "ERROR: [weverse] 3-226763714: HTTP Error 403: Forbidden [url]",
    });
  });

  it("uses candidate args to identify python module fallbacks", () => {
    expect(
      ytDlpFailureDiagnostic({
        url: "https://example.com/video",
        candidate: { command: "python3", args: ["-m", "yt_dlp"] },
        error: new Error("yt_dlp_invalid_json"),
      }),
    ).toMatchObject({
      sourceHost: "example.com",
      candidate: "python3 -m yt_dlp",
      reason: "invalid_json",
    });
  });
});

describe("ytDlpInfoToRuntimeItems", () => {
  it("returns a YouTube iframe when yt-dlp unwraps a YouTube video from another URL", () => {
    const resolution = ytDlpInfoToRuntimeResolution(
      "https://www.reddit.com/r/kpop/comments/1sv370n/le_sserafim_sakura_celebration_dance_challenge/",
      {
        extractor_key: "Youtube",
        id: "sr_8I7Pia6U",
        title: "LE SSERAFIM SAKURA - CELEBRATION (Dance Challenge)",
        thumbnail: "https://i.ytimg.com/vi/sr_8I7Pia6U/maxresdefault.jpg",
        formats: [
          {
            url: "https://googlevideo.test/low.mp4",
            ext: "mp4",
            vcodec: "avc1.42001E",
            acodec: "mp4a.40.2",
            width: 360,
            height: 640,
          },
        ],
      },
    );

    expect(resolution).toEqual({
      provider: "youtube",
      title: "LE SSERAFIM SAKURA - CELEBRATION (Dance Challenge)",
      iframeUrl:
        "https://www.youtube.com/embed/sr_8I7Pia6U?autoplay=1&mute=1&playsinline=1",
      metadata: {
        thumbnailUrl: "https://i.ytimg.com/vi/sr_8I7Pia6U/maxresdefault.jpg",
      },
    });
  });

  it("maps an HLS format to a runtime video item", () => {
    const items = ytDlpInfoToRuntimeItems(
      "https://weverse.io/stayc/live/3-226763714",
      {
        title: "STAYC live",
        timestamp: 1777080000,
        age_limit: 0,
        formats: [
          {
            url: "https://stream.test/master.m3u8",
            protocol: "m3u8_native",
            ext: "mp4",
            width: 1920,
            height: 1080,
            extra_param_to_segment_url: "__gda__=signed-token",
          },
        ],
      },
    );

    expect(items).toEqual([
      {
        id: "url:ytdlp:efabe170affb232f",
        source: "url",
        title: "STAYC live",
        isNsfw: false,
        createdAt: "2026-04-25T01:20:00.000Z",
        media: [
          {
            type: "video",
            url: "https://stream.test/master.m3u8",
            width: 1920,
            height: 1080,
            isHls: true,
            hlsSegmentQuery: "__gda__=signed-token",
          },
        ],
      },
    ]);
  });

  it("ignores video-only direct formats and keeps combined browser video", () => {
    const items = ytDlpInfoToRuntimeItems("https://video.example/watch/123", {
      title: "Generic video",
      formats: [
        {
          url: "https://cdn.test/video-only.mp4",
          ext: "mp4",
          vcodec: "avc1.640028",
          acodec: "none",
          height: 1080,
        },
        {
          url: "https://cdn.test/combined.mp4",
          ext: "mp4",
          vcodec: "avc1.64001f",
          acodec: "mp4a.40.2",
          height: 720,
        },
      ],
    });

    expect(items[0]?.media).toEqual([
      {
        type: "video",
        url: "https://cdn.test/combined.mp4",
        height: 720,
      },
    ]);
  });

  it("prefers browser-playable H.264 TikTok formats over H.265", () => {
    const items = ytDlpInfoToRuntimeItems(
      "https://www.tiktok.com/@gogo.cosplaylife/video/7611467568305540365",
      {
        title: "TikTok video",
        formats: [
          {
            url: "https://v19.tiktokcdn.test/h265.mp4",
            ext: "mp4",
            vcodec: "h265",
            acodec: "aac",
            width: 720,
            height: 1280,
            tbr: 559,
          },
          {
            url: "https://v19.tiktokcdn.test/h264.mp4",
            ext: "mp4",
            vcodec: "h264",
            acodec: "aac",
            width: 720,
            height: 1280,
            tbr: 681,
          },
        ],
      },
    );

    expect(items[0]?.media).toEqual([
      {
        type: "video",
        url: "https://v19.tiktokcdn.test/h264.mp4",
        width: 720,
        height: 1280,
      },
    ]);
  });

  it("prefers combined Twitter MP4 over video-only HLS renditions", () => {
    const items = ytDlpInfoToRuntimeItems(
      "https://x.com/iconicstayc/status/2047918257261150588",
      {
        title: "Twitter video",
        formats: [
          {
            url: "https://video.twimg.com/video-only.m3u8",
            protocol: "m3u8_native",
            ext: "mp4",
            vcodec: "avc1.640033",
            acodec: "none",
            width: 3240,
            height: 2160,
          },
          {
            url: "https://video.twimg.com/combined.mp4",
            protocol: "https",
            ext: "mp4",
            vcodec: "avc1.640033",
            acodec: "aac",
            width: 3240,
            height: 2160,
          },
        ],
      },
    );

    expect(items[0]?.media).toEqual([
      {
        type: "video",
        url: "https://video.twimg.com/combined.mp4",
        width: 3240,
        height: 2160,
      },
    ]);
  });

  it("returns no items when yt-dlp exposes no browser-playable media", () => {
    const items = ytDlpInfoToRuntimeItems("https://video.example/watch/empty", {
      title: "Empty",
      formats: [
        {
          url: "https://cdn.test/video.mpd",
          protocol: "dash",
          ext: "mpd",
        },
      ],
    });

    expect(items).toEqual([]);
  });
});
