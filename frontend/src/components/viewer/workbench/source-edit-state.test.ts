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
});
