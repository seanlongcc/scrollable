import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchRedditRuntimePostLinks } from "./client";

vi.mock("@/lib/url-source/ytdlp", () => ({
  extractYtDlpRuntimeItems: vi.fn(async () => []),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchRedditRuntimePostLinks Redlib origin fallback", () => {
  it("starts later Redlib origins before a slow first origin settles", async () => {
    vi.stubEnv("REDDIT_REDLIB_ORIGIN", "https://slow.test,https://fast.test");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("https://slow.test")) {
        return new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: false,
                status: 504,
                text: async () => "",
              }),
            40,
          );
        });
      }

      if (url.startsWith("https://fast.test")) {
        return {
          ok: true,
          text: async () => `
            <div class="post highlighted">
              <h1 class="post_title">Fast Redlib gallery</h1>
              <div class="gallery">
                <figure>
                  <a href="/preview/pre/fast.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=one">
                    <img loading="lazy" alt="Gallery image" src="/preview/pre/fast.jpg?width=1080&#38;format=pjpg&#38;auto=webp&#38;s=one"/>
                  </a>
                </figure>
              </div>
            </div>
          `,
        };
      }

      return {
        ok: false,
        status: 403,
        text: async () => "",
        json: async () => ({}),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const request = fetchRedditRuntimePostLinks({
      urls: "https://www.reddit.com/r/kpop/comments/redrace123/race_gallery/",
      allowNsfw: true,
    });

    await waitForFetchUrl(fetchMock, "https://slow.test");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const fastStartedBeforeSlowSettled = fetchMock.mock.calls.some(([input]) =>
      String(input).startsWith("https://fast.test"),
    );
    const result = await request;

    expect(fastStartedBeforeSlowSettled).toBe(true);
    expect(result.items).toMatchObject([
      {
        id: "reddit:redrace123",
        title: "Fast Redlib gallery",
        media: [
          {
            type: "image",
            url: "https://i.redd.it/fast.jpg",
            galleryIndex: 0,
          },
        ],
      },
    ]);
  });
});

async function waitForFetchUrl(
  fetchMock: ReturnType<typeof vi.fn>,
  prefix: string,
) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (
      fetchMock.mock.calls.some(([input]) => String(input).startsWith(prefix))
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error(`Fetch was not called with ${prefix}`);
}
