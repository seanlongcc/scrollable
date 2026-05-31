import { afterEach, describe, expect, it, vi } from "vitest";

import { extractYtDlpRuntimeItems } from "@/lib/url-source/ytdlp";
import {
  fetchRedditRuntimePostLinks,
  parseRedditPostLinksInput,
} from "./client";

vi.mock("@/lib/url-source/ytdlp", () => ({
  extractYtDlpRuntimeItems: vi.fn(async () => []),
}));

const originalRedditClientId = process.env.REDDIT_CLIENT_ID;
const originalRedditClientSecret = process.env.REDDIT_CLIENT_SECRET;
const extractYtDlpRuntimeItemsMock = vi.mocked(extractYtDlpRuntimeItems);

afterEach(() => {
  vi.unstubAllGlobals();
  extractYtDlpRuntimeItemsMock.mockReset();
  extractYtDlpRuntimeItemsMock.mockResolvedValue([]);
  if (originalRedditClientId === undefined) {
    delete process.env.REDDIT_CLIENT_ID;
  } else {
    process.env.REDDIT_CLIENT_ID = originalRedditClientId;
  }
  if (originalRedditClientSecret === undefined) {
    delete process.env.REDDIT_CLIENT_SECRET;
  } else {
    process.env.REDDIT_CLIENT_SECRET = originalRedditClientSecret;
  }
});

describe("parseRedditPostLinksInput", () => {
  it("parses pasted Reddit post URLs and allowNsfw=false query strings", () => {
    expect(
      parseRedditPostLinksInput({
        urls: [
          "https://www.reddit.com/r/kpop/comments/1sui8xh/nmixx_the_5th_ep_heavy_serenade_concept_photo/",
          "https://old.reddit.com/r/pics/comments/abc123/title",
        ].join("\n"),
        allowNsfw: "false",
      }),
    ).toMatchObject({
      urls: [
        "https://www.reddit.com/r/kpop/comments/1sui8xh/nmixx_the_5th_ep_heavy_serenade_concept_photo/",
        "https://www.reddit.com/r/pics/comments/abc123/title/",
      ],
      allowNsfw: false,
    });
  });

  it("rejects subreddit roots without an explicit listing sort", () => {
    expect(() =>
      parseRedditPostLinksInput({ urls: "https://www.reddit.com/r/pics/" }),
    ).toThrow();
  });

  it("parses subreddit listing URLs and a custom post count", () => {
    expect(
      parseRedditPostLinksInput({
        urls: [
          "https://www.reddit.com/r/kpop/top/?t=week",
          "https://old.reddit.com/r/kpop/hot/",
        ].join("\n"),
        limit: "24",
      }),
    ).toMatchObject({
      urls: [
        "https://www.reddit.com/r/kpop/top/?t=week",
        "https://www.reddit.com/r/kpop/hot/",
      ],
      limit: 24,
    });
  });

  it("accepts up to 100 Reddit source URLs", () => {
    const urls = Array.from(
      { length: 100 },
      (_entry, index) =>
        `https://www.reddit.com/r/pics/comments/post${index}/title/`,
    );

    expect(parseRedditPostLinksInput({ urls }).urls).toHaveLength(100);
  });

  it("rejects more than 100 Reddit source URLs", () => {
    const urls = Array.from(
      { length: 101 },
      (_entry, index) =>
        `https://www.reddit.com/r/pics/comments/post${index}/title/`,
    );

    expect(() => parseRedditPostLinksInput({ urls })).toThrow();
  });
});

