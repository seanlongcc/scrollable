import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

import type { RuntimeFeedItem, RuntimeMedia } from "@/lib/feed/types";
import { youtubeEmbedUrlFromId } from "./youtube-embed";

type YtDlpObject = Record<string, unknown>;

export type CommandCandidate = {
  command: string;
  args: string[];
};

type YtDlpCommandCandidateOptions = {
  cwd?: string;
  env?: Record<string, string | undefined>;
  platform?: NodeJS.Platform;
};

type YtDlpFailureDiagnosticInput = {
  url: string;
  candidate: CommandCandidate;
  error: unknown;
};

export type YtDlpFailureDiagnostic = {
  event: "yt_dlp_resolution_failed";
  sourceHost: string;
  candidate: string;
  reason: string;
  detail?: string;
};

type MediaCandidate = {
  media: RuntimeMedia;
  score: number;
};

export type YtDlpRuntimeResolution = {
  provider: string;
  title: string;
  items?: RuntimeFeedItem[];
  iframeUrl?: string;
  metadata?: {
    thumbnailUrl?: string;
  };
};

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_STDOUT_BYTES = 8 * 1024 * 1024;

const VIDEO_EXTENSIONS = new Set(["m4v", "mov", "mp4", "ogv", "webm"]);
const AUDIO_EXTENSIONS = new Set([
  "aac",
  "flac",
  "m4a",
  "mp3",
  "oga",
  "ogg",
  "opus",
  "wav",
  "weba",
]);

export async function extractYtDlpRuntimeItems(
  url: string,
): Promise<RuntimeFeedItem[]> {
  const resolution = await extractYtDlpRuntimeResolution(url);

  return resolution?.items ?? [];
}

export async function extractYtDlpRuntimeResolution(
  url: string,
): Promise<YtDlpRuntimeResolution | null> {
  if (!isHttpUrl(url)) return null;

  for (const candidate of commandCandidates()) {
    try {
      const info = await runYtDlp(candidate, url);
      const resolution = ytDlpInfoToRuntimeResolution(url, info);
      if (!resolution) {
        logYtDlpDiagnostic({
          event: "yt_dlp_resolution_failed",
          sourceHost: hostFromUrl(url),
          candidate: commandCandidateLabel(candidate),
          reason: "no_playable_media",
        });
      }
      return resolution;
    } catch (error) {
      if (error instanceof YtDlpUnavailableError) continue;
      logYtDlpDiagnostic(ytDlpFailureDiagnostic({ url, candidate, error }));
      return null;
    }
  }

  logYtDlpDiagnostic({
    event: "yt_dlp_resolution_failed",
    sourceHost: hostFromUrl(url),
    candidate: "all",
    reason: "unavailable",
  });

  return null;
}

export function ytDlpInfoToRuntimeResolution(
  sourceUrl: string,
  info: unknown,
): YtDlpRuntimeResolution | null {
  if (!isYtDlpObject(info)) return null;

  const title = stringValue(info.title) ?? titleFromUrl(sourceUrl);
  if (isYoutubeInfo(info)) {
    const videoId = stringValue(info.id);
    const iframeUrl = youtubeEmbedUrlFromId(videoId);
    if (iframeUrl) {
      return {
        provider: "youtube",
        title,
        iframeUrl,
        metadata: {
          ...(stringValue(info.thumbnail)
            ? { thumbnailUrl: stringValue(info.thumbnail) }
            : {}),
        },
      };
    }
  }

  const items = ytDlpInfoToRuntimeItems(sourceUrl, info);
  if (!items.length) return null;

  return {
    provider: providerFromInfo(info),
    title,
    items,
  };
}

export function ytDlpInfoToRuntimeItems(
  sourceUrl: string,
  info: unknown,
): RuntimeFeedItem[] {
  if (!isYtDlpObject(info)) return [];

  const media = choosePlayableMedia(info);
  if (!media) return [];

  return [
    {
      id: `url:ytdlp:${hashUrl(sourceUrl)}`,
      source: "url",
      title: stringValue(info.title) ?? titleFromUrl(sourceUrl),
      isNsfw: numberValue(info.age_limit) >= 18,
      createdAt: createdAtFromInfo(info),
      media: [media],
    },
  ];
}

export function ytDlpCommandCandidates({
  cwd = process.cwd(),
  env = process.env,
  platform = process.platform,
}: YtDlpCommandCandidateOptions = {}): CommandCandidate[] {
  const configured = env.YTDLP_PATH?.trim();
  if (configured) return [{ command: configured, args: [] }];

  return [
    ...bundledYtDlpCommands({ cwd, env, platform }).map((command) => ({
      command,
      args: [],
    })),
    { command: "yt-dlp", args: [] },
    { command: "python3", args: ["-m", "yt_dlp"] },
    { command: "python", args: ["-m", "yt_dlp"] },
  ];
}

