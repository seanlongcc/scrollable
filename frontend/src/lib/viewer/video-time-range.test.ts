import { describe, expect, it } from "vitest";

import {
  formatVideoTimestamp,
  normalizeVideoTimeRangeDraft,
  parseVideoTimestamp,
  playbackStartSecondsForRange,
  randomVideoStartSecondsWithinRange,
  videoTimeRangeForDuration,
} from "./video-time-range";

describe("video time ranges", () => {
  it("parses colon timestamps into seconds", () => {
    expect(parseVideoTimestamp("2:30:15")).toBe(9015);
    expect(parseVideoTimestamp("30:15")).toBe(1815);
    expect(parseVideoTimestamp("0:05")).toBe(5);
  });

  it("rejects non-colon timestamps", () => {
    expect(parseVideoTimestamp("9015")).toBeNull();
    expect(parseVideoTimestamp("2h30m15s")).toBeNull();
    expect(parseVideoTimestamp("1:99")).toBeNull();
  });

  it("normalizes blank-open range drafts", () => {
    expect(normalizeVideoTimeRangeDraft({ start: "", end: "" })).toEqual({
      ok: true,
      range: undefined,
    });
    expect(normalizeVideoTimeRangeDraft({ start: "2:30:15", end: "" })).toEqual(
      {
        ok: true,
        range: { startSeconds: 9015 },
      },
    );
  });

  it("rejects ranges that end before they start", () => {
    expect(
      normalizeVideoTimeRangeDraft({ start: "1:00", end: "0:59" }),
    ).toEqual({
      ok: false,
      error: "End must be after start",
    });
  });

  it("formats seconds as compact timestamps", () => {
    expect(formatVideoTimestamp(5)).toBe("0:05");
    expect(formatVideoTimestamp(1815)).toBe("30:15");
    expect(formatVideoTimestamp(9015)).toBe("2:30:15");
  });

  it("keeps random video starts inside the selected range", () => {
    expect(
      randomVideoStartSecondsWithinRange({
        durationSeconds: 100,
        range: { startSeconds: 20, endSeconds: 50 },
        random: () => 0.5,
      }),
    ).toBe(35);
  });

  it("ignores selected starts beyond the loaded video duration", () => {
    expect(
      videoTimeRangeForDuration({
        range: { startSeconds: 120, endSeconds: 150 },
        durationSeconds: 30,
      }),
    ).toBeUndefined();
    expect(
      playbackStartSecondsForRange({
        currentSeconds: 120,
        range: { startSeconds: 120 },
        durationSeconds: 30,
      }),
    ).toBe(0);
    expect(
      randomVideoStartSecondsWithinRange({
        durationSeconds: 30,
        range: { startSeconds: 120 },
        random: () => 0.5,
      }),
    ).toBe(0);
  });

  it("clamps selected range ends to the loaded video duration", () => {
    expect(
      videoTimeRangeForDuration({
        range: { startSeconds: 10, endSeconds: 120 },
        durationSeconds: 30,
      }),
    ).toEqual({ startSeconds: 10, endSeconds: 30 });
  });
});
