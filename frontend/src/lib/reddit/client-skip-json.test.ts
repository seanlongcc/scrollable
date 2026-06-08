import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchRedditRuntimePostLinks } from "./client";

vi.mock("@/lib/url-source/ytdlp", () => ({
  extractYtDlpRuntimeItems: vi.fn(async () => []),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRedditRuntimePostLinks public JSON behavior", () => {
  it("skips public JSON for listings by default and resolves through old Reddit HTML", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/.json")) {
        return {
          ok: true,
          json: async () => {
            throw new Error("listing public JSON should be skipped");
          },
        };
      }

      if (url.startsWith("https://old.reddit.com/r/kpop/top/")) {
        return {
          ok: true,
          text: async (): Promise<string> => `
            <div class=" thing id-t3_oldlisting odd link "
              data-fullname="t3_oldlisting"
              data-author="poster"
              data-subreddit="kpop"
              data-timestamp="1780006968000"
              data-url="https://i.redd.it/old-listing-image.jpg"
              data-permalink="/r/kpop/comments/oldlisting/old_listing_image/"
              data-nsfw="false">
              <p class="title">
                <a class="title may-blank outbound" href="https://i.redd.it/old-listing-image.jpg">Old listing image</a>
              </p>
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
      limit: 1,
    });

    expect(
      fetchMock.mock.calls.some(([input]) => String(input).includes("/.json")),
    ).toBe(false);
    expect(result.items).toMatchObject([
      {
        id: "reddit:oldlisting",
        title: "Old listing image",
        media: [
          { type: "image", url: "https://i.redd.it/old-listing-image.jpg" },
        ],
      },
    ]);
  });

  it("skips public JSON for direct posts by default and resolves through old Reddit HTML", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/.json")) {
        return {
          ok: true,
          json: async () => {
            throw new Error("post public JSON should be skipped");
          },
        };
      }

      if (
        url ===
        "https://old.reddit.com/r/kpop/comments/1txlgk7/way2_x_profile_photos/.compact"
      ) {
        return {
          ok: true,
          text: async (): Promise<string> => `
            <a
              class="title"
              data-event-action="title"
              href="/r/kpop/comments/1txlgk7/way2_x_profile_photos/"
              title="WAY2_X - Profile Photos">WAY2_X - Profile Photos</a>
            <div
              class="thing link"
              data-author="way2x"
              data-subreddit="kpop"
              data-timestamp="1780006968000"
              data-nsfw="false">
              <div
                class="expando expando-uninitialized"
                data-cachedhtml="
                  &lt;div class=&quot;media-preview&quot; data-media-ids=&quot;first,second,third,fourth&quot;&gt;
                    &lt;div class=&quot;gallery-preview&quot; id=&quot;gallery-preview-post-first&quot;&gt;
                      &lt;a class=&quot;may-blank gallery-item-thumbnail-link&quot; data-position=&quot;1&quot; href=&quot;https://preview.redd.it/first.jpg?width=1080&amp;amp;format=pjpg&amp;amp;auto=webp&amp;amp;s=one&quot;&gt;
                        &lt;img class=&quot;preview&quot; src=&quot;https://preview.redd.it/first.jpg?width=320&amp;amp;crop=smart&amp;amp;auto=webp&amp;amp;s=thumb-one&quot; width=&quot;617&quot; height=&quot;768&quot;&gt;
                      &lt;/a&gt;
                    &lt;/div&gt;
                    &lt;div class=&quot;gallery-preview&quot; id=&quot;gallery-preview-post-second&quot;&gt;
                      &lt;a class=&quot;may-blank gallery-item-thumbnail-link&quot; data-position=&quot;2&quot; href=&quot;https://preview.redd.it/second.jpg?width=1080&amp;amp;format=pjpg&amp;amp;auto=webp&amp;amp;s=two&quot;&gt;
                        &lt;img class=&quot;preview&quot; src=&quot;https://preview.redd.it/second.jpg?width=320&amp;amp;crop=smart&amp;amp;auto=webp&amp;amp;s=thumb-two&quot; width=&quot;617&quot; height=&quot;768&quot;&gt;
                      &lt;/a&gt;
                    &lt;/div&gt;
                    &lt;div class=&quot;gallery-preview&quot; id=&quot;gallery-preview-post-third&quot;&gt;
                      &lt;a class=&quot;may-blank gallery-item-thumbnail-link&quot; data-position=&quot;3&quot; href=&quot;https://preview.redd.it/third.jpg?width=1080&amp;amp;format=pjpg&amp;amp;auto=webp&amp;amp;s=three&quot;&gt;
                        &lt;img class=&quot;preview&quot; src=&quot;https://preview.redd.it/third.jpg?width=320&amp;amp;crop=smart&amp;amp;auto=webp&amp;amp;s=thumb-three&quot; width=&quot;617&quot; height=&quot;768&quot;&gt;
                      &lt;/a&gt;
                    &lt;/div&gt;
                    &lt;div class=&quot;gallery-preview&quot; id=&quot;gallery-preview-post-fourth&quot;&gt;
                      &lt;a class=&quot;may-blank gallery-item-thumbnail-link&quot; data-position=&quot;4&quot; href=&quot;https://preview.redd.it/fourth.jpg?width=1080&amp;amp;format=pjpg&amp;amp;auto=webp&amp;amp;s=four&quot;&gt;
                        &lt;img class=&quot;preview&quot; src=&quot;https://preview.redd.it/fourth.jpg?width=320&amp;amp;crop=smart&amp;amp;auto=webp&amp;amp;s=thumb-four&quot; width=&quot;617&quot; height=&quot;768&quot;&gt;
                      &lt;/a&gt;
                    &lt;/div&gt;
                  &lt;/div&gt;
                "
              ></div>
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
      urls: "https://www.reddit.com/r/kpop/comments/1txlgk7/way2_x_profile_photos/",
      allowNsfw: true,
      limit: 10,
    });

    expect(
      fetchMock.mock.calls.some(([input]) => String(input).includes("/.json")),
    ).toBe(false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("WAY2_X - Profile Photos");
    expect(result.items[0]?.media).toHaveLength(4);
    expect(result.items[0]?.media.map((media) => media.type)).toEqual([
      "image",
      "image",
      "image",
      "image",
    ]);
  });
});
