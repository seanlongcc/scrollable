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
    "falls back to browser Reddit JSONP when the app API returns %s",
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

      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (document.head.querySelector("script")) break;
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      const script = document.head.querySelector("script");
      expect(script).toBeTruthy();
      expect(script?.src).toContain(
        "https://www.reddit.com/r/kpop/comments/jsonp123/browser_jsonp_gallery/.json",
      );
      expect(script?.src).toContain("include_over_18=on");
      const callbackName = new URL(script?.src ?? "").searchParams.get("jsonp");
      expect(callbackName).toBeTruthy();

      resolveRedditJsonpScript(script, [
        {
          data: {
            children: [
              {
                data: {
                  created_utc: 1_780_000_000,
                  gallery_data: {
                    items: [{ media_id: "first" }, { media_id: "second" }],
                  },
                  id: "jsonp123",
                  is_gallery: true,
                  media_metadata: {
                    first: {
                      e: "Image",
                      m: "image/jpeg",
                      s: {
                        u: "https://preview.redd.it/first.jpg",
                        x: 800,
                        y: 600,
                      },
                      status: "valid",
                    },
                    second: {
                      e: "Image",
                      m: "image/jpeg",
                      s: {
                        u: "https://preview.redd.it/second.jpg",
                        x: 640,
                        y: 480,
                      },
                      status: "valid",
                    },
                  },
                  over_18: true,
                  permalink: "/r/kpop/comments/jsonp123/browser_jsonp_gallery/",
                  subreddit: "kpop",
                  title: "Browser JSONP gallery",
                },
              },
            ],
          },
        },
      ]);

      await expect(request).resolves.toMatchObject([
        {
          id: "reddit:jsonp123",
          isNsfw: true,
          media: [
            { galleryIndex: 0, url: "https://i.redd.it/first.jpg" },
            { galleryIndex: 1, url: "https://i.redd.it/second.jpg" },
          ],
        },
      ]);
    },
  );

  it("falls back to browser Reddit JSONP when the app API returns a partial listing", async () => {
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
      if (document.head.querySelector("script")) break;
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    const script = document.head.querySelector("script");
    expect(script).toBeTruthy();
    expect(script?.src).toContain("https://www.reddit.com/r/kpop/top/.json");
    expect(script?.src).toContain("limit=10");

    resolveRedditJsonpScript(script, {
      kind: "Listing",
      data: {
        children: Array.from({ length: 5 }, (_, index) => ({
          data: {
            created_utc: 1_780_000_000 + index,
            id: `jsonp${index}`,
            over_18: false,
            permalink: `/r/kpop/comments/jsonp${index}/browser_jsonp_image/`,
            post_hint: "image",
            subreddit: "kpop",
            title: `Browser JSONP image ${index}`,
            url_overridden_by_dest: `https://i.redd.it/jsonp-${index}.jpg`,
          },
        })),
      },
    });

    const items = await request;
    expect(items).toHaveLength(5);
    expect(items.map((item) => item.id)).toEqual([
      "reddit:jsonp0",
      "reddit:jsonp1",
      "reddit:jsonp2",
      "reddit:jsonp3",
      "reddit:jsonp4",
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

  it("falls back to browser Reddit JSONP when the app API request fails before a response", async () => {
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

    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (document.head.querySelector("script")) break;
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    const script = document.head.querySelector("script");
    expect(script).toBeTruthy();

    resolveRedditJsonpScript(script, [
      {
        data: {
          children: [
            {
              data: {
                created_utc: 1_780_000_000,
                id: "jsonp123",
                over_18: true,
                permalink: "/r/kpop/comments/jsonp123/browser_jsonp_image/",
                post_hint: "image",
                subreddit: "kpop",
                title: "Browser JSONP image",
                url_overridden_by_dest: "https://i.redd.it/image.jpg",
              },
            },
          ],
        },
      },
    ]);

    await expect(request).resolves.toMatchObject([
      {
        id: "reddit:jsonp123",
        isNsfw: true,
        media: [{ url: "https://i.redd.it/image.jpg" }],
      },
    ]);
  });
});

function resolveRedditJsonpScript(
  script: HTMLScriptElement | null,
  payload: unknown,
) {
  const callbackName = new URL(script?.src ?? "").searchParams.get("jsonp");
  expect(callbackName).toBeTruthy();

  (window as unknown as Record<string, (payload: unknown) => void>)[
    callbackName!
  ](payload);
}
