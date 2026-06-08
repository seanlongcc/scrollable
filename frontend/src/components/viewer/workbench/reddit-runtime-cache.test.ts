import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchRedditRuntimePostItems } from "./reddit-runtime-cache";

describe("fetchRedditRuntimePostItems", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.head.querySelectorAll("script").forEach((script) => {
      script.remove();
    });
  });

  it("does not use browser Reddit JSONP while the app API request is still pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );

    void fetchRedditRuntimePostItems({
      urls: [
        "https://www.reddit.com/r/kpop/comments/jsonp123/browser_jsonp_gallery/",
      ],
      allowNsfw: true,
      limit: 5,
    });

    expect(document.head.querySelector("script")).toBeNull();
    await new Promise((resolve) => window.setTimeout(resolve, 900));

    expect(document.head.querySelector("script")).toBeNull();
  });

  it.each([["reddit_fetch_forbidden", 502]])(
    "does not use browser Reddit JSONP when the app API returns %s",
    async (error, status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          return new Response(JSON.stringify({ error }), {
            headers: { "Content-Type": "application/json" },
            status,
          });
        }),
      );

      const request = fetchRedditRuntimePostItems({
        urls: [
          "https://www.reddit.com/r/kpop/comments/jsonp123/browser_jsonp_gallery/",
        ],
        allowNsfw: true,
        limit: 5,
      });
      const rejection = expect(request).rejects.toThrow(error);

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      expect(document.head.querySelector("script")).toBeNull();
      await rejection;
    },
  );

  it("returns app API items without browser Reddit JSONP when the app API returns a partial listing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "reddit:api-one",
                source: "reddit",
                title: "API one",
                media: [
                  { type: "image", url: "https://i.redd.it/api-one.jpg" },
                ],
              },
              {
                id: "reddit:api-two",
                source: "reddit",
                title: "API two",
                media: [
                  { type: "image", url: "https://i.redd.it/api-two.jpg" },
                ],
              },
            ],
            unsupportedIds: ["text-one"],
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          },
        );
      }),
    );

    const request = fetchRedditRuntimePostItems({
      urls: ["https://www.reddit.com/r/kpop/top/?t=week"],
      allowNsfw: true,
      limit: 5,
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    const items = await request;
    expect(document.head.querySelector("script")).toBeNull();
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.id)).toEqual([
      "reddit:api-one",
      "reddit:api-two",
    ]);
  });

  it("does not use browser Reddit JSONP when the app API found no supported media", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ error: "reddit_source_has_no_supported_media" }),
          {
            headers: { "Content-Type": "application/json" },
            status: 422,
          },
        );
      }),
    );

    const request = fetchRedditRuntimePostItems({
      urls: [
        "https://www.reddit.com/r/kpop/comments/jsonp123/browser_jsonp_gallery/",
      ],
      allowNsfw: true,
      limit: 5,
    });
    const rejection = expect(request).rejects.toThrow(
      "reddit_source_has_no_supported_media",
    );

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    expect(document.head.querySelector("script")).toBeNull();
    await rejection;
  });

  it("does not use browser Reddit JSONP when the app API request fails before a response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const request = fetchRedditRuntimePostItems({
      urls: [
        "https://www.reddit.com/r/kpop/comments/jsonp123/browser_jsonp_gallery/",
      ],
      allowNsfw: true,
      limit: 5,
    });
    const rejection = expect(request).rejects.toThrow(
      "reddit_source_fetch_failed",
    );

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    expect(document.head.querySelector("script")).toBeNull();
    await rejection;
  });
});
