import { afterEach, describe, expect, it, vi } from "vitest";

import {
  editPreparedRedditSourceAction,
  prepareUrlRowsSourceEditAction,
  prepareUrlSourceEditAction,
} from "./source-edit-actions";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("editPreparedRedditSourceAction", () => {
  it("returns a warning notice when Reddit returns no usable media", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ error: "reddit_source_has_no_supported_media" }),
          {
            headers: { "Content-Type": "application/json" },
            status: 422,
          },
        );
      }),
    );

    const result = await editPreparedRedditSourceAction({
      currentSource: undefined,
      urls: ["https://www.reddit.com/r/kpop/top/?t=week"],
      limit: 10,
      hiddenItemIds: [],
      unhiddenItemHashes: [],
    });

    expect(result).toEqual({
      status: "error",
      error:
        "Reddit returned no usable media. Reddit blocks hosted requests sometimes.",
      notice: {
        tone: "warning",
        message:
          "Reddit returned no usable media. Reddit blocks hosted requests sometimes.",
      },
    });
  });
});

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
