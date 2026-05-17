import { describe, expect, it } from "vitest";

import {
  localEntriesFromSource,
  prepareLocalVideoTimeRanges,
  type LocalEditEntry,
} from "./source-edit-local-files";
import type { FeedSession } from "./types";
import {
  prepareUrlRowsForSave,
  urlRowsFromSource,
  type UrlEditRow,
} from "./source-edit-url-rows";

describe("source edit video ranges", () => {
  it("clears known out-of-duration URL starts during save preparation", () => {
    const rows: UrlEditRow[] = [
      {
        id: "row-1",
        url: "https://example.com/clip.mp4",
        start: "10:00",
        end: "",
        durationSeconds: 360,
      },
    ];

    const result = prepareUrlRowsForSave(rows);

    expect(result.ok).toBe(true);
    expect(result.editorRows[0]?.start).toBe("");
    if (!result.ok) return;
    expect(result.rows[0]).toEqual({
      id: "row-1",
      url: "https://example.com/clip.mp4",
    });
  });

  it("clears known out-of-duration local video starts during save preparation", () => {
    const entries: LocalEditEntry[] = [
      {
        file: new File(["video"], "clip.mp4", { type: "video/mp4" }),
        mediaType: "video",
        start: "10:00",
        end: "",
        durationSeconds: 360,
      },
    ];

    const result = prepareLocalVideoTimeRanges(entries);

    expect(result.ok).toBe(true);
    expect(result.entries[0]?.start).toBe("");
    if (!result.ok) return;
    expect(result.videoTimeRanges).toBeUndefined();
  });

  it("uses player-known URL video duration when preparing row drafts", () => {
    const rows = urlRowsFromSource(urlSourceWithInvalidStart(), {
      "session-1:url-row:row-1:item-1:0": 360,
    });

    const result = prepareUrlRowsForSave(rows);

    expect(result.ok).toBe(true);
    expect(result.editorRows[0]?.start).toBe("");
    if (!result.ok) return;
    expect(result.rows[0]).not.toHaveProperty("videoTimeRange");
  });

  it("uses player-known local video duration when preparing file drafts", () => {
    const entries = localEntriesFromSource(localSourceWithInvalidStart(), {
      "session-1:local:item-1:0": 360,
    });

    const result = prepareLocalVideoTimeRanges(entries);

    expect(result.ok).toBe(true);
    expect(result.entries[0]?.start).toBe("");
    if (!result.ok) return;
    expect(result.videoTimeRanges).toBeUndefined();
  });
});

function urlSourceWithInvalidStart(): FeedSession {
  return {
    id: "session-1",
    title: "URL video",
    layerId: "layer-1",
    timerMode: "global",
    items: [
      {
        id: "url-row:row-1:item-1",
        source: "url",
        title: "clip.mp4",
        isNsfw: false,
        createdAt: "2026-05-14T00:00:00.000Z",
        media: [
          {
            type: "video",
            url: "blob:url-video",
            videoTimeRange: { startSeconds: 600 },
          },
        ],
      },
    ],
    sourceConfig: {
      kind: "url",
      url: "https://example.com/clip.mp4",
      urlRows: [
        {
          id: "row-1",
          url: "https://example.com/clip.mp4",
          videoTimeRange: { startSeconds: 600 },
        },
      ],
    },
    timer: {
      activeIndex: 0,
      durationSeconds: 10,
      elapsedMs: 0,
      isPaused: false,
      itemCount: 1,
    },
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
  };
}

function localSourceWithInvalidStart(): FeedSession {
  const file = new File(["video"], "clip.mp4", { type: "video/mp4" });

  return {
    id: "session-1",
    title: "Local video",
    layerId: "layer-1",
    timerMode: "global",
    items: [
      {
        id: "local:item-1",
        source: "local",
        title: "clip.mp4",
        isNsfw: false,
        createdAt: "2026-05-14T00:00:00.000Z",
        media: [
          {
            type: "video",
            url: "blob:local-video",
            videoTimeRange: { startSeconds: 600 },
          },
        ],
      },
    ],
    localFiles: [file],
    sourceConfig: {
      kind: "local",
      fileCount: 1,
      videoTimeRanges: { 0: { startSeconds: 600 } },
    },
    timer: {
      activeIndex: 0,
      durationSeconds: 10,
      elapsedMs: 0,
      isPaused: false,
      itemCount: 1,
    },
    fixedSlot: 0,
    freeRect: { column: 1, row: 1, columnSpan: 4, rowSpan: 4 },
  };
}
