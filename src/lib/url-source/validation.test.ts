import { describe, expect, it } from "vitest";

import { parseUrlSourceConfig, normalizeUrlSourceUrl } from "./validation";

describe("URL source validation", () => {
  it("accepts http and https URLs", () => {
    expect(normalizeUrlSourceUrl("https://example.com/watch?v=1")).toBe(
      "https://example.com/watch?v=1",
    );
    expect(normalizeUrlSourceUrl(" http://example.com/image.jpg ")).toBe(
      "http://example.com/image.jpg",
    );
  });

  it.each([
    "file:///tmp/photo.jpg",
    "data:text/html,hi",
    "javascript:alert(1)",
  ])("rejects unsupported URL protocol %s", (url) => {
    expect(() => normalizeUrlSourceUrl(url)).toThrow(/http/i);
  });

  it("rejects malformed URLs", () => {
    expect(() => normalizeUrlSourceUrl("not a url")).toThrow(/url/i);
  });

  it("parses persisted URL source configs with resolver hints", () => {
    expect(
      parseUrlSourceConfig({
        kind: "url",
        url: "https://example.com/post",
        title: "Example",
        resolverHint: "provider:reddit",
        runtimeItems: [{ id: "runtime-1" }],
      }),
    ).toEqual({
      kind: "url",
      url: "https://example.com/post",
      title: "Example",
      resolverHint: "provider:reddit",
    });
  });
});
