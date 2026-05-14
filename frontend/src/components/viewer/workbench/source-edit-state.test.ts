import { describe, expect, it } from "vitest";

import { buildEditedUrlSourceConfig } from "./source-edit-state";

describe("buildEditedUrlSourceConfig", () => {
  it("keeps all URLs for an edited stacked URL source", () => {
    const urls = ["https://example.com/one", "https://example.com/two"];

    expect(
      buildEditedUrlSourceConfig({
        urls,
        title: "Stack",
      }),
    ).toEqual({
      kind: "url",
      url: urls[0],
      urls,
      title: "Stack",
    });
  });

  it("stores a single edited URL without a redundant urls array", () => {
    expect(
      buildEditedUrlSourceConfig({
        urls: ["https://example.com/one"],
        title: "",
      }),
    ).toEqual({
      kind: "url",
      url: "https://example.com/one",
    });
  });

  it("stores stable edited URL rows with video time ranges", () => {
    const rows = [
      {
        id: "row-a",
        url: "https://example.com/one",
        videoTimeRange: { startSeconds: 10, endSeconds: 20 },
      },
      {
        id: "row-b",
        url: "https://example.com/one",
        videoTimeRange: { startSeconds: 30, endSeconds: 40 },
      },
    ];

    expect(
      buildEditedUrlSourceConfig({
        urls: rows.map((row) => row.url),
        urlRows: rows,
        title: "Duplicates",
      }),
    ).toEqual({
      kind: "url",
      url: "https://example.com/one",
      urls: ["https://example.com/one", "https://example.com/one"],
      urlRows: rows,
      title: "Duplicates",
    });
  });
});
