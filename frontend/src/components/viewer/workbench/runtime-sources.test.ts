import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchRedditRuntimeItems,
  fetchUrlRuntimeItemsForSource,
} from "./runtime-sources";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRedditRuntimeItems", () => {
  it("fetches Reddit listing JSON directly from the browser", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/reddit/listing")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: "reddit:legacy",
                source: "reddit",
                title: "Legacy API item",
                subreddit: "pics",
                isNsfw: false,
                createdAt: "2026-04-24T00:00:00.000Z",
                media: [{ type: "image", url: "https://cdn.test/legacy.jpg" }],
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
                  title: "Direct browser item",
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
        title: "Direct browser item",
        media: [{ url: "https://cdn.test/direct.jpg" }],
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.reddit.com/r/pics/top/.json?raw_json=1&t=week&limit=200",
      { cache: "no-store" },
    );
  });

  it("resolves Reddit URL sources directly from the browser", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/url/resolve")) {
        return {
          ok: true,
          json: async () => ({
            resolution: {
              status: "resolved",
              mode: "provider",
              hint: "provider:reddit",
              provider: "reddit",
              title: "Server Reddit URL",
              externalUrl:
                "https://www.reddit.com/r/pics/comments/abc123/title/",
              items: [
                {
                  id: "reddit:server",
                  source: "reddit",
                  title: "Server item",
                  subreddit: "pics",
                  isNsfw: false,
                  createdAt: "2026-04-24T00:00:00.000Z",
                  media: [
                    { type: "image", url: "https://cdn.test/server.jpg" },
                  ],
                },
              ],
            },
            nextResolverHint: "provider:reddit",
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
        String(input).startsWith("/api/url/resolve"),
      ),
    ).toBe(false);
  });
});
