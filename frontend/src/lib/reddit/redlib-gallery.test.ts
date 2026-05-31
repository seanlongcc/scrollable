import { describe, expect, it } from "vitest";

import {
  redlibGalleryHtmlToMedia,
  redlibListingHtmlToItems,
} from "./redlib-gallery";

describe("redlibGalleryHtmlToMedia", () => {
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

  it("extracts Redlib listing posts with NSFW videos and images", () => {
    const items = redlibListingHtmlToItems(
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
});
