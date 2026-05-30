import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeFeedItem } from "@/lib/feed/types";
import { createTimerState } from "@/lib/viewer/timer";
import {
  applyRuntimeHydrationResults,
  createRedditSessionSources,
  fetchRedditRuntimeItems,
  fetchUrlRuntimeItemsForSource,
} from "./runtime-sources";
import type { FeedSession } from "./types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchRedditRuntimeItems", () => {
  it("fetches Reddit listing media through the app API", async () => {
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

      throw new Error(`Unexpected fetch: ${url}`);
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
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reddit/listing?urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Fpics%2Ftop%2F%3Ft%3Dweek&allowNsfw=true&limit=24",
      { cache: "no-store" },
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("https://www.reddit.com"),
      ),
    ).toBe(false);
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

      throw new Error(`Unexpected fetch: ${url}`);
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
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reddit/listing?urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Fpics%2Fcomments%2Fabc123%2Ftitle%2F&allowNsfw=true&limit=20",
      { cache: "no-store" },
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("https://www.reddit.com"),
      ),
    ).toBe(false);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/url/resolve"),
      ),
    ).toBe(false);
  });

  it("keeps duplicate URL rows distinct and applies row video ranges", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        resolution: {
          status: "resolved",
          mode: "direct-media",
          hint: "direct-media",
          title: "Clip",
          externalUrl: "https://example.com/clip.mp4",
          items: [
            {
              id: "url:clip",
              source: "url",
              title: "Clip",
              isNsfw: false,
              createdAt: "2026-04-24T00:00:00.000Z",
              media: [{ type: "video", url: "https://cdn.test/clip.mp4" }],
            },
          ],
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchUrlRuntimeItemsForSource({
      kind: "url",
      url: "https://example.com/clip.mp4",
      urls: ["https://example.com/clip.mp4", "https://example.com/clip.mp4"],
      urlRows: [
        {
          id: "row-a",
          url: "https://example.com/clip.mp4",
          videoTimeRange: { startSeconds: 10, endSeconds: 30 },
        },
        {
          id: "row-b",
          url: "https://example.com/clip.mp4",
          videoTimeRange: { startSeconds: 9015 },
        },
      ],
    });

    expect(result.items.map((item) => item.id)).toEqual([
      "url-row:row-a:url:clip",
      "url-row:row-b:url:clip",
    ]);
    expect(result.items[0]?.media[0]).toMatchObject({
      type: "video",
      videoTimeRange: { startSeconds: 10, endSeconds: 30 },
    });
    expect(result.items[1]?.media[0]).toMatchObject({
      type: "video",
      videoTimeRange: { startSeconds: 9015 },
    });
  });
});

describe("createRedditSessionSources", () => {
  it("reuses one Reddit fetch for duplicate separate post sources", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "reddit:duplicate",
            source: "reddit",
            title: "Duplicate post",
            subreddit: "pics",
            isNsfw: false,
            createdAt: "2026-04-24T00:00:00.000Z",
            media: [{ type: "image", url: "https://cdn.test/duplicate.jpg" }],
          },
        ],
      }),
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
      "/api/reddit/listing?urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Fpics%2Fcomments%2Fabc123%2Ftitle%2F&allowNsfw=true&limit=10",
      { cache: "no-store" },
    );
  });

  it("randomizes grouped Reddit source item order", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: ["first", "second", "third"].map((id) => ({
          id: `reddit:${id}`,
          source: "reddit",
          title: id,
          subreddit: "pics",
          isNsfw: false,
          createdAt: "2026-04-24T00:00:00.000Z",
          media: [{ type: "image", url: `https://cdn.test/${id}.jpg` }],
        })),
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

describe("applyRuntimeHydrationResults", () => {
  it("restores URL source order when source shuffle is disabled", () => {
    const first = item("first");
    const second = item("second");
    const [next] = applyRuntimeHydrationResults(
      [
        session({
          items: [second, first],
          allItems: [first, second],
          isOrderRandomized: false,
          sourceConfig: { kind: "url", url: "https://example.com/source" },
        }),
      ],
      [
        {
          id: "session-1",
          items: [second, first],
          allItems: [first, second],
          isOrderRandomized: true,
        },
      ],
    );

    expect(next.items.map((item) => item.id)).toEqual(["first", "second"]);
    expect(next.isOrderRandomized).toBe(false);
  });
});

function session(overrides: Partial<FeedSession> = {}): FeedSession {
  const items = [item("first"), item("second")];

  return {
    id: "session-1",
    title: "Source",
    layerId: "layer-1",
    timerMode: "global",
    timer: createTimerState({ durationSeconds: 10, itemCount: items.length }),
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 2, rowSpan: 2 },
    items,
    allItems: items,
    sourceConfig: { kind: "url", url: "https://example.com/source" },
    ...overrides,
  };
}

function item(id: string): RuntimeFeedItem {
  return {
    id,
    source: "url",
    title: id,
    isNsfw: false,
    createdAt: "2026-04-24T00:00:00.000Z",
    media: [{ type: "image", url: `https://cdn.test/${id}.jpg` }],
  };
}
