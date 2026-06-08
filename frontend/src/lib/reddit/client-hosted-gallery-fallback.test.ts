import { afterEach, describe, expect, it, vi } from "vitest";

import { extractYtDlpRuntimeItems } from "@/lib/url-source/ytdlp";
import { fetchRedditRuntimePostLinks } from "./client";

vi.mock("@/lib/url-source/ytdlp", () => ({
  extractYtDlpRuntimeItems: vi.fn(async () => []),
}));

const extractYtDlpRuntimeItemsMock = vi.mocked(extractYtDlpRuntimeItems);

afterEach(() => {
  vi.unstubAllGlobals();
  extractYtDlpRuntimeItemsMock.mockReset();
  extractYtDlpRuntimeItemsMock.mockResolvedValue([]);
});

describe("fetchRedditRuntimePostLinks hosted gallery fallback", () => {
  it("falls through to Redlib when old Reddit returns an OK page without gallery media", async () => {
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
          <html>
            <head><title>Blocked old Reddit response</title></head>
            <body>Request blocked before gallery markup rendered.</body>
          </html>
        `,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <div class="post highlighted">
            <p class="post_header">
              <a class="post_subreddit" href="/r/STAYC">r/STAYC</a>
              <a class="post_author" href="/user/poster">u/poster</a>
              <span class="created" title="May 31 2026, 12:34:56 UTC">now</span>
            </p>
            <h1 class="post_title">260531 Sumin Instagram Update</h1>
            <div class="gallery">
              <figure>
                <a href="/preview/pre/iaeep9rcjh4h1.jpg?width=1440&#38;format=pjpg&#38;auto=webp&#38;s=one">
                  <img loading="lazy" alt="Gallery image" src="/preview/pre/iaeep9rcjh4h1.jpg?width=1440&#38;format=pjpg&#38;auto=webp&#38;s=one"/>
                </a>
              </figure>
              <figure>
                <a href="/preview/pre/wlbnjyrcjh4h1.jpg?width=2811&#38;format=pjpg&#38;auto=webp&#38;s=two">
                  <img loading="lazy" alt="Gallery image" src="/preview/pre/wlbnjyrcjh4h1.jpg?width=2811&#38;format=pjpg&#38;auto=webp&#38;s=two"/>
                </a>
              </figure>
            </div>
          </div>
        `,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/STAYC/comments/1tsx806/260531_sumin_instagram_update/",
      allowNsfw: true,
    });

    expect(fetchMock.mock.calls).toContainEqual([
      "https://redlib.perennialte.ch/r/STAYC/comments/1tsx806/260531_sumin_instagram_update/",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": expect.any(String),
        }),
      }),
    ]);
    expect(result.items).toMatchObject([
      {
        id: "reddit:1tsx806",
        title: "260531 Sumin Instagram Update",
        author: "poster",
        subreddit: "STAYC",
        createdAt: "2026-05-31T12:34:56.000Z",
        media: [
          {
            type: "image",
            url: "https://i.redd.it/iaeep9rcjh4h1.jpg",
            galleryIndex: 0,
          },
          {
            type: "image",
            url: "https://i.redd.it/wlbnjyrcjh4h1.jpg",
            galleryIndex: 1,
          },
        ],
      },
    ]);
  });
});
