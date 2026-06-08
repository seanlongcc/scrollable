import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchRedditRuntimePostLinks } from "./client";

vi.mock("@/lib/url-source/ytdlp", () => ({
  extractYtDlpRuntimeItems: vi.fn(async () => []),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchRedditRuntimePostLinks listing HTML fallback", () => {
  it("uses Redlib listing HTML before RSS when public JSON is blocked", async () => {
    vi.stubEnv("REDDIT_LISTING_HTML_FALLBACK_FIRST", "1");
    vi.stubEnv("REDDIT_REDLIB_ORIGIN", "https://redlib.test");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/.json") || url.includes(".rss")) {
        return {
          ok: false,
          status: 403,
          text: async (): Promise<string> => "",
          json: async () => ({}),
        };
      }

      if (url.startsWith("https://old.reddit.com")) {
        return {
          ok: false,
          status: 403,
          text: async (): Promise<string> => "",
        };
      }

      if (url.startsWith("https://redlib.test")) {
        return {
          ok: true,
          text: async (): Promise<string> => `
            <div id="posts">
              <hr class="sep" />
              <div class="post" id="one">
                <p class="post_header"><a class="post_subreddit" href="/r/kpop">r/kpop</a></p>
                <h2 class="post_title"><a href="/r/kpop/comments/one/one/">One</a></h2>
                <div class="post_media_content">
                  <a href="/img/one.jpg" class="post_media_image short">
                    <img alt="Post image" src="/img/one.jpg"/>
                  </a>
                </div>
              </div>
              <hr class="sep" />
              <div class="post" id="two">
                <p class="post_header"><a class="post_subreddit" href="/r/kpop">r/kpop</a></p>
                <h2 class="post_title"><a href="/r/kpop/comments/two/two/">Two</a></h2>
                <div class="post_media_content">
                  <a href="/img/two.jpg" class="post_media_image short">
                    <img alt="Post image" src="/img/two.jpg"/>
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
        text: async (): Promise<string> => "",
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpop/top/?t=week",
      allowNsfw: true,
      limit: 2,
    });

    expect(result.items.map((item) => item.id)).toEqual([
      "reddit:one",
      "reddit:two",
    ]);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).not.toContain(
      "https://www.reddit.com/r/kpop/top/.rss?t=week&limit=4",
    );
  });
});
