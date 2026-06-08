import { describe, expect, it } from "vitest";

import { runtimeSourceNotice } from "./runtime-source-notices";

describe("runtimeSourceNotice", () => {
  it("warns when Reddit blocks hosted runtime fetching", () => {
    expect(runtimeSourceNotice(new Error("reddit_fetch_forbidden"))).toEqual({
      tone: "warning",
      message:
        "Reddit blocked this request. Hosted Reddit fetching can fail or return partial results.",
    });
  });

  it("warns when Reddit returns no usable runtime media", () => {
    expect(
      runtimeSourceNotice(new Error("reddit_source_has_no_supported_media")),
    ).toEqual({
      tone: "warning",
      message:
        "Reddit returned no usable media. Reddit blocks hosted requests sometimes.",
    });
  });

  it("warns when Reddit rate-limits runtime fetching", () => {
    expect(runtimeSourceNotice(new Error("reddit_rate_limited"))).toEqual({
      tone: "warning",
      message: "Reddit rate-limited this request. Try again later.",
    });
  });

  it("keeps unknown runtime errors as errors", () => {
    expect(
      runtimeSourceNotice(new Error("reddit_source_fetch_failed"), {
        fallback: "Reddit fetch failed",
      }),
    ).toEqual({
      tone: "error",
      message: "reddit_source_fetch_failed",
    });
  });
});
