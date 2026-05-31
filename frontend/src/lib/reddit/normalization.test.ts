import { describe, expect, it } from "vitest";

import { normalizeRedditListing } from "./normalization";

describe("normalizeRedditListing", () => {
  it("skips sticky posts before applying user slice and preserves gallery order", () => {
    const listing = {
      data: {
        children: [
          {
            data: {
              id: "sticky",
              stickied: true,
              title: "Sticky",
              subreddit: "pics",
            },
          },
          {
            data: {
              id: "skip-me",
              title: "Skip me",
              stickied: false,
              subreddit: "pics",
              permalink: "/r/pics/comments/skip",
              author: "uploader",
              created_utc: 100,
              over_18: false,
              post_hint: "image",
              url_overridden_by_dest: "https://i.redd.it/skip.jpg",
            },
          },
          {
            data: {
              id: "gallery",
              title: "Gallery",
              stickied: false,
              subreddit: "pics",
              permalink: "/r/pics/comments/gallery",
              author: "artist",
              created_utc: 200,
              over_18: false,
              is_gallery: true,
              gallery_data: {
                items: [
                  { media_id: "b", id: 0 },
                  { media_id: "a", id: 1 },
                ],
              },
              media_metadata: {
                a: {
                  status: "valid",
                  e: "Image",
                  m: "image/jpg",
                  s: { u: "https://preview.redd.it/a.jpg", x: 800, y: 600 },
                },
                b: {
                  status: "valid",
                  e: "Image",
                  m: "image/jpg",
                  s: { u: "https://preview.redd.it/b.jpg", x: 640, y: 480 },
                },
              },
            },
          },
        ],
      },
    };

    const result = normalizeRedditListing(listing, {
      subreddit: "pics",
      skip: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "reddit:gallery",
      source: "reddit",
      title: "Gallery",
      author: "artist",
      isNsfw: false,
    });
    expect(result.items[0].media.map((media) => media.url)).toEqual([
      "https://i.redd.it/b.jpg",
      "https://i.redd.it/a.jpg",
    ]);
    expect(result.items[0].media.map((media) => media.galleryIndex)).toEqual([
      0, 1,
    ]);
  });

  it("returns unsupported media IDs instead of empty items", () => {
    const result = normalizeRedditListing(
      {
        data: {
          children: [
            {
              data: {
                id: "self",
                title: "Text only",
                subreddit: "pics",
                permalink: "/r/pics/comments/self",
              },
            },
          ],
        },
      },
      { subreddit: "pics", skip: 0 },
    );

    expect(result.items).toEqual([]);
    expect(result.unsupportedIds).toEqual(["self"]);
  });

  it("filters NSFW posts when runtime NSFW allowance is disabled", () => {
    const result = normalizeRedditListing(
      {
        data: {
          children: [
            {
              data: {
                id: "nsfw",
                title: "Hidden",
                subreddit: "pics",
                over_18: true,
                post_hint: "image",
                url_overridden_by_dest: "https://i.redd.it/nsfw.jpg",
              },
            },
          ],
        },
      },
      { subreddit: "pics", allowNsfw: false },
    );

    expect(result.items).toEqual([]);
  });

  it("normalizes Reddit video HLS and decodes escaped URLs", () => {
    const result = normalizeRedditListing(
      {
        data: {
          children: [
            {
              data: {
                id: "video",
                title: "Video",
                subreddit: "videos",
                secure_media: {
                  reddit_video: {
                    hls_url: "https://v.redd.it/playlist.m3u8?a=1&amp;b=2",
                    width: 720,
                    height: 1280,
                  },
                },
              },
            },
          ],
        },
      },
      { subreddit: "videos" },
    );

    expect(result.items[0].media[0]).toMatchObject({
      type: "video",
      url: "https://v.redd.it/playlist.m3u8?a=1&b=2",
      isHls: true,
      width: 720,
      height: 1280,
    });
  });

  it("continues past unsupported items until requested media limit is filled", () => {
    const result = normalizeRedditListing(
      {
        data: {
          children: [
            { data: { id: "self", title: "Self", subreddit: "pics" } },
            {
              data: {
                id: "one",
                title: "One",
                subreddit: "pics",
                post_hint: "image",
                url: "https://i.redd.it/one.jpg",
              },
            },
            {
              data: {
                id: "two",
                title: "Two",
                subreddit: "pics",
                post_hint: "image",
                url: "https://i.redd.it/two.jpg",
              },
            },
          ],
        },
      },
      { subreddit: "pics", limit: 2 },
    );

    expect(result.items.map((item) => item.id)).toEqual([
      "reddit:one",
      "reddit:two",
    ]);
    expect(result.unsupportedIds).toEqual(["self"]);
  });
});
