import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createRedditSessionSources,
  fetchRedditRuntimeItems,
  fetchUrlRuntimeItemsForSource,
} from "./runtime-sources";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchRedditRuntimeItems", () => {
  it("fetches Reddit listing media directly from Reddit", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/reddit/listing")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: "reddit:api",
                source: "reddit",
                title: "API item",
                subreddit: "pics",
                isNsfw: false,
                createdAt: "2026-04-24T00:00:00.000Z",
                media: [{ type: "image", url: "https://cdn.test/api.jpg" }],
              },
            ],
          }),
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
                  id: "direct",
                  title: "Direct Reddit item",
                  subreddit: "pics",
                  post_hint: "image",
                  url: "https://cdn.test/direct.jpg",
                },
              },
            ],
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const items = await fetchRedditRuntimeItems(
      ["https://www.reddit.com/r/pics/top/?t=week"],
      24,
    );

    expect(items).toMatchObject([
      {
        id: "reddit:direct",
        title: "Direct Reddit item",
        media: [{ url: "https://cdn.test/direct.jpg" }],
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.reddit.com/r/pics/top/.json?raw_json=1&t=week&limit=24",
      { cache: "no-store" },
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/reddit/listing"),
      ),
    ).toBe(false);
  });

  it("resolves Reddit URL sources directly from Reddit", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/reddit/listing")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: "reddit:api-url",
                source: "reddit",
                title: "API URL item",
                subreddit: "pics",
                isNsfw: false,
                createdAt: "2026-04-24T00:00:00.000Z",
                media: [{ type: "image", url: "https://cdn.test/api-url.jpg" }],
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        json: async () => [
          {
            kind: "Listing",
            data: {
              children: [
                {
                  data: {
                    id: "direct-url",
                    title: "Direct URL item",
                    subreddit: "pics",
                    post_hint: "image",
                    url: "https://cdn.test/direct-url.jpg",
                  },
                },
              ],
            },
          },
        ],
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchUrlRuntimeItemsForSource({
      kind: "url",
      url: "https://www.reddit.com/r/pics/comments/abc123/title/",
    });

    expect(result).toMatchObject({
      title: "r/pics",
      items: [
        {
          id: "reddit:direct-url",
          title: "Direct URL item",
          media: [{ url: "https://cdn.test/direct-url.jpg" }],
        },
      ],
      urlResolution: {
        status: "resolved",
        mode: "provider",
        hint: "provider:reddit",
        provider: "reddit",
        externalUrl: "https://www.reddit.com/r/pics/comments/abc123/title/",
      },
      sourceConfig: {
        kind: "url",
        url: "https://www.reddit.com/r/pics/comments/abc123/title/",
        resolverHint: "provider:reddit",
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.reddit.com/r/pics/comments/abc123/title/.json?raw_json=1",
      { cache: "no-store" },
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/reddit/listing"),
      ),
    ).toBe(false);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/url/resolve"),
      ),
    ).toBe(false);
  });
});

describe("createRedditSessionSources", () => {
  it("reuses one Reddit fetch for duplicate separate post sources", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          kind: "Listing",
          data: {
            children: [
              {
                data: {
                  id: "duplicate",
                  title: "Duplicate post",
                  subreddit: "pics",
                  post_hint: "image",
                  url: "https://cdn.test/duplicate.jpg",
                },
              },
            ],
          },
        },
      ],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const sources = await createRedditSessionSources({
      urls: [
        "https://www.reddit.com/r/pics/comments/abc123/title/",
        "https://www.reddit.com/r/pics/comments/abc123/title/",
      ],
      limit: 10,
      sourceGroupingMode: "separate",
    });

    expect(sources).toHaveLength(2);
    expect(sources[0]?.items).toMatchObject([
      { id: "reddit:duplicate", title: "Duplicate post" },
    ]);
    expect(sources[1]?.items).toMatchObject([
      { id: "reddit:duplicate", title: "Duplicate post" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.reddit.com/r/pics/comments/abc123/title/.json?raw_json=1",
      { cache: "no-store" },
    );
  });

  it("randomizes grouped Reddit source item order", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        kind: "Listing",
        data: {
          children: ["first", "second", "third"].map((id) => ({
            data: {
              id,
              title: id,
              subreddit: "pics",
              post_hint: "image",
              url: `https://cdn.test/${id}.jpg`,
            },
          })),
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Math, "random").mockReturnValueOnce(0.1).mockReturnValueOnce(0.1);

    const [source] = await createRedditSessionSources({
      urls: ["https://www.reddit.com/r/pics/top/?t=week"],
      limit: 24,
      sourceGroupingMode: "stacked",
    });

    expect(source?.items.map((item) => item.id)).toEqual([
      "reddit:second",
      "reddit:third",
      "reddit:first",
    ]);
    expect(source?.allItems?.map((item) => item.id)).toEqual([
      "reddit:first",
      "reddit:second",
      "reddit:third",
    ]);
    expect(source?.isOrderRandomized).toBe(true);
  });
});