function commandCandidates(): CommandCandidate[] {
  return ytDlpCommandCandidates();
}

function bundledYtDlpCommands({
  cwd,
  env,
  platform,
}: Required<YtDlpCommandCandidateOptions>) {
  const filename = env.YOUTUBE_DL_FILENAME?.trim() || "yt-dlp";
  const binary =
    platform === "win32" && !filename.endsWith(".exe")
      ? `${filename}.exe`
      : filename;
  const configuredDir = env.YOUTUBE_DL_DIR?.trim();
  const commands = [
    ...(configuredDir ? [path.join(configuredDir, binary)] : []),
    path.join(cwd, "node_modules", "youtube-dl-exec", "bin", binary),
    path.join(cwd, "..", "node_modules", "youtube-dl-exec", "bin", binary),
  ];

  return Array.from(new Set(commands));
}

export function ytDlpFailureDiagnostic({
  url,
  candidate,
  error,
}: YtDlpFailureDiagnosticInput): YtDlpFailureDiagnostic {
  return {
    event: "yt_dlp_resolution_failed",
    sourceHost: hostFromUrl(url),
    candidate: commandCandidateLabel(candidate),
    reason: ytDlpFailureReason(error),
    ...(ytDlpFailureDetail(error) ? { detail: ytDlpFailureDetail(error) } : {}),
  };
}

function logYtDlpDiagnostic(diagnostic: YtDlpFailureDiagnostic) {
  console.warn("[url-source] yt-dlp resolution failed", diagnostic);
}

function commandCandidateLabel(candidate: CommandCandidate) {
  const command = path.basename(candidate.command);
  const moduleArgs = candidate.args.slice(0, 2).join(" ");
  return moduleArgs ? `${command} ${moduleArgs}` : command;
}

function ytDlpFailureReason(error: unknown) {
  if (error instanceof YtDlpExecutionError) {
    return error.reason;
  }

  const message = errorMessage(error);
  if (message === "yt_dlp_extraction_limit_exceeded") return "limit_exceeded";
  if (message === "yt_dlp_invalid_json") return "invalid_json";
  if (/HTTP Error 403|Forbidden/i.test(message)) return "upstream_forbidden";
  if (/HTTP Error 401|Unauthorized/i.test(message)) {
    return "upstream_unauthorized";
  }
  if (/HTTP Error 429|Too Many Requests|rate.?limit/i.test(message)) {
    return "upstream_rate_limited";
  }
  if (/unsupported url/i.test(message)) return "unsupported_url";
  if (/video unavailable|not available/i.test(message)) {
    return "video_unavailable";
  }
  if (/sign in|login|cookies|authentication/i.test(message)) {
    return "auth_required";
  }
  if (/timed? out|timeout/i.test(message)) return "timeout";

  return "execution_failed";
}

function ytDlpFailureDetail(error: unknown) {
  const raw =
    error instanceof YtDlpExecutionError ? error.detail : errorMessage(error);
  return sanitizeYtDlpDiagnosticText(raw);
}

function sanitizeYtDlpDiagnosticText(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const detail = lines.at(-1) ?? value.trim();

  return detail
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[token]")
    .slice(0, 220);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function runYtDlp(candidate: CommandCandidate, url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      candidate.command,
      [
        ...candidate.args,
        "--dump-single-json",
        "--no-playlist",
        "--no-warnings",
        "--no-progress",
        "--skip-download",
        "--socket-timeout",
        "10",
        url,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    let killedForSize = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, DEFAULT_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout, "utf8") > MAX_STDOUT_BYTES) {
        killedForSize = true;
        child.kill("SIGKILL");
      }
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (error.code === "ENOENT") {
        reject(new YtDlpUnavailableError(error.message));
        return;
      }

      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut || killedForSize) {
        reject(new Error("yt_dlp_extraction_limit_exceeded"));
        return;
      }
      if (code !== 0) {
        if (stderr.includes("No module named yt_dlp")) {
          reject(new YtDlpUnavailableError(stderr));
          return;
        }

        reject(new YtDlpExecutionError(stderr));
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error("yt_dlp_invalid_json"));
      }
    });
  });
}

function choosePlayableMedia(info: YtDlpObject): RuntimeMedia | null {
  const candidates = collectFormats(info)
    .map((format) => mediaCandidateFromFormat(format))
    .filter((candidate): candidate is MediaCandidate => Boolean(candidate))
    .sort((first, second) => second.score - first.score);

  return candidates[0]?.media ?? null;
}

