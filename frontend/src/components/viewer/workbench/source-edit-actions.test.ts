import { describe, expect, it } from "vitest";

import { prepareUrlSourceEditAction } from "./source-edit-actions";

describe("prepareUrlSourceEditAction", () => {
  it("keeps multiple edited URL values", () => {
    expect(
      prepareUrlSourceEditAction({
        urlValue:
          "https://example.com/one\nhttps://example.com/two, https://example.com/three",
      }),
    ).toEqual({
      status: "ready",
      urls: [
        "https://example.com/one",
        "https://example.com/two",
        "https://example.com/three",
      ],
    });
  });

  it("requires at least one URL", () => {
    expect(prepareUrlSourceEditAction({ urlValue: "  \n " })).toEqual({
      status: "validation-error",
      error: "Enter one or more URLs",
    });
  });
});
