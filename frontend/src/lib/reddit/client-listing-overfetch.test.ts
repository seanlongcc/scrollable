import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchRedditRuntimePostLinks } from "./client";

vi.mock("@/lib/url-source/ytdlp", () => ({
  extractYtDlpRuntimeItems: vi.fn(async () => []),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchRedditRuntimePostLinks listing overfetch", () => {
  it("fetches extra listing posts so skips do not reduce the requested media item count", async () => {
    vi.stubEnv("REDDIT_ENABLE_PUBLIC_JSON", "1");
    const children = [
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
          title: "Text post",
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
    ];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/.json")) {
        const requestedLimit = Number(url.searchParams.get("limit") ?? "0");

        return {
          ok: true,
          json: async () => ({
            kind: "Listing",
            data: {
              children: children.slice(0, requestedLimit),
            },
          }),
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
      urls: "https://www.reddit.com/r/kpop/top/?t=week",
      limit: 2,
    });

    expect(
      fetchMock.mock.calls
        .map(([input]) => String(input))
        .filter((url) => url.includes("/.json")),
    ).toEqual([
      "https://www.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=4&include_over_18=on",
      "https://api.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=4&include_over_18=on",
    ]);
    expect(result.items.map((item) => item.id)).toEqual([
      "reddit:one",
      "reddit:two",
    ]);
    expect(result.unsupportedIds).toEqual(["self"]);
  });
});
