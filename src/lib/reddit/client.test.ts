import { describe, expect, it } from "vitest";

import { parseRedditListingInput } from "./client";

describe("parseRedditListingInput", () => {
  it("parses allowNsfw=false query strings as false", () => {
    expect(
      parseRedditListingInput({ subreddit: "pics", allowNsfw: "false" })
        .allowNsfw,
    ).toBe(false);
  });

  it("keeps Reddit listing defaults bounded", () => {
    expect(parseRedditListingInput({ subreddit: "r/pics" })).toMatchObject({
      subreddit: "pics",
      sort: "top",
      timeRange: "day",
      limit: 20,
      skip: 0,
      allowNsfw: true,
    });
  });
});
