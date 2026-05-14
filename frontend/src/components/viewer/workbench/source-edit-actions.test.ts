import { describe, expect, it } from "vitest";

import {
  prepareUrlRowsSourceEditAction,
  prepareUrlSourceEditAction,
} from "./source-edit-actions";

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

  it("keeps duplicate URL rows with distinct video ranges", () => {
    expect(
      prepareUrlRowsSourceEditAction({
        rows: [
          {
            id: "row-a",
            url: " https://example.com/video.mp4 ",
            videoTimeRange: { startSeconds: 10, endSeconds: 20 },
          },
          {
            id: "row-b",
            url: "https://example.com/video.mp4",
            videoTimeRange: { startSeconds: 30, endSeconds: 40 },
          },
        ],
      }),
    ).toEqual({
      status: "ready",
      rows: [
        {
          id: "row-a",
          url: "https://example.com/video.mp4",
          videoTimeRange: { startSeconds: 10, endSeconds: 20 },
        },
        {
          id: "row-b",
          url: "https://example.com/video.mp4",
          videoTimeRange: { startSeconds: 30, endSeconds: 40 },
        },
      ],
    });
  });

  it("rejects URL rows with invalid video ranges", () => {
    expect(
      prepareUrlRowsSourceEditAction({
        rows: [
          {
            id: "row-a",
            url: "https://example.com/video.mp4",
            videoTimeRange: { startSeconds: 20, endSeconds: 10 },
          },
        ],
      }),
    ).toEqual({
      status: "validation-error",
      error: "End must be after start",
    });
  });
});
