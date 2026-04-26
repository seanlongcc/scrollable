import { describe, expect, it, vi } from "vitest";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import { resolveUrlSource } from "./resolver";

const redditItem: RuntimeFeedItem = {
  id: "reddit:abc123",
  source: "reddit",
  title: "Reddit image",
  subreddit: "pics",
  isNsfw: false,
  createdAt: "2026-04-25T00:00:00.000Z",
  media: [{ type: "image", url: "https://i.redd.it/runtime.jpg" }],
};

const galleryItem: RuntimeFeedItem = {
  id: "url:gallery:abc123",
  source: "url",
  title: "Gallery image",
  isNsfw: true,
  createdAt: "2026-04-25T00:00:00.000Z",
  media: [{ type: "image", url: "https://i.nhentai.net/galleries/1/1.jpg" }],
};

describe("resolveUrlSource", () => {
  it("uses direct media before a known provider", async () => {
    const redditResolver = vi.fn(async () => [redditItem]);

    const result = await resolveUrlSource(
      { kind: "url", url: "https://www.reddit.com/gallery/photo.jpg" },
      { redditResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "direct-media",
      hint: "direct-media",
    });
    expect(redditResolver).not.toHaveBeenCalled();
  });

  it("uses provider adapters before generic metadata", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<title>Metadata</title>"),
    );
    const redditResolver = vi.fn(async () => [redditItem]);

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://www.reddit.com/r/pics/comments/abc123/title/",
      },
      { fetch: fetchMock, redditResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:reddit",
      provider: "reddit",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls through to yt-dlp when a Reddit post has no native Reddit media", async () => {
    const redditResolver = vi.fn(async () => {
      throw new Error("reddit_source_has_no_supported_media");
    });
    const ytDlpResolver = vi.fn(async () => [
      {
        id: "url:ytdlp:embedded-youtube",
        source: "url" as const,
        title: "LE SSERAFIM SAKURA - CELEBRATION (Dance Challenge)",
        isNsfw: false,
        createdAt: "2026-04-25T00:00:00.000Z",
        media: [
          {
            type: "video" as const,
            url: "https://googlevideo.test/videoplayback.mp4",
            width: 360,
            height: 640,
          },
        ],
      },
    ]);

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://www.reddit.com/r/kpop/comments/1sv370n/le_sserafim_sakura_celebration_dance_challenge/",
      },
      { redditResolver, ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:yt-dlp",
      provider: "yt-dlp",
      title: "LE SSERAFIM SAKURA - CELEBRATION (Dance Challenge)",
      items: [
        {
          media: [
            {
              type: "video",
              url: "https://googlevideo.test/videoplayback.mp4",
              width: 360,
              height: 640,
            },
          ],
        },
      ],
    });
    expect(redditResolver).toHaveBeenCalledWith(
      "https://www.reddit.com/r/kpop/comments/1sv370n/le_sserafim_sakura_celebration_dance_challenge/",
    );
    expect(ytDlpResolver).toHaveBeenCalledWith(
      "https://www.reddit.com/r/kpop/comments/1sv370n/le_sserafim_sakura_celebration_dance_challenge/",
    );
  });

  it("uses a YouTube provider embed before metadata and iframe fallback", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<title>Metadata</title>"),
    );

    const result = await resolveUrlSource(
      { kind: "url", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { fetch: fetchMock },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:youtube",
      provider: "youtube",
      title: "YouTube video",
      iframeUrl:
        "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&playsinline=1",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses gallery provider extraction before yt-dlp and metadata", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<title>Metadata should not win</title>"),
    );
    const galleryResolver = vi.fn(async () => [galleryItem]);
    const ytDlpResolver = vi.fn(async () => [
      {
        id: "url:ytdlp:gallery",
        source: "url" as const,
        title: "Video should not win",
        isNsfw: false,
        createdAt: "2026-04-25T00:00:00.000Z",
        media: [{ type: "video" as const, url: "https://cdn.test/v.mp4" }],
      },
    ]);

    const result = await resolveUrlSource(
      { kind: "url", url: "https://nhentai.net/g/123456/" },
      { fetch: fetchMock, galleryResolver, ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:gallery",
      provider: "gallery",
      title: "Gallery image",
      items: [
        {
          media: [
            {
              type: "image",
              url: "https://i.nhentai.net/galleries/1/1.jpg",
            },
          ],
        },
      ],
    });
    expect(result.nextResolverHint).toBe("provider:gallery");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(galleryResolver).toHaveBeenCalledWith(
      "https://nhentai.net/g/123456/",
    );
    expect(ytDlpResolver).not.toHaveBeenCalled();
  });

  it("uses a Hitomi iframe provider instead of direct gallery images", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<title>Metadata should not win</title>"),
    );
    const galleryResolver = vi.fn(async () => [
      {
        ...galleryItem,
        media: [
          {
            type: "image" as const,
            url: "https://w1.gold-usergeneratedcontent.net/path/page.webp",
          },
        ],
      },
    ]);
    const hitomiUrl =
      "https://hitomi.la/cg/the-weak-soccer-club-trampled-under-the-feet-of-the-dance-club-girls-3-english-3887944.html#1";

    const result = await resolveUrlSource(
      { kind: "url", url: hitomiUrl, title: "Hitomi sample" },
      { fetch: fetchMock, galleryResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:hitomi",
      provider: "hitomi",
      title: "Hitomi sample",
      externalUrl: hitomiUrl,
      iframeUrl: hitomiUrl,
    });
    expect(result.nextResolverHint).toBe("provider:hitomi");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(galleryResolver).not.toHaveBeenCalled();
  });

  it("tries a saved gallery provider hint before generic metadata", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<title>Metadata should not win</title>"),
    );
    const galleryResolver = vi.fn(async () => [galleryItem]);

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://example.com/gallery/123",
        resolverHint: "provider:gallery",
      },
      { fetch: fetchMock, galleryResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:gallery",
      provider: "gallery",
      title: "Gallery image",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(galleryResolver).toHaveBeenCalledWith(
      "https://example.com/gallery/123",
    );
  });

  it("falls back to metadata when gallery extraction finds no images", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<html><head><title>Gallery metadata</title></head></html>"),
    );
    const galleryResolver = vi.fn(async () => []);
    const ytDlpResolver = vi.fn(async () => []);

    const result = await resolveUrlSource(
      { kind: "url", url: "https://nhentai.net/g/empty/" },
      { fetch: fetchMock, galleryResolver, ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "metadata",
      hint: "metadata",
      title: "Gallery metadata",
    });
    expect(galleryResolver).toHaveBeenCalledWith(
      "https://nhentai.net/g/empty/",
    );
    expect(ytDlpResolver).toHaveBeenCalledWith("https://nhentai.net/g/empty/");
  });

  it("does not iframe a known gallery host when gallery extraction fails", async () => {
    const fetchMock = vi.fn(async () => emptyResponse(403));
    const galleryResolver = vi.fn(async () => []);
    const ytDlpResolver = vi.fn(async () => []);

    const result = await resolveUrlSource(
      { kind: "url", url: "https://nhentai.net/g/123456/" },
      { fetch: fetchMock, galleryResolver, ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "unsupported",
      title: "123456",
      externalUrl: "https://nhentai.net/g/123456/",
      reason: "url_source_unsupported",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses yt-dlp provider extraction before generic metadata", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<title>Metadata should not win</title>"),
    );
    const ytDlpResolver = vi.fn(async () => [
      {
        id: "url:ytdlp:https://weverse.io/stayc/live/3-226763714",
        source: "url" as const,
        title: "STAYC live",
        isNsfw: false,
        createdAt: "2026-04-25T00:00:00.000Z",
        media: [
          {
            type: "video" as const,
            url: "https://stream.test/master.m3u8",
            isHls: true,
          },
        ],
      },
    ]);

    const result = await resolveUrlSource(
      { kind: "url", url: "https://weverse.io/stayc/live/3-226763714" },
      { fetch: fetchMock, ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:yt-dlp",
      provider: "yt-dlp",
      title: "STAYC live",
      items: [
        {
          media: [
            {
              type: "video",
              url: "https://stream.test/master.m3u8",
              isHls: true,
            },
          ],
        },
      ],
    });
    expect(result.nextResolverHint).toBe("provider:yt-dlp");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://weverse.io/stayc/live/3-226763714",
      { method: "HEAD", cache: "no-store" },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(ytDlpResolver).toHaveBeenCalledWith(
      "https://weverse.io/stayc/live/3-226763714",
    );
  });

  it("tries a saved yt-dlp provider hint before generic metadata", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<title>Should not win</title>"),
    );
    const ytDlpResolver = vi.fn(async () => [
      {
        id: "url:ytdlp:https://video.example/watch/123",
        source: "url" as const,
        title: "Generic video",
        isNsfw: false,
        createdAt: "2026-04-25T00:00:00.000Z",
        media: [{ type: "video" as const, url: "https://cdn.test/v.mp4" }],
      },
    ]);

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://video.example/watch/123",
        resolverHint: "provider:yt-dlp",
      },
      { fetch: fetchMock, ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:yt-dlp",
      provider: "yt-dlp",
      title: "Generic video",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to metadata when yt-dlp finds no playable media", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse(
        "<html><head><title>Metadata fallback</title></head></html>",
      ),
    );
    const ytDlpResolver = vi.fn(async () => []);

    const result = await resolveUrlSource(
      { kind: "url", url: "https://video.example/watch/empty" },
      { fetch: fetchMock, ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "metadata",
      hint: "metadata",
      title: "Metadata fallback",
    });
    expect(ytDlpResolver).toHaveBeenCalledWith(
      "https://video.example/watch/empty",
    );
  });

  it("uses an Instagram embed when yt-dlp exposes no direct media", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<title>Metadata should not win</title>"),
    );
    const ytDlpResolver = vi.fn(async () => []);

    const result = await resolveUrlSource(
      { kind: "url", url: "https://www.instagram.com/p/DXel_SUEX9r/" },
      { fetch: fetchMock, ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:instagram",
      provider: "instagram",
      iframeUrl: "https://www.instagram.com/p/DXel_SUEX9r/embed",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses yt-dlp media for Instagram before the social embed fallback", async () => {
    const ytDlpResolver = vi.fn(async () => [
      {
        id: "url:ytdlp:instagram",
        source: "url" as const,
        title: "Instagram direct video",
        isNsfw: false,
        createdAt: "2026-04-25T00:00:00.000Z",
        media: [
          {
            type: "video" as const,
            url: "https://scontent.cdninstagram.test/video.mp4",
          },
        ],
      },
    ]);

    const result = await resolveUrlSource(
      { kind: "url", url: "https://www.instagram.com/reel/DXel_SUEX9r/" },
      { ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:yt-dlp",
      provider: "yt-dlp",
      title: "Instagram direct video",
      items: [
        {
          media: [
            {
              type: "video",
              url: "https://scontent.cdninstagram.test/video.mp4",
            },
          ],
        },
      ],
    });
    expect(ytDlpResolver).toHaveBeenCalledWith(
      "https://www.instagram.com/reel/DXel_SUEX9r/",
    );
  });

  it("uses the TikTok embed before yt-dlp direct media", async () => {
    const ytDlpResolver = vi.fn(async () => [
      {
        id: "url:ytdlp:tiktok",
        source: "url" as const,
        title: "TikTok direct video",
        isNsfw: false,
        createdAt: "2026-04-25T00:00:00.000Z",
        media: [
          {
            type: "video" as const,
            url: "https://v16-webapp-prime.us.tiktok.com/video.mp4",
          },
        ],
      },
    ]);

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://www.tiktok.com/@gogo.cosplaylife/video/7611467568305540365?is_from_webapp=1&sender_device=pc",
      },
      { ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:tiktok",
      provider: "tiktok",
      title: "TikTok video",
      iframeUrl: "https://www.tiktok.com/embed/v2/7611467568305540365",
    });
    expect(ytDlpResolver).not.toHaveBeenCalled();
  });

  it("uses the TikTok embed when yt-dlp exposes no direct media", async () => {
    const ytDlpResolver = vi.fn(async () => []);

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://www.tiktok.com/@gogo.cosplaylife/video/7611467568305540365?is_from_webapp=1&sender_device=pc",
      },
      { ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:tiktok",
      provider: "tiktok",
      iframeUrl: "https://www.tiktok.com/embed/v2/7611467568305540365",
    });
  });

  it("uses yt-dlp media for Twitter/X before the social embed fallback", async () => {
    const ytDlpResolver = vi.fn(async () => [
      {
        id: "url:ytdlp:twitter",
        source: "url" as const,
        title: "Twitter direct video",
        isNsfw: false,
        createdAt: "2026-04-25T00:00:00.000Z",
        media: [
          {
            type: "video" as const,
            url: "https://video.twimg.com/amplify_video.mp4",
          },
        ],
      },
    ]);

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://x.com/iconicstayc/status/2047918257261150588",
      },
      { ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:yt-dlp",
      provider: "yt-dlp",
      title: "Twitter direct video",
      items: [
        {
          media: [
            {
              type: "video",
              url: "https://video.twimg.com/amplify_video.mp4",
            },
          ],
        },
      ],
    });
  });

  it("does not let a saved iframe hint pin social URLs to the full page", async () => {
    const ytDlpResolver = vi.fn(async () => [
      {
        id: "url:ytdlp:saved-social",
        source: "url" as const,
        title: "Saved social direct video",
        isNsfw: false,
        createdAt: "2026-04-25T00:00:00.000Z",
        media: [
          {
            type: "video" as const,
            url: "https://video.twimg.com/saved.mp4",
          },
        ],
      },
    ]);

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://twitter.com/iconicstayc/status/2047918257261150588",
        resolverHint: "iframe",
      },
      { ytDlpResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:yt-dlp",
      provider: "yt-dlp",
      items: [
        {
          media: [
            {
              type: "video",
              url: "https://video.twimg.com/saved.mp4",
            },
          ],
        },
      ],
    });
  });

  it("tries a saved YouTube provider hint before generic metadata", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<title>Should not win</title>"),
    );

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://youtu.be/dQw4w9WgXcQ",
        resolverHint: "provider:youtube",
      },
      { fetch: fetchMock },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      hint: "provider:youtube",
      iframeUrl:
        "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&playsinline=1",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses metadata before iframe fallback", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse(
        '<html><head><meta property="og:title" content="OG title"><meta name="description" content="Summary"></head></html>',
      ),
    );

    const result = await resolveUrlSource(
      { kind: "url", url: "https://example.com/article" },
      { fetch: fetchMock },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "metadata",
      hint: "metadata",
      metadata: {
        title: "OG title",
        description: "Summary",
      },
    });
  });

  it("tries a saved resolver hint first", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<html><head><title>Hinted metadata</title></head></html>"),
    );
    const redditResolver = vi.fn(async () => [redditItem]);

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://www.reddit.com/r/pics/comments/abc123/title/",
        resolverHint: "metadata",
      },
      { fetch: fetchMock, redditResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "metadata",
      hint: "metadata",
    });
    expect(redditResolver).not.toHaveBeenCalled();
  });

  it("falls back to the full chain when a saved hint fails", async () => {
    const fetchMock = vi.fn(async () => emptyResponse(404));
    const redditResolver = vi.fn(async () => [redditItem]);

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://www.reddit.com/r/pics/comments/abc123/title/",
        resolverHint: "metadata",
      },
      { fetch: fetchMock, redditResolver },
    );

    expect(result.resolution).toMatchObject({
      status: "resolved",
      mode: "provider",
      hint: "provider:reddit",
    });
    expect(result.nextResolverHint).toBe("provider:reddit");
  });

  it("does not update the resolver hint after unsupported resolution", async () => {
    const fetchMock = vi.fn(async () => emptyResponse(403));

    const result = await resolveUrlSource(
      {
        kind: "url",
        url: "https://blocked.example/page",
        resolverHint: "metadata",
      },
      { fetch: fetchMock, allowIframeFallback: false },
    );

    expect(result.resolution).toMatchObject({
      status: "unsupported",
      reason: "url_source_unsupported",
    });
    expect(result.nextResolverHint).toBeUndefined();
  });
});

function htmlResponse(html: string) {
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function emptyResponse(status: number) {
  return new Response("", { status });
}