function collectFormats(info: YtDlpObject): YtDlpObject[] {
  const formats: YtDlpObject[] = [];

  if (stringValue(info.url)) formats.push(info);
  formats.push(...objectArray(info.requested_downloads));
  formats.push(...objectArray(info.requested_formats));
  formats.push(...objectArray(info.formats));

  const seenUrls = new Set<string>();
  return formats.filter((format) => {
    const url = stringValue(format.url);
    if (!url || seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });
}

function mediaCandidateFromFormat(format: YtDlpObject): MediaCandidate | null {
  const url = stringValue(format.url);
  if (!url || !isHttpUrl(url)) return null;

  const extension = mediaExtension(format, url);
  const protocol = stringValue(format.protocol)?.toLowerCase() ?? "";
  const vcodec = stringValue(format.vcodec)?.toLowerCase();
  const acodec = stringValue(format.acodec)?.toLowerCase();
  const width = numberValue(format.width);
  const height = numberValue(format.height);
  const dimensions = {
    ...(width > 0 ? { width } : {}),
    ...(height > 0 ? { height } : {}),
  };

  if (
    protocol.includes("m3u8") ||
    extension === "m3u8" ||
    url.toLowerCase().includes(".m3u8")
  ) {
    if (acodec === "none") return null;

    const hlsSegmentQuery = hlsSegmentQueryFromFormat(format, url);

    return {
      media: {
        type: "video",
        url,
        ...dimensions,
        isHls: true,
        ...(hlsSegmentQuery ? { hlsSegmentQuery } : {}),
      },
      score: 10_000 + mediaQualityScore(format),
    };
  }

  if (vcodec === "none" || AUDIO_EXTENSIONS.has(extension)) {
    if (VIDEO_EXTENSIONS.has(extension)) return null;
    return {
      media: { type: "audio", url, ...dimensions },
      score: 1_000 + mediaQualityScore(format),
    };
  }

  if (acodec === "none") return null;
  if (!VIDEO_EXTENSIONS.has(extension)) return null;

  return {
    media: { type: "video", url, ...dimensions },
    score: 8_000 + mediaQualityScore(format),
  };
}

function mediaQualityScore(format: YtDlpObject) {
  const width = numberValue(format.width);
  const height = numberValue(format.height);
  const tbr = numberValue(format.tbr);
  const size = width > 0 && height > 0 ? width * height : heightScore(height);

  return size + tbr + browserVideoCodecScore(format);
}

function browserVideoCodecScore(format: YtDlpObject) {
  const vcodec = stringValue(format.vcodec)?.toLowerCase() ?? "";

  if (!vcodec || vcodec === "none") return 0;
  if (vcodec.startsWith("avc1") || vcodec.includes("h264")) return 600_000;
  if (vcodec.startsWith("vp09") || vcodec.includes("vp9")) return 400_000;
  if (vcodec.startsWith("av01")) return 300_000;
  if (
    vcodec.includes("h265") ||
    vcodec.includes("hevc") ||
    vcodec.startsWith("hev1") ||
    vcodec.startsWith("hvc1") ||
    vcodec.includes("bytevc1")
  ) {
    return -600_000;
  }

  return 0;
}

function mediaExtension(format: YtDlpObject, url: string) {
  const ext = stringValue(format.ext)?.toLowerCase();
  if (ext && ext !== "unknown_video" && ext !== "unknown_audio") return ext;

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.([a-z0-9]+)$/);
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}

function hlsSegmentQueryFromFormat(format: YtDlpObject, url: string) {
  const extraParam = stringValue(format.extra_param_to_segment_url);
  if (extraParam) return extraParam.replace(/^\?/, "");

  try {
    const playlistUrl = new URL(url);
    return playlistUrl.searchParams.size > 0
      ? playlistUrl.searchParams.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function createdAtFromInfo(info: YtDlpObject) {
  const timestamp = numberValue(info.timestamp);
  if (timestamp > 0) return new Date(timestamp * 1000).toISOString();

  const uploadDate = stringValue(info.upload_date);
  const match = uploadDate?.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) {
    return new Date(
      `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`,
    ).toISOString();
  }

  return new Date().toISOString();
}

function titleFromUrl(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "URL video";
  }
}

function isYoutubeInfo(info: YtDlpObject) {
  const extractor = stringValue(info.extractor_key)?.toLowerCase();
  return extractor === "youtube";
}

function providerFromInfo(info: YtDlpObject) {
  const extractor =
    stringValue(info.extractor_key) ?? stringValue(info.extractor) ?? "yt-dlp";

  return extractor.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

function hashUrl(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function heightScore(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function objectArray(value: unknown): YtDlpObject[] {
  return Array.isArray(value) ? value.filter(isYtDlpObject) : [];
}

function isYtDlpObject(value: unknown): value is YtDlpObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hostFromUrl(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "unknown";
  }
}

class YtDlpUnavailableError extends Error {}

class YtDlpExecutionError extends Error {
  readonly reason: string;
  readonly detail: string;

  constructor(stderr: string) {
    const detail = stderr.trim() || "yt_dlp_extraction_failed";
    super(detail);
    this.name = "YtDlpExecutionError";
    this.detail = detail;
    this.reason = ytDlpFailureReason(detail);
  }
}
