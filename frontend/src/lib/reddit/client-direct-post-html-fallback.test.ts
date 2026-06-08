import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchRedditRuntimePostLinks } from "./client";

vi.mock("@/lib/url-source/ytdlp", () => ({
  extractYtDlpRuntimeItems: vi.fn(async () => []),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchRedditRuntimePostLinks direct post HTML fallback", () => {
  it("uses Redlib gallery HTML before partial direct-post RSS can truncate an album", async () => {
    vi.stubEnv("REDDIT_REDLIB_ORIGIN", "https://redlib.test");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("https://old.reddit.com/")) {
        return {
          ok: false,
          status: 403,
          text: async () => "",
        };
      }

      if (url.startsWith("https://redlib.test/")) {
        return {
          ok: true,
          text: async () => `
            <div class="post highlighted">
              <h1 class="post_title">Full Redlib album</h1>
              <div class="gallery">
                <figure>
                  <a href="/img/first.gif"><img loading="lazy" alt="Gallery image" src="/img/first.gif"/></a>
                </figure>
                <figure>
                  <a href="/img/second.gif"><img loading="lazy" alt="Gallery image" src="/img/second.gif"/></a>
                </figure>
                <figure>
                  <a href="/img/third.gif"><img loading="lazy" alt="Gallery image" src="/img/third.gif"/></a>
                </figure>
                <figure>
                  <a href="/img/fourth.gif"><img loading="lazy" alt="Gallery image" src="/img/fourth.gif"/></a>
                </figure>
              </div>
            </div>
          `,
        };
      }

      if (url.endsWith(".rss")) {
        return {
          ok: true,
          text: async () => `
            <?xml version="1.0" encoding="UTF-8"?>
            <feed xmlns="http://www.w3.org/2005/Atom">
              <entry>
                <content type="html">
                  &lt;table&gt;&lt;tr&gt;&lt;td&gt;
                  &lt;span&gt;&lt;a href=&quot;https://i.redd.it/rss-first.jpg&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;
                  &lt;span&gt;&lt;a href=&quot;https://i.redd.it/rss-second.jpg&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;
                  &lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;
                </content>
                <id>t3_album123</id>
                <link href="https://www.reddit.com/r/example/comments/album123/full_album/"/>
                <updated>2026-06-01T00:00:00+00:00</updated>
                <title>Partial RSS album</title>
              </entry>
            </feed>
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

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/example/comments/album123/full_album/",
      allowNsfw: true,
      limit: 20,
    });

    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith(".rss")),
    ).toBe(false);
    expect(result.items).toMatchObject([
      {
        id: "reddit:album123",
        title: "Full Redlib album",
        media: [
          { type: "image", url: "https://i.redd.it/first.gif" },
          { type: "image", url: "https://i.redd.it/second.gif" },
          { type: "image", url: "https://i.redd.it/third.gif" },
          { type: "image", url: "https://i.redd.it/fourth.gif" },
        ],
      },
    ]);
  });
});
