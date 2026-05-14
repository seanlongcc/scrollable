export type VideoTimeRange = {
  startSeconds?: number;
  endSeconds?: number;
};

export type VideoTimeRangeDraft = {
  start: string;
  end: string;
};

export type VideoTimeRangeDraftResult =
  | { ok: true; range?: VideoTimeRange }
  | { ok: false; error: string };

const MINUTE_SECOND_PATTERN = /^(\d+):([0-5]\d)$/;
const HOUR_MINUTE_SECOND_PATTERN = /^(\d+):([0-5]\d):([0-5]\d)$/;

export function parseVideoTimestamp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hourMatch = trimmed.match(HOUR_MINUTE_SECOND_PATTERN);
  if (hourMatch) {
    const hours = Number(hourMatch[1]);
    const minutes = Number(hourMatch[2]);
    const seconds = Number(hourMatch[3]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  const minuteMatch = trimmed.match(MINUTE_SECOND_PATTERN);
  if (minuteMatch) {
    const minutes = Number(minuteMatch[1]);
    const seconds = Number(minuteMatch[2]);
    return minutes * 60 + seconds;
  }

  return null;
}

export function formatVideoTimestamp(seconds: number) {
  const normalized = normalizeVideoTimeSeconds(seconds) ?? 0;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const remainderSeconds = normalized % 60;
  const paddedSeconds = String(remainderSeconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

export function normalizeVideoTimeRangeDraft({
  start,
  end,
}: VideoTimeRangeDraft): VideoTimeRangeDraftResult {
  const startValue = start.trim() ? parseVideoTimestamp(start) : 0;
  const endValue = end.trim() ? parseVideoTimestamp(end) : undefined;

  if (startValue === null) {
    return { ok: false, error: "Use m:ss or h:mm:ss for start" };
  }

  if (endValue === null) {
    return { ok: false, error: "Use m:ss or h:mm:ss for end" };
  }

  return normalizeVideoTimeRange({
    ...(startValue > 0 ? { startSeconds: startValue } : {}),
    ...(endValue !== undefined ? { endSeconds: endValue } : {}),
  });
}

export function normalizeVideoTimeRange(
  range: VideoTimeRange | undefined,
): VideoTimeRangeDraftResult {
  if (!range) return { ok: true, range: undefined };

  const startSeconds = normalizeVideoTimeSeconds(range.startSeconds) ?? 0;
  const endSeconds =
    range.endSeconds === undefined
      ? undefined
      : normalizeVideoTimeSeconds(range.endSeconds);

  if (endSeconds === null) {
    return { ok: false, error: "End must be a valid timestamp" };
  }

  if (endSeconds !== undefined && endSeconds <= startSeconds) {
    return { ok: false, error: "End must be after start" };
  }

  const normalized = {
    ...(startSeconds > 0 ? { startSeconds } : {}),
    ...(endSeconds !== undefined ? { endSeconds } : {}),
  };

  return Object.keys(normalized).length
    ? { ok: true, range: normalized }
    : { ok: true, range: undefined };
}

export function normalizeVideoTimeSeconds(value: unknown) {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || typeof value !== "number") return null;

  const seconds = Math.floor(value);
  return seconds >= 0 ? seconds : null;
}

export function videoTimeRangeStartSeconds(range: VideoTimeRange | undefined) {
  return normalizeVideoTimeSeconds(range?.startSeconds) ?? 0;
}

export function videoTimeRangeEndSeconds(range: VideoTimeRange | undefined) {
  return normalizeVideoTimeSeconds(range?.endSeconds) ?? undefined;
}

export function videoTimeRangeKey(range: VideoTimeRange | undefined) {
  const normalized = normalizeVideoTimeRange(range);
  if (!normalized.ok || !normalized.range) return "full";

  return `${normalized.range.startSeconds ?? 0}:${normalized.range.endSeconds ?? ""}`;
}

export function playbackStartSecondsForRange({
  currentSeconds,
  range,
  durationSeconds,
}: {
  currentSeconds: number;
  range?: VideoTimeRange;
  durationSeconds?: number;
}) {
  const effectiveRange = videoTimeRangeForDuration({
    range,
    durationSeconds,
  });
  if (range && !effectiveRange) return 0;
  const startSeconds = videoTimeRangeStartSeconds(effectiveRange);
  const endSeconds =
    videoTimeRangeEndSeconds(effectiveRange) ??
    finiteVideoDurationSeconds(durationSeconds);

  if (
    Number.isFinite(currentSeconds) &&
    currentSeconds > startSeconds &&
    (endSeconds === undefined || currentSeconds < endSeconds)
  ) {
    return Math.floor(currentSeconds);
  }

  return startSeconds;
}

export function isAtOrAfterVideoRangeEnd({
  currentSeconds,
  range,
}: {
  currentSeconds: number;
  range?: VideoTimeRange;
}) {
  const endSeconds = videoTimeRangeEndSeconds(range);
  return endSeconds !== undefined && currentSeconds >= endSeconds;
}

export function isBeforeVideoRangeStart({
  currentSeconds,
  range,
}: {
  currentSeconds: number;
  range?: VideoTimeRange;
}) {
  return currentSeconds < videoTimeRangeStartSeconds(range);
}

export function randomVideoStartSecondsWithinRange({
  durationSeconds,
  range,
  random = Math.random,
}: {
  durationSeconds: number;
  range?: VideoTimeRange;
  random?: () => number;
}) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 1) return 0;

  const effectiveRange = videoTimeRangeForDuration({
    range,
    durationSeconds,
  });
  if (range && !effectiveRange) return 0;
  const startSeconds = videoTimeRangeStartSeconds(effectiveRange);
  const rangeEndSeconds = videoTimeRangeEndSeconds(effectiveRange);
  const endSeconds = Math.min(
    durationSeconds,
    rangeEndSeconds ?? durationSeconds,
  );
  if (endSeconds <= startSeconds + 1) return startSeconds;

  return startSeconds + Math.floor(random() * (endSeconds - startSeconds));
}

export function videoTimeRangeForDuration({
  range,
  durationSeconds,
}: {
  range?: VideoTimeRange;
  durationSeconds?: number;
}): VideoTimeRange | undefined {
  const normalized = normalizeVideoTimeRange(range);
  if (!normalized.ok || !normalized.range) return undefined;

  const duration = finiteVideoDurationSeconds(durationSeconds);
  if (duration === undefined) return normalized.range;

  const startSeconds = normalized.range.startSeconds ?? 0;
  if (startSeconds >= duration) return undefined;

  const endSeconds =
    normalized.range.endSeconds === undefined
      ? undefined
      : Math.min(normalized.range.endSeconds, duration);

  if (endSeconds !== undefined && endSeconds <= startSeconds) {
    return undefined;
  }

  const effectiveRange = {
    ...(startSeconds > 0 ? { startSeconds } : {}),
    ...(endSeconds !== undefined ? { endSeconds } : {}),
  };

  return Object.keys(effectiveRange).length ? effectiveRange : undefined;
}

function finiteVideoDurationSeconds(durationSeconds: number | undefined) {
  if (!Number.isFinite(durationSeconds) || durationSeconds === undefined) {
    return undefined;
  }

  return durationSeconds > 0 ? durationSeconds : undefined;
}
