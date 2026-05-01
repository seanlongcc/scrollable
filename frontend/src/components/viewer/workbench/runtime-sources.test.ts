import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchRedditRuntimeItems,
  fetchUrlRuntimeItemsForSource,
} from "./runtime-sources";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRedditRuntimeItems", () => {
  it("fetches Reddit listing media through the app API", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      return {
        ok: true,
        json: async () => ({
          items: url.startsWith("/api/reddit/listing")
            ? [
                {
                  id: "reddit:api",
                  source: "reddit",
                  title: "API item",
                  subreddit: "pics",
                  isNsfw: false,
                  createdAt: "2026-04-24T00:00:00.000Z",
                  media: [{ type: "image", url: "https://cdn.test/api.jpg" }],
                },
              ]
            : [],
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
        id: "reddit:api",
        title: "API item",
        media: [{ url: "https://cdn.test/api.jpg" }],
      },
    ]);
    const requestUrl = new URL(
      String(fetchMock.mock.calls[0]?.[0]),
      "http://localhost",
    );
    expect(requestUrl.pathname).toBe("/api/reddit/listing");
    expect(requestUrl.searchParams.get("urls")).toBe(
      "https://www.reddit.com/r/pics/top/?t=week",
    );
    expect(requestUrl.searchParams.get("allowNsfw")).toBe("true");
    expect(requestUrl.searchParams.get("limit")).toBe("24");
  });

  it("resolves Reddit URL sources through the app API", async () => {
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
        json: async () => ({ items: [] }),
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
          id: "reddit:api-url",
          title: "API URL item",
          media: [{ url: "https://cdn.test/api-url.jpg" }],
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
    const requestUrl = new URL(
      String(fetchMock.mock.calls[0]?.[0]),
      "http://localhost",
    );
    expect(requestUrl.pathname).toBe("/api/reddit/listing");
    expect(requestUrl.searchParams.get("urls")).toBe(
      "https://www.reddit.com/r/pics/comments/abc123/title/",
    );
    expect(requestUrl.searchParams.get("allowNsfw")).toBe("true");
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/url/resolve"),
      ),
    ).toBe(false);
  });
});
