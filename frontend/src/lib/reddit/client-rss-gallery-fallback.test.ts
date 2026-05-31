import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchRedditRuntimePostLinks } from "./client";

vi.mock("@/lib/url-source/ytdlp", () => ({
  extractYtDlpRuntimeItems: vi.fn(async () => []),
}));

const originalRedditClientId = process.env.REDDIT_CLIENT_ID;
const originalRedditClientSecret = process.env.REDDIT_CLIENT_SECRET;

afterEach(() => {
  vi.unstubAllGlobals();
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

describe("fetchRedditRuntimePostLinks RSS gallery fallbacks", () => {
  it("resolves Reddit RSS gallery links through Redlib when old Reddit is blocked", async () => {
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
              <category term="kpop" label="r/kpop"/>
              <content type="html">
                &lt;table&gt;&lt;tr&gt;&lt;td&gt;
                &lt;span&gt;&lt;a href=&quot;https://www.reddit.com/gallery/gallery123&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;
                &lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;
              </content>
              <media:thumbnail url="https://preview.redd.it/gallery123.jpg?width=140&amp;height=140&amp;auto=webp"/>
              <id>t3_gallery123</id>
              <link href="https://www.reddit.com/r/kpop/comments/gallery123/gallery_title/"/>
              <updated>2026-05-30T17:41:27+00:00</updated>
              <title>RSS gallery via Redlib</title>
            </entry>
          </feed>
        `,
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
            <h1 class="post_title">Redlib title</h1>
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
          </div>
        `,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpop/top/?t=week",
      allowNsfw: true,
      limit: 10,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "https://redlib.perennialte.ch/r/kpop/comments/gallery123/gallery_title/",
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
        id: "reddit:gallery123",
        title: "RSS gallery via Redlib",
        subreddit: "kpop",
        author: "gallery-poster",
        media: [
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
        ],
      },
    ]);
  });
});
