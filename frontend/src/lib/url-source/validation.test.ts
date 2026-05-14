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

  it("parses persisted URL source configs with ranged rows", () => {
    expect(
      parseUrlSourceConfig({
        kind: "url",
        url: "https://example.com/legacy",
        urls: ["https://example.com/clip", "https://example.com/clip"],
        urlRows: [
          {
            id: "row-a",
            url: "https://example.com/clip",
            videoTimeRange: { startSeconds: 10, endSeconds: 30 },
          },
          {
            id: "row-b",
            url: "https://example.com/clip",
            videoTimeRange: { startSeconds: 9015 },
          },
        ],
      }),
    ).toMatchObject({
      kind: "url",
      url: "https://example.com/clip",
      urls: ["https://example.com/clip", "https://example.com/clip"],
      urlRows: [
        {
          id: "row-a",
          url: "https://example.com/clip",
          videoTimeRange: { startSeconds: 10, endSeconds: 30 },
        },
        {
          id: "row-b",
          url: "https://example.com/clip",
          videoTimeRange: { startSeconds: 9015 },
        },
      ],
    });
  });

  it("rejects invalid URL source video time ranges", () => {
    expect(() =>
      parseUrlSourceConfig({
        kind: "url",
        url: "https://example.com/clip",
        urlRows: [
          {
            id: "row-a",
            url: "https://example.com/clip",
            videoTimeRange: { startSeconds: 30, endSeconds: 10 },
          },
        ],
      }),
    ).toThrow(/End must be after start/i);
  });
});
