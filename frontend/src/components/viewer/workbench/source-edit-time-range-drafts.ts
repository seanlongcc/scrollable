import {
  formatVideoTimestamp,
  normalizeVideoTimeRangeDraft,
  parseVideoTimestamp,
  type VideoTimeRange,
} from "@/lib/viewer/video-time-range";

export type TimeRangeDraft = {
  start: string;
  end: string;
};

export type TimeRangeDraftResult =
  | { ok: true; range?: VideoTimeRange }
  | { ok: false; error: string };

export function videoTimeRangeDraft(range: VideoTimeRange | undefined) {
  return {
    start:
      range?.startSeconds !== undefined && range.startSeconds > 0
        ? formatVideoTimestamp(range.startSeconds)
        : "",
    end:
      range?.endSeconds !== undefined
        ? formatVideoTimestamp(range.endSeconds)
        : "",
  };
}

export function normalizeRangeDraft(
  draft: TimeRangeDraft,
  label: string,
): TimeRangeDraftResult {
  const result = normalizeVideoTimeRangeDraft(draft);
  if (result.ok) return result;

  return { ok: false, error: `${label}: ${result.error}` };
}

export function startDraftForDuration(
  start: string,
  durationSeconds: number | undefined,
) {
  return startDraftExceedsKnownDuration(start, durationSeconds) ? "" : start;
}

function startDraftExceedsKnownDuration(
  start: string,
  durationSeconds: number | undefined,
) {
  if (durationSeconds === undefined || !Number.isFinite(durationSeconds)) {
    return false;
  }

  const startSeconds = parseVideoTimestamp(start);
  return startSeconds !== null && startSeconds >= durationSeconds;
}
