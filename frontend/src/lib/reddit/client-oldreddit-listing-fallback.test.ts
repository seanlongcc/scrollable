import { afterEach, describe, expect, it, vi } from "vitest";

import { extractYtDlpRuntimeItems } from "@/lib/url-source/ytdlp";
import { fetchRedditRuntimePostLinks } from "./client";

vi.mock("@/lib/url-source/ytdlp", () => ({
  extractYtDlpRuntimeItems: vi.fn(async () => []),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.mocked(extractYtDlpRuntimeItems).mockReset();
});

describe("fetchRedditRuntimePostLinks old Reddit listing fallback", () => {
  it("tries old Reddit RSS after public Reddit RSS is blocked", async () => {
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
          <?xml version="1.0" encoding="UTF-8"?>
          <feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
              <author><name>/u/poster</name></author>
              <category term="pics" label="r/pics"/>
              <content type="html">
                &lt;table&gt;&lt;tr&gt;&lt;td&gt;
                &lt;span&gt;&lt;a href=&quot;https://i.redd.it/old-rss-image.jpg&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;
                &lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;
              </content>
              <id>t3_oldrss</id>
              <link href="https://www.reddit.com/r/pics/comments/oldrss/old_rss_image/"/>
              <updated>2026-05-30T17:41:27+00:00</updated>
              <title>Old RSS image</title>
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
      4,
      "https://old.reddit.com/r/pics/top/.rss?t=week&limit=10",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(result.items).toMatchObject([
      {
        id: "reddit:oldrss",
        title: "Old RSS image",
        media: [
          {
            type: "image",
            url: "https://i.redd.it/old-rss-image.jpg",
          },
        ],
      },
    ]);
  });

  it("falls back to old Reddit listing HTML before Redlib listing HTML", async () => {
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
          <div class=" thing id-t3_oldlisting odd link "
            data-fullname="t3_oldlisting"
            data-author="poster"
            data-subreddit="pics"
            data-timestamp="1780006968000"
            data-url="https://i.redd.it/old-listing-image.jpg"
            data-permalink="/r/pics/comments/oldlisting/old_listing_image/"
            data-nsfw="false">
            <p class="title">
              <a class="title may-blank outbound" href="https://i.redd.it/old-listing-image.jpg">Old listing image</a>
            </p>
          </div>
        `,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/pics/top/?t=week",
      limit: 10,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "https://old.reddit.com/r/pics/top/?t=week&limit=10",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          Cookie: "over18=1",
          "User-Agent": expect.any(String),
        }),
      }),
    );
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).startsWith("https://redlib.perennialte.ch"),
      ),
    ).toBe(false);
    expect(result.items).toMatchObject([
      {
        id: "reddit:oldlisting",
        title: "Old listing image",
        media: [
          {
            type: "image",
            url: "https://i.redd.it/old-listing-image.jpg",
          },
        ],
      },
    ]);
  });
});
