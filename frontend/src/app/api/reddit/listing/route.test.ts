import { describe, expect, it, vi } from "vitest";

import { fetchRedditRuntimePostLinks } from "@/lib/reddit/client";
import { GET } from "./route";

vi.mock("@/lib/reddit/client", () => ({
  fetchRedditRuntimePostLinks: vi.fn(async () => ({
    items: [],
    unsupportedIds: [],
  })),
}));

describe("GET /api/reddit/listing", () => {
  it("passes custom Reddit post limits to the runtime client", async () => {
    await GET(
      new Request(
        "https://scrollable.test/api/reddit/listing?urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Fkpop%2Ftop%2F%3Ft%3Dweek&allowNsfw=true&limit=24",
      ),
    );

    expect(fetchRedditRuntimePostLinks).toHaveBeenCalledWith({
      urls: "https://www.reddit.com/r/kpop/top/?t=week",
      allowNsfw: "true",
      limit: "24",
    });
  });

  it("returns bad request for invalid subreddit listing URLs", async () => {
    vi.mocked(fetchRedditRuntimePostLinks).mockRejectedValueOnce(
      new Error("invalid_reddit_listing_url"),
    );

    const response = await GET(
      new Request(
        "https://scrollable.test/api/reddit/listing?urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Fkpop",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_reddit_listing_url",
    });
  });

  it("returns a gateway error when Reddit blocks the runtime fetch", async () => {
    vi.mocked(fetchRedditRuntimePostLinks).mockRejectedValueOnce(
      new Error("reddit_fetch_forbidden"),
    );

    const response = await GET(
      new Request(
        "https://scrollable.test/api/reddit/listing?urls=https%3A%2F%2Fwww.reddit.com%2Fr%2Fkpop%2Ftop%2F%3Ft%3Dweek",
      ),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "reddit_fetch_forbidden",
    });
  });
});