describe("fetchRedditRuntimePostLinks", () => {
  it("fetches public post JSON without Reddit OAuth credentials", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          kind: "Listing",
          data: {
            children: [
              {
                data: {
                  id: "1sui8xh",
                  title: "Concept photo",
                  subreddit: "kpop",
                  post_hint: "image",
                  url_overridden_by_dest: "https://i.redd.it/photo.jpg",
                },
              },
            ],
          },
        },
      ],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpop/comments/1sui8xh/nmixx_the_5th_ep_heavy_serenade_concept_photo/",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.reddit.com/r/kpop/comments/1sui8xh/nmixx_the_5th_ep_heavy_serenade_concept_photo/.json?raw_json=1&include_over_18=on",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "reddit:1sui8xh",
      title: "Concept photo",
      subreddit: "kpop",
    });
  });

  it("uses Reddit OAuth API when server credentials are configured", async () => {
    process.env.REDDIT_CLIENT_ID = "client-id";
    process.env.REDDIT_CLIENT_SECRET = "client-secret";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "https://www.reddit.com/api/v1/access_token") {
        return {
          ok: true,
          json: async () => ({ access_token: "token-123" }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          kind: "Listing",
          data: {
            children: [
              {
                data: {
                  id: "one",
                  title: "One",
                  subreddit: "kpop",
                  post_hint: "image",
                  url: "https://i.redd.it/one.jpg",
                },
              },
            ],
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpop/top/?t=week",
      limit: 1,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://www.reddit.com/api/v1/access_token",
      expect.objectContaining({
        body: "grant_type=client_credentials",
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://oauth.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=1&include_over_18=on",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(result.items.map((item) => item.id)).toEqual(["reddit:one"]);
  });

  it("does not report upstream forbidden responses as not found", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchRedditRuntimePostLinks({
        urls: "https://www.reddit.com/r/kpop/top/?t=week",
      }),
    ).rejects.toThrow("reddit_fetch_forbidden");
  });

  it("falls back to old Reddit gallery HTML when post JSON and RSS are forbidden", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <html>
            <head><title>Fallback gallery title : kpop</title></head>
            <body>
              <div data-author="poster" data-subreddit="kpop"></div>
              <time datetime="2026-05-30T17:41:27+00:00"></time>
              <div
                class="expando expando-uninitialized"
                data-cachedhtml="
                  &lt;div class=&quot;media-preview&quot;&gt;
                    &lt;a class=&quot;may-blank gallery-item-thumbnail-link&quot; data-position=&quot;1&quot; href=&quot;https://preview.redd.it/first.jpg?width=1080&amp;amp;format=pjpg&amp;amp;auto=webp&amp;amp;s=one&quot;&gt;
                      &lt;img width=&quot;617&quot; height=&quot;768&quot;&gt;
                    &lt;/a&gt;
                  &lt;/div&gt;
                "
              ></div>
            </body>
          </html>
        `,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpop/comments/fallback123/fallback_gallery_title/",
      allowNsfw: true,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://old.reddit.com/r/kpop/comments/fallback123/fallback_gallery_title/",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          Cookie: "over18=1",
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(result.items).toMatchObject([
      {
        id: "reddit:fallback123",
        title: "Fallback gallery title",
        author: "poster",
        subreddit: "kpop",
        createdAt: "2026-05-30T17:41:27.000Z",
        media: [
          {
            type: "image",
            url: "https://preview.redd.it/first.jpg?width=1080&format=pjpg&auto=webp&s=one",
            width: 617,
            height: 768,
            galleryIndex: 0,
          },
        ],
      },
    ]);
  });

  it("falls back to Redlib gallery HTML when Reddit and old Reddit are forbidden", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <div class="post highlighted">
            <p class="post_header">
              <a class="post_subreddit" href="/r/kpop">r/kpop</a>
              <a class="post_author" href="/user/poster">u/poster</a>
              <span class="created" title="May 28 2026, 05:28:45 UTC">2d ago</span>
            </p>
            <h1 class="post_title">Fallback Redlib gallery title</h1>
            <div class="gallery">
              <figure>
                <a href="/preview/pre/first.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=one">
                  <img loading="lazy" alt="Gallery image" src="/preview/pre/first.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=one"/>
                </a>
              </figure>
            </div>
          </div>
        `,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpop/comments/redlib123/fallback_redlib_gallery_title/",
      allowNsfw: true,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "https://redlib.perennialte.ch/r/kpop/comments/redlib123/fallback_redlib_gallery_title/",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(result.items).toMatchObject([
      {
        id: "reddit:redlib123",
        title: "Fallback Redlib gallery title",
        author: "poster",
        subreddit: "kpop",
        createdAt: "2026-05-28T05:28:45.000Z",
        media: [
          {
            type: "image",
            url: "https://i.redd.it/first.jpg",
            galleryIndex: 0,
          },
        ],
      },
    ]);
  });

  it("falls back to Redlib listing HTML for NSFW subreddit listings", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
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
          </div>
        `,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpopfap/top/?t=week",
      allowNsfw: true,
      limit: 10,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://redlib.perennialte.ch/r/kpopfap/top/?t=week",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          Accept: "text/html,application/xhtml+xml",
          Cookie: "show_nsfw=on; blur_nsfw=off",
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(result.items).toMatchObject([
      {
        id: "reddit:video123",
        title: "Winter - aespa",
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
    ]);
  });

  it("retries the public API origin when the Reddit web origin blocks the request", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          kind: "Listing",
          data: {
            children: [
              {
                data: {
                  id: "fallback",
                  title: "Fallback image",
                  subreddit: "kpop",
                  post_hint: "image",
                  url: "https://i.redd.it/fallback.jpg",
                },
              },
            ],
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpop/top/?t=week",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://www.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=20&include_over_18=on",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=20&include_over_18=on",
      expect.any(Object),
    );
    expect(result.items.map((item) => item.id)).toEqual(["reddit:fallback"]);
  });

  it("falls back to Reddit RSS when public JSON endpoints are forbidden", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <?xml version="1.0" encoding="UTF-8"?>
          <feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
            <entry>
              <author><name>/u/poster</name></author>
              <category term="pics" label="r/pics"/>
              <content type="html">
                &lt;table&gt;&lt;tr&gt;&lt;td&gt;
                &lt;span&gt;&lt;a href=&quot;https://i.redd.it/rss-image.jpg&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;
                &lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;
              </content>
              <link href="https://www.reddit.com/r/pics/comments/rss123/rss_image/"/>
              <updated>2026-05-30T17:41:27+00:00</updated>
              <title>RSS image</title>
            </entry>
          </feed>
        `,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/pics/top/?t=week",
      limit: 10,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://www.reddit.com/r/pics/top/.rss?t=week&limit=10",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(result.items).toMatchObject([
      {
        id: "reddit:rss123",
        title: "RSS image",
        subreddit: "pics",
        author: "poster",
        media: [{ type: "image", url: "https://i.redd.it/rss-image.jpg" }],
      },
    ]);
  });

  it("falls back to Reddit RSS when public JSON has no supported media", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          kind: "Listing",
          data: {
            children: [
              {
                data: {
                  id: "textonly",
                  title: "Text only",
                  subreddit: "pics",
                },
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <?xml version="1.0" encoding="UTF-8"?>
          <feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
            <entry>
              <author><name>/u/poster</name></author>
              <category term="pics" label="r/pics"/>
              <content type="html">
                &lt;table&gt;&lt;tr&gt;&lt;td&gt;
                &lt;span&gt;&lt;a href=&quot;https://i.redd.it/rss-image.jpg&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;
                &lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;
              </content>
              <id>t3_rssimage</id>
              <link href="https://www.reddit.com/r/pics/comments/rssimage/rss_image/"/>
              <updated>2026-05-30T17:41:27+00:00</updated>
              <title>RSS image after empty JSON</title>
            </entry>
          </feed>
        `,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/pics/top/?t=week",
      limit: 10,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://www.reddit.com/r/pics/top/.rss?t=week&limit=10",
      expect.any(Object),
    );
    expect(result.items).toMatchObject([
      {
        id: "reddit:rssimage",
        media: [{ type: "image", url: "https://i.redd.it/rss-image.jpg" }],
      },
    ]);
    expect(result.unsupportedIds).toEqual([]);
  });

  it("resolves Reddit RSS gallery links through old Reddit gallery HTML", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <?xml version="1.0" encoding="UTF-8"?>
          <feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
            <entry>
              <author><name>/u/gallery-poster</name></author>
              <category term="pics" label="r/pics"/>
              <content type="html">
                &lt;table&gt;&lt;tr&gt;&lt;td&gt;
                &lt;span&gt;&lt;a href=&quot;https://www.reddit.com/gallery/gallery123&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;
                &lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;
              </content>
              <id>t3_gallery123</id>
              <link href="https://www.reddit.com/r/pics/comments/gallery123/gallery_title/"/>
              <updated>2026-05-30T17:41:27+00:00</updated>
              <title>RSS gallery</title>
            </entry>
          </feed>
        `,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <div class="media-preview" data-media-ids="first,second">
            <div class="gallery-preview" id="gallery-preview-gallery123-first">
              <a class="may-blank gallery-item-thumbnail-link" data-position="1" href="https://preview.redd.it/first.jpg?width=960&amp;format=pjpg&amp;auto=webp&amp;s=one">
                <img class="preview" src="https://preview.redd.it/first.jpg?width=320&amp;crop=smart&amp;auto=webp&amp;s=thumb-one" width="576" height="768">
              </a>
            </div>
            <div class="gallery-preview" id="gallery-preview-gallery123-second">
              <a class="may-blank gallery-item-thumbnail-link" data-position="2" href="https://preview.redd.it/second.jpg?width=960&amp;format=pjpg&amp;auto=webp&amp;s=two">
                <img class="preview" src="https://preview.redd.it/second.jpg?width=320&amp;crop=smart&amp;auto=webp&amp;s=thumb-two" width="640" height="480">
              </a>
            </div>
          </div>
        `,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/pics/top/?t=week",
      allowNsfw: true,
      limit: 10,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://old.reddit.com/r/pics/comments/gallery123/gallery_title/",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          Cookie: "over18=1",
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(result.items).toMatchObject([
      {
        id: "reddit:gallery123",
        title: "RSS gallery",
        subreddit: "pics",
        author: "gallery-poster",
        media: [
          {
            type: "image",
            url: "https://preview.redd.it/first.jpg?width=960&format=pjpg&auto=webp&s=one",
            width: 576,
            height: 768,
            galleryIndex: 0,
          },
          {
            type: "image",
            url: "https://preview.redd.it/second.jpg?width=960&format=pjpg&auto=webp&s=two",
            width: 640,
            height: 480,
            galleryIndex: 1,
          },
        ],
      },
    ]);
  });

  it("does not use the RSS thumbnail when Reddit gallery resolution returns no media", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <?xml version="1.0" encoding="UTF-8"?>
          <feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
            <entry>
              <author><name>/u/gallery-poster</name></author>
              <category term="pics" label="r/pics"/>
              <content type="html">
                &lt;table&gt;&lt;tr&gt;&lt;td&gt;
                &lt;span&gt;&lt;a href=&quot;https://www.reddit.com/gallery/gallery123&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;
                &lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;
              </content>
              <media:thumbnail url="https://preview.redd.it/gallery123.jpg?width=140&amp;height=140&amp;auto=webp"/>
              <id>t3_gallery123</id>
              <link href="https://www.reddit.com/r/pics/comments/gallery123/gallery_title/"/>
              <updated>2026-05-30T17:41:27+00:00</updated>
              <title>RSS gallery thumbnail</title>
            </entry>
          </feed>
        `,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "",
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchRedditRuntimePostLinks({
        urls: "https://www.reddit.com/r/pics/top/?t=week",
        allowNsfw: true,
        limit: 10,
      }),
    ).rejects.toThrow("reddit_source_has_no_supported_media");

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://old.reddit.com/r/pics/comments/gallery123/gallery_title/",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "https://redlib.perennialte.ch/r/pics/comments/gallery123/gallery_title/",
      expect.any(Object),
    );
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
      "https://redlib.perennialte.ch/r/pics/top/?t=week",
    );
  });

  it("resolves Reddit RSS video links through the media embed endpoint", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <?xml version="1.0" encoding="UTF-8"?>
          <feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
            <entry>
              <author><name>/u/poster</name></author>
              <category term="discordVideos" label="r/discordVideos"/>
              <content type="html">
                &lt;table&gt;&lt;tr&gt;&lt;td&gt;
                &lt;span&gt;&lt;a href=&quot;https://v.redd.it/videoabc&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;
                &lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;
              </content>
              <id>t3_video123</id>
              <link href="https://www.reddit.com/r/discordVideos/comments/video123/video_title/"/>
              <updated>2026-05-30T17:41:27+00:00</updated>
              <title>RSS video</title>
            </entry>
          </feed>
        `,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <div
            id="video-video123"
            data-hls-url="https://v.redd.it/videoabc/HLSPlaylist.m3u8?a=signed&amp;v=1&amp;f=sd"
            data-video-width="486"
            data-video-height="864"
          ></div>
        `,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/discordVideos/top/?t=week",
      limit: 10,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://www.redditmedia.com/mediaembed/video123",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(result.items).toMatchObject([
      {
        id: "reddit:video123",
        title: "RSS video",
        subreddit: "discordVideos",
        author: "poster",
        media: [
          {
            type: "video",
            url: "https://v.redd.it/videoabc/HLSPlaylist.m3u8?a=signed&v=1&f=sd",
            width: 486,
            height: 864,
            isHls: true,
          },
        ],
      },
    ]);
  });

  it("resolves Reddit RSS external video links through yt-dlp", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;

    extractYtDlpRuntimeItemsMock.mockResolvedValueOnce([
      {
        id: "url:ytdlp:redgifs",
        source: "url",
        title: "Redgifs video",
        isNsfw: true,
        createdAt: "2026-05-30T17:41:27.000Z",
        media: [
          {
            type: "video",
            url: "https://media.redgifs.com/ShabbyAllLongspur.mp4",
            width: 852,
            height: 480,
          },
        ],
      },
    ]);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <?xml version="1.0" encoding="UTF-8"?>
          <feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
            <entry>
              <author><name>/u/poster</name></author>
              <category term="kpopfap" label="r/kpopfap"/>
              <content type="html">
                &lt;table&gt;&lt;tr&gt;&lt;td&gt;
                &lt;span&gt;&lt;a href=&quot;https://www.redgifs.com/watch/shabbyalllongspur&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;
                &lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;
              </content>
              <id>t3_nsfwvideo</id>
              <link href="https://www.reddit.com/r/kpopfap/comments/nsfwvideo/video_title/"/>
              <updated>2026-05-30T17:41:27+00:00</updated>
              <title>RSS external video</title>
            </entry>
          </feed>
        `,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpopfap/top/?t=week",
      allowNsfw: true,
      limit: 10,
    });

    expect(extractYtDlpRuntimeItemsMock).toHaveBeenCalledWith(
      "https://www.redgifs.com/watch/shabbyalllongspur",
    );
    expect(result.items).toMatchObject([
      {
        id: "reddit:nsfwvideo",
        title: "RSS external video",
        subreddit: "kpopfap",
        author: "poster",
        media: [
          {
            type: "video",
            url: "https://media.redgifs.com/ShabbyAllLongspur.mp4",
            width: 852,
            height: 480,
          },
        ],
      },
    ]);
  });

  it("fetches subreddit listings and returns the requested number of usable media posts after skips", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        kind: "Listing",
        data: {
          children: [
            {
              data: {
                id: "sticky",
                stickied: true,
                title: "Sticky",
                subreddit: "kpop",
                post_hint: "image",
                url: "https://i.redd.it/sticky.jpg",
              },
            },
            {
              data: {
                id: "self",
                title: "Text",
                subreddit: "kpop",
              },
            },
            {
              data: {
                id: "one",
                title: "One",
                subreddit: "kpop",
                post_hint: "image",
                url: "https://i.redd.it/one.jpg",
              },
            },
            {
              data: {
                id: "two",
                title: "Two",
                subreddit: "kpop",
                post_hint: "image",
                url: "https://i.redd.it/two.jpg",
              },
            },
            {
              data: {
                id: "three",
                title: "Three",
                subreddit: "kpop",
                post_hint: "image",
                url: "https://i.redd.it/three.jpg",
              },
            },
          ],
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpop/top/?t=week",
      limit: 2,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=2&include_over_18=on",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(result.items.map((item) => item.id)).toEqual([
      "reddit:one",
      "reddit:two",
    ]);
    expect(result.unsupportedIds).toEqual(["self"]);
  });

  it("fetches the requested post count for each stacked subreddit listing", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const subreddit = url.includes("/r/aww/") ? "aww" : "kpop";

      return {
        ok: true,
        json: async () => ({
          kind: "Listing",
          data: {
            children: [
              {
                data: {
                  id: `${subreddit}-one`,
                  title: `${subreddit} one`,
                  subreddit,
                  post_hint: "image",
                  url: `https://i.redd.it/${subreddit}-one.jpg`,
                },
              },
              {
                data: {
                  id: `${subreddit}-two`,
                  title: `${subreddit} two`,
                  subreddit,
                  post_hint: "image",
                  url: `https://i.redd.it/${subreddit}-two.jpg`,
                },
              },
            ],
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: [
        "https://www.reddit.com/r/kpop/top/?t=week",
        "https://www.reddit.com/r/aww/top/?t=week",
      ],
      limit: 2,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.items.map((item) => item.id)).toEqual([
      "reddit:kpop-one",
      "reddit:kpop-two",
      "reddit:aww-one",
      "reddit:aww-two",
    ]);
  });
});
