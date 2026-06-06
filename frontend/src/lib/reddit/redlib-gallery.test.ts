import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchRedlibListingItems,
  redlibGalleryHtmlToMedia,
  redlibListingHtmlToItems,
} from "./redlib-gallery";

describe("redlibGalleryHtmlToMedia", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("extracts gallery images as original Reddit CDN URLs", () => {
    const media = redlibGalleryHtmlToMedia(`
      <div class="gallery">
        <figure>
          <a href="/preview/pre/first.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=one">
            <img loading="lazy" alt="Gallery image" src="/preview/pre/first.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=one"/>
          </a>
        </figure>
        <figure>
          <a href="/preview/pre/second.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=two">
            <img loading="lazy" alt="Gallery image" src="/preview/pre/second.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=two"/>
          </a>
        </figure>
      </div>
    `);

    expect(media).toEqual([
      {
        type: "image",
        url: "https://i.redd.it/first.jpg",
        galleryIndex: 0,
      },
      {
        type: "image",
        url: "https://i.redd.it/second.jpg",
        galleryIndex: 1,
      },
    ]);
  });

  it("extracts current Redlib gallery images served from img anchors", () => {
    const media = redlibGalleryHtmlToMedia(`
      <div class="gallery">
        <figure>
          <a href="/img/first.gif">
            <img loading="lazy" alt="Gallery image" src="/img/first.gif"/>
          </a>
        </figure>
        <figure>
          <a href="/img/second.gif">
            <img loading="lazy" alt="Gallery image" src="/img/second.gif"/>
          </a>
        </figure>
        <figure>
          <a href="/img/third.gif">
            <img loading="lazy" alt="Gallery image" src="/img/third.gif"/>
          </a>
        </figure>
      </div>
    `);

    expect(media).toEqual([
      {
        type: "image",
        url: "https://i.redd.it/first.gif",
        galleryIndex: 0,
      },
      {
        type: "image",
        url: "https://i.redd.it/second.gif",
        galleryIndex: 1,
      },
      {
        type: "image",
        url: "https://i.redd.it/third.gif",
        galleryIndex: 2,
      },
    ]);
  });

  it("extracts Redlib listing posts with NSFW videos and images", async () => {
    const items = await redlibListingHtmlToItems(
      `
        <div id="posts">
          <hr class="sep" />
          <div class="post" id="video123">
            <p class="post_header">
              <a class="post_subreddit" href="/r/kpopfap">r/kpopfap</a>
              <a class="post_author" href="/u/poster">u/poster</a>
              <span class="created" title="May 29 2026, 11:45:33 UTC">1d ago</span>
            </p>
            <h2 class="post_title">
              <a href="/r/kpopfap/comments/video123/winter_aespa/">Winter - aespa</a> <small class="nsfw">NSFW</small>
            </h2>
            <video class="post_media_video short" width="480" height="854">
              <source src="/hls/video-media-id/HLSPlaylist.m3u8" type="application/vnd.apple.mpegurl" />
            </video>
          </div>
          <hr class="sep" />
          <div class="post" id="image123">
            <p class="post_header">
              <a class="post_subreddit" href="/r/kpopfap">r/kpopfap</a>
            </p>
            <h2 class="post_title">
              <a href="/r/kpopfap/comments/image123/giselle_aespa/">Giselle - aespa</a> <small class="nsfw">NSFW</small>
            </h2>
            <a href="/preview/pre/image-file.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=one" class="post_media_image short">
              <img alt="Post image" src="/preview/pre/image-file.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=one"/>
            </a>
          </div>
        </div>
      `,
      {
        allowNsfw: true,
        limit: 10,
        listingUrl: "https://www.reddit.com/r/kpopfap/top/?t=week",
      },
    );

    expect(items).toMatchObject([
      {
        id: "reddit:video123",
        title: "Winter - aespa",
        permalink:
          "https://www.reddit.com/r/kpopfap/comments/video123/winter_aespa/",
        author: "poster",
        subreddit: "kpopfap",
        isNsfw: true,
        createdAt: "2026-05-29T11:45:33.000Z",
        media: [
          {
            type: "video",
            url: "https://v.redd.it/video-media-id/HLSPlaylist.m3u8",
            width: 480,
            height: 854,
            isHls: true,
          },
        ],
      },
      {
        id: "reddit:image123",
        title: "Giselle - aespa",
        media: [
          {
            type: "image",
            url: "https://i.redd.it/image-file.jpg",
          },
        ],
      },
    ]);
  });

  it("extracts current Redlib listing image posts and resolves gallery rows", async () => {
    const items = await redlibListingHtmlToItems(
      `
        <div id="posts">
          <hr class="sep" />
          <div class="post" id="gallery123">
            <p class="post_header">
              <a class="post_subreddit" href="/r/kpop">r/kpop</a>
              <a class="post_author" href="/u/gallery-poster">u/gallery-poster</a>
              <span class="created" title="May 31 2026, 17:48:46 UTC">5d ago</span>
            </p>
            <h2 class="post_title">
              <a href="/r/kpop/comments/gallery123/gallery_title/">Gallery title</a>
            </h2>
            <a class="post_thumbnail" href="/r/kpop/comments/gallery123/gallery_title/" rel="nofollow">
              <svg>
                <image href="/preview/pre/thumb.jpg?width=140&#38;height=140&#38;auto=webp"/>
                <desc>
                  <img loading="lazy" alt="Thumbnail" src="/preview/pre/thumb.jpg?width=140&#38;height=140&#38;auto=webp"/>
                </desc>
              </svg>
              <span>gallery</span>
            </a>
          </div>
          <hr class="sep" />
          <div class="post" id="image123">
            <p class="post_header">
              <a class="post_subreddit" href="/r/kpop">r/kpop</a>
            </p>
            <h2 class="post_title">
              <a href="/r/kpop/comments/image123/direct_image/">Direct image</a>
            </h2>
            <div class="post_media_content">
              <a href="/img/direct.jpeg" class="post_media_image short">
                <svg>
                  <image href="/img/direct.jpeg"/>
                  <desc>
                    <img loading="lazy" alt="Post image" src="/img/direct.jpeg"/>
                  </desc>
                </svg>
              </a>
            </div>
          </div>
        </div>
      `,
      {
        allowNsfw: true,
        limit: 10,
        listingUrl: "https://www.reddit.com/r/kpop/top/?t=week",
        resolveMedia: async ({ permalink }) =>
          permalink ===
          "https://www.reddit.com/r/kpop/comments/gallery123/gallery_title/"
            ? [
                {
                  type: "image",
                  url: "https://i.redd.it/gallery-first.jpg",
                  galleryIndex: 0,
                },
                {
                  type: "image",
                  url: "https://i.redd.it/gallery-second.jpg",
                  galleryIndex: 1,
                },
              ]
            : [],
      },
    );

    expect(items).toMatchObject([
      {
        id: "reddit:gallery123",
        title: "Gallery title",
        media: [
          { url: "https://i.redd.it/gallery-first.jpg", galleryIndex: 0 },
          { url: "https://i.redd.it/gallery-second.jpg", galleryIndex: 1 },
        ],
      },
      {
        id: "reddit:image123",
        title: "Direct image",
        media: [{ type: "image", url: "https://i.redd.it/direct.jpeg" }],
      },
    ]);
  });

  it("passes the runtime fetch limit to Redlib listing requests", async () => {
    vi.stubEnv("REDDIT_REDLIB_ORIGIN", "https://redlib.test");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({
      ok: String(input).startsWith("https://redlib.test"),
      text: async () => '<div id="posts"></div>',
    }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchRedlibListingItems({
      allowNsfw: true,
      limit: 50,
      listingUrl: "https://www.reddit.com/r/kpop/top/?t=week",
      userAgent: "test-agent",
    });

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain(
      "https://redlib.test/r/kpop/top/?t=week&limit=50",
    );
  });

  it("caps Redlib listing requests at Redlib's stable listing limit", async () => {
    vi.stubEnv("REDDIT_REDLIB_ORIGIN", "https://redlib.test");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({
      ok: String(input).startsWith("https://redlib.test"),
      text: async () => '<div id="posts"></div>',
    }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchRedlibListingItems({
      allowNsfw: true,
      limit: 58,
      listingUrl: "https://www.reddit.com/r/kpop/top/?t=week",
      userAgent: "test-agent",
    });

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain(
      "https://redlib.test/r/kpop/top/?t=week&limit=50",
    );
  });

  it("skips 200 Redlib listing pages that do not contain post blocks", async () => {
    vi.stubEnv("REDDIT_REDLIB_ORIGIN", "https://empty.test,https://posts.test");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://empty.test")) {
        return {
          ok: true,
          text: async () => "<html><title>Empty shell</title></html>",
        };
      }

      if (url.startsWith("https://posts.test")) {
        return {
          ok: true,
          text: async () => `
            <div id="posts">
              <hr class="sep" />
              <div class="post" id="image123">
                <p class="post_header">
                  <a class="post_subreddit" href="/r/kpop">r/kpop</a>
                </p>
                <h2 class="post_title">
                  <a href="/r/kpop/comments/image123/direct_image/">Direct image</a>
                </h2>
                <div class="post_media_content">
                  <a href="/img/direct.jpeg" class="post_media_image short">
                    <img loading="lazy" alt="Post image" src="/img/direct.jpeg"/>
                  </a>
                </div>
              </div>
            </div>
          `,
        };
      }

      return {
        ok: false,
        status: 403,
        text: async () => "",
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const items = await fetchRedlibListingItems({
      allowNsfw: true,
      limit: 10,
      listingUrl: "https://www.reddit.com/r/kpop/top/?t=week",
      userAgent: "test-agent",
    });

    expect(items).toMatchObject([
      {
        id: "reddit:image123",
        media: [{ url: "https://i.redd.it/direct.jpeg" }],
      },
    ]);
  });

  it("resolves Redlib listing gallery rows in parallel while preserving order", async () => {
    const pending: Array<{
      permalink: string;
      resolve: (
        media: Awaited<
          ReturnType<
            NonNullable<
              Parameters<typeof redlibListingHtmlToItems>[1]["resolveMedia"]
            >
          >
        >,
      ) => void;
    }> = [];
    const request = redlibListingHtmlToItems(
      `
        <div id="posts">
          <hr class="sep" />
          <div class="post" id="first">
            <h2 class="post_title"><a href="/r/kpop/comments/first/first_gallery/">First gallery</a></h2>
            <a class="post_thumbnail" href="/r/kpop/comments/first/first_gallery/"><span>gallery</span></a>
          </div>
          <hr class="sep" />
          <div class="post" id="second">
            <h2 class="post_title"><a href="/r/kpop/comments/second/second_gallery/">Second gallery</a></h2>
            <a class="post_thumbnail" href="/r/kpop/comments/second/second_gallery/"><span>gallery</span></a>
          </div>
        </div>
      `,
      {
        allowNsfw: true,
        limit: 10,
        listingUrl: "https://www.reddit.com/r/kpop/top/?t=week",
        resolveMedia: ({ permalink }) =>
          new Promise((resolve) => pending.push({ permalink, resolve })),
      },
    );

    await waitForPendingResolvers(pending, 2);
    pending[1]?.resolve([
      { type: "image", url: "https://i.redd.it/second.jpg" },
    ]);
    pending[0]?.resolve([
      { type: "image", url: "https://i.redd.it/first.jpg" },
    ]);

    const items = await request;
    expect(pending.map(({ permalink }) => permalink)).toEqual([
      "https://www.reddit.com/r/kpop/comments/first/first_gallery/",
      "https://www.reddit.com/r/kpop/comments/second/second_gallery/",
    ]);
    expect(items.map((item) => item.id)).toEqual([
      "reddit:first",
      "reddit:second",
    ]);
  });
});

async function waitForPendingResolvers(
  pending: Array<unknown>,
  expectedLength: number,
) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (pending.length >= expectedLength) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error(`Expected ${expectedLength} pending resolvers`);
}
