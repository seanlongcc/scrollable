export type RuntimeNoticeTone = "error" | "warning";

export type RuntimeNotice = {
  tone: RuntimeNoticeTone;
  message: string;
};

const REDDIT_RUNTIME_WARNING_MESSAGES: Record<string, string> = {
  reddit_fetch_forbidden:
    "Reddit blocked this request. Hosted Reddit fetching can fail or return partial results.",
  reddit_rate_limited: "Reddit rate-limited this request. Try again later.",
  reddit_post_has_no_supported_media:
    "Reddit returned no usable media. Reddit blocks hosted requests sometimes.",
  reddit_source_has_no_supported_media:
    "Reddit returned no usable media. Reddit blocks hosted requests sometimes.",
};

export function runtimeSourceNotice(
  error: unknown,
  { fallback = "Runtime source failed" }: { fallback?: string } = {},
): RuntimeNotice {
  const message = error instanceof Error ? error.message : fallback;
  const redditWarningMessage = REDDIT_RUNTIME_WARNING_MESSAGES[message];

  if (redditWarningMessage) {
    return {
      tone: "warning",
      message: redditWarningMessage,
    };
  }

  return {
    tone: "error",
    message,
  };
}

export function prefixRuntimeNotice(
  notice: RuntimeNotice,
  prefix: string,
): RuntimeNotice {
  if (!notice.message) {
    return {
      tone: notice.tone,
      message: prefix,
    };
  }

  return {
    tone: notice.tone,
    message: `${prefix}: ${notice.message}`,
  };
}
