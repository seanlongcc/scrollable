import { describe, expect, it } from "vitest";

import { parseFeedConfigInput } from "./feed-config";

describe("parseFeedConfigInput", () => {
  it("applies Reddit feed defaults without storing runtime media fields", () => {
    const result = parseFeedConfigInput({ subreddit: "pics" });

    expect(result).toMatchObject({
      source: "reddit",
      subreddit: "pics",
      sort: "top",
      timeRange: "day",
      limit: 20,
      skip: 0,
      timerSeconds: 10,
      isNsfw: false,
    });
    expect(result).not.toHaveProperty("postIds");
    expect(result).not.toHaveProperty("mediaUrls");
    expect(result).not.toHaveProperty("thumbnails");
  });

  it("normalizes subreddit names and rejects unsafe limits", () => {
    expect(parseFeedConfigInput({ subreddit: "r/aww", limit: 7 }).subreddit).toBe(
      "aww",
    );
    expect(() => parseFeedConfigInput({ subreddit: "pics", limit: 101 })).toThrow(
      /limit/i,
    );
  });

  it("accepts one-second timers and rejects zero-second timers", () => {
    expect(
      parseFeedConfigInput({ subreddit: "pics", timerSeconds: 1 }).timerSeconds,
    ).toBe(1);
    expect(() =>
      parseFeedConfigInput({ subreddit: "pics", timerSeconds: 0 }),
    ).toThrow(/timerSeconds/i);
  });
});
