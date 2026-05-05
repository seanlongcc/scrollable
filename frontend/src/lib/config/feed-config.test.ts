import { describe, expect, it } from "vitest";

import { parseFeedConfigInput } from "./feed-config";

describe("parseFeedConfigInput", () => {
  it("applies Reddit feed defaults without storing runtime media fields", () => {
    const result = parseFeedConfigInput({
      postUrls:
        "https://www.reddit.com/r/kpop/comments/1sui8xh/nmixx_the_5th_ep_heavy_serenade_concept_photo/",
    });

    expect(result).toMatchObject({
      source: "reddit",
      postUrls: [
        "https://www.reddit.com/r/kpop/comments/1sui8xh/nmixx_the_5th_ep_heavy_serenade_concept_photo/",
      ],
      timerSeconds: 10,
      isNsfw: false,
    });
    expect(result).not.toHaveProperty("postIds");
    expect(result).not.toHaveProperty("mediaUrls");
    expect(result).not.toHaveProperty("thumbnails");
  });

  it("normalizes Reddit post and subreddit listing URLs", () => {
    const post = parseFeedConfigInput({
      postUrls: "https://old.reddit.com/r/aww/comments/abc123/title",
    });
    const listing = parseFeedConfigInput({
      postUrls: "https://old.reddit.com/r/kpop/top/?t=week",
    });

    if (post.source !== "reddit" || listing.source !== "reddit") {
      throw new Error("Expected Reddit config");
    }

    expect(post.postUrls).toEqual([
      "https://www.reddit.com/r/aww/comments/abc123/title/",
    ]);
    expect(listing.postUrls).toEqual([
      "https://www.reddit.com/r/kpop/top/?t=week",
    ]);
    expect(() =>
      parseFeedConfigInput({ postUrls: "https://www.reddit.com/r/pics/" }),
    ).toThrow(/postUrls/i);
  });

  it("accepts up to 100 Reddit source URLs", () => {
    const urls = Array.from(
      { length: 100 },
      (_entry, index) =>
        `https://www.reddit.com/r/pics/comments/post${index}/title/`,
    );

    const result = parseFeedConfigInput({
      postUrls: urls,
    });

    expect(result.source).toBe("reddit");
    if (result.source === "reddit") {
      expect(result.postUrls).toHaveLength(100);
    }
  });

  it("rejects more than 100 Reddit source URLs", () => {
    const urls = Array.from(
      { length: 101 },
      (_entry, index) =>
        `https://www.reddit.com/r/pics/comments/post${index}/title/`,
    );

    expect(() => parseFeedConfigInput({ postUrls: urls })).toThrow(/postUrls/i);
  });

  it("accepts one-second timers and rejects zero-second timers", () => {
    expect(
      parseFeedConfigInput({
        postUrls: "https://www.reddit.com/r/pics/comments/abc123/title/",
        timerSeconds: 1,
      }).timerSeconds,
    ).toBe(1);
    expect(() =>
      parseFeedConfigInput({
        postUrls: "https://www.reddit.com/r/pics/comments/abc123/title/",
        timerSeconds: 0,
      }),
    ).toThrow(/timerSeconds/i);
  });

  it("accepts unified URL sources and strips runtime-only fields", () => {
    const result = parseFeedConfigInput({
      source: "url",
      url: "https://example.com/watch?v=1",
      title: "Example video",
      resolverHint: "iframe",
      mediaUrls: ["https://cdn.test/preview.jpg"],
      providerJson: { id: "abc123" },
    } as unknown as Parameters<typeof parseFeedConfigInput>[0]);

    expect(result).toEqual({
      source: "url",
      url: "https://example.com/watch?v=1",
      title: "Example video",
      resolverHint: "iframe",
      timerSeconds: 10,
      isNsfw: false,
      displayMode: "single",
    });
    expect(result).not.toHaveProperty("mediaUrls");
    expect(result).not.toHaveProperty("providerJson");
  });

  it.each(["file:///tmp/a.png", "data:text/html,hi", "javascript:alert(1)"])(
    "rejects forbidden URL source protocol %s",
    (url) => {
      expect(() => parseFeedConfigInput({ source: "url", url })).toThrow(
        /url/i,
      );
    },
  );
});
