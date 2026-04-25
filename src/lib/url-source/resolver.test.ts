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
      iframeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
    expect(fetchMock).not.toHaveBeenCalled();
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
      iframeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
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
