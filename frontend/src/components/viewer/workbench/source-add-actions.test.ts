import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addRedditSourceAction,
  addUrlSourceAction,
} from "./source-add-actions";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("addRedditSourceAction", () => {
  it("returns a warning notice when Reddit blocks the hosted fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ error: "reddit_fetch_forbidden" }),
          {
            headers: { "Content-Type": "application/json" },
            status: 502,
          },
        );
      }),
    );

    const result = await addRedditSourceAction({
      redditInputMode: "links",
      subredditName: "",
      redditSort: "top",
      redditTimeRange: "week",
      redditUrls: "https://www.reddit.com/r/kpop/top/?t=week",
      redditLimit: 10,
      sourceGroupingMode: "stacked",
      availableSeparateSourceSlots: 1,
    });

    expect(result).toEqual({
      status: "error",
      error:
        "Reddit blocked this request. Hosted Reddit fetching can fail or return partial results.",
      notice: {
        tone: "warning",
        message:
          "Reddit blocked this request. Hosted Reddit fetching can fail or return partial results.",
      },
    });
  });
});

describe("addUrlSourceAction", () => {
  it("adds multiple URLs as one stacked source when URL grouping is stacked", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = new URL(String(input), "https://scrollable.test");
      const sourceUrl = requestUrl.searchParams.get("url") ?? "";
      const label = sourceUrl.includes("one") ? "One" : "Two";

      return {
        ok: true,
        json: async () => ({
          resolution: {
            status: "resolved",
            mode: "direct-media",
            hint: "direct-media",
            title: label,
            externalUrl: sourceUrl,
            items: [
              {
                id: `url:${label.toLowerCase()}`,
                source: "url",
                title: label,
                isNsfw: false,
                createdAt: "2026-04-24T00:00:00.000Z",
                media: [
                  {
                    type: "video",
                    url: `https://cdn.test/${label.toLowerCase()}.mp4`,
                  },
                ],
              },
            ],
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await addUrlSourceAction({
      urlValue: "https://example.test/one\nhttps://example.test/two",
      urlTitle: "URL stack",
      sourceGroupingMode: "stacked",
      availableSeparateSourceSlots: 1,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({
      title: "URL stack",
      sourceConfig: {
        kind: "url",
        url: "https://example.test/one",
        urls: ["https://example.test/one", "https://example.test/two"],
        title: "URL stack",
      },
      items: [
        { id: "url-row:legacy-1:url:one", title: "One" },
        { id: "url-row:legacy-2:url:two", title: "Two" },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
