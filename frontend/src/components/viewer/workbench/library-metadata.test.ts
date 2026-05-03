import { describe, expect, it } from "vitest";

import { templateLibraryMetadata } from "./library-metadata";

describe("templateLibraryMetadata", () => {
  it("omits redundant layer counts from saved template rows", () => {
    expect(templateLibraryMetadata(3)).toEqual({
      visible: "free · 3 box",
      title: "free template · 3 boxes",
    });
  });
});
