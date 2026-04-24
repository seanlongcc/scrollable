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

  it("normalizes direct Reddit post links and rejects listing URLs", () => {
    expect(
      parseFeedConfigInput({
        postUrls: "https://old.reddit.com/r/aww/comments/abc123/title",
      }).postUrls,
    ).toEqual(["https://www.reddit.com/r/aww/comments/abc123/title/"]);
    expect(() =>
      parseFeedConfigInput({ postUrls: "https://www.reddit.com/r/pics/" }),
    ).toThrow(/postUrls/i);
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
});
