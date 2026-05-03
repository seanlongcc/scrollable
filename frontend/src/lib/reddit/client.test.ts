import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchRedditRuntimePostLinks,
  parseRedditPostLinksInput,
} from "./client";

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

  it("parses subreddit listing URLs and a custom media count", () => {
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

  it("accepts up to 200 Reddit source URLs", () => {
    const urls = Array.from(
      { length: 200 },
      (_entry, index) =>
        `https://www.reddit.com/r/pics/comments/post${index}/title/`,
    );

    expect(parseRedditPostLinksInput({ urls }).urls).toHaveLength(200);
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
      "https://www.reddit.com/r/kpop/comments/1sui8xh/nmixx_the_5th_ep_heavy_serenade_concept_photo/.json?raw_json=1",
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
      "https://oauth.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=200",
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
      "https://www.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=200",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=200",
      expect.any(Object),
    );
    expect(result.items.map((item) => item.id)).toEqual(["reddit:fallback"]);
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
      "https://www.reddit.com/r/kpop/top/.json?raw_json=1&t=week&limit=200",
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

  it("fetches the requested media count for each stacked subreddit listing", async () => {
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
