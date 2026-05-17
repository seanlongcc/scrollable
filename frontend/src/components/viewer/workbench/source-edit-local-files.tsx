import { Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatVideoTimestamp,
  type VideoTimeRange,
} from "@/lib/viewer/video-time-range";
import { videoPlaybackDuration } from "../video-playback-keys";
import type { FeedSession } from "./types";
import {
  normalizeRangeDraft,
  startDraftForDuration,
  videoTimeRangeDraft,
  type TimeRangeDraft,
} from "./source-edit-time-range-drafts";

export type LocalEditEntry = TimeRangeDraft & {
  file: File;
  previewUrl?: string;
  mediaType?: "image" | "video" | "audio";
  durationSeconds?: number;
};

type PrepareLocalVideoTimeRangesResult =
  | {
      ok: true;
      entries: LocalEditEntry[];
      videoTimeRanges?: Record<string, VideoTimeRange>;
    }
  | { ok: false; error: string; entries: LocalEditEntry[] };

export function localEntriesFromSource(
  source: FeedSession,
  videoDurations: Record<string, number> = {},
): LocalEditEntry[] {
  const sourceConfig = source.sourceConfig;
  if (sourceConfig.kind !== "local") return [];

  const runtimeItems = source.allItems ?? source.items;

  return (source.localFiles ?? []).map((file, index) => {
    const media = runtimeItems[index]?.media[0];
    const range =
      sourceConfig.videoTimeRanges?.[String(index)] ?? media?.videoTimeRange;

    return {
      file,
      previewUrl: media?.url,
      mediaType: media?.type,
      durationSeconds:
        media?.type === "video"
          ? videoPlaybackDuration({
              videoDurations,
              viewId: source.id,
              title: source.title,
              itemId: runtimeItems[index]?.id,
              galleryIndex: 0,
            })
          : undefined,
      ...videoTimeRangeDraft(range),
    };
  });
}

export function prepareLocalVideoTimeRanges(
  entries: LocalEditEntry[],
): PrepareLocalVideoTimeRangesResult {
  const editorEntries = entries.map(localEntryWithKnownDurationStartCleared);
  const videoTimeRanges: Record<string, VideoTimeRange> = {};

  for (const [index, entry] of editorEntries.entries()) {
    if (!localEntryIsVideo(entry)) continue;

    const result = normalizeRangeDraft(
      { start: entry.start, end: entry.end },
      entry.file.name,
    );
    if (!result.ok) return { ...result, entries: editorEntries };
    if (!rangeStartsBeforeDuration(result.range, entry.durationSeconds)) {
      return {
        ok: false,
        error: `${entry.file.name}: Start must be before video duration${durationLabel(entry.durationSeconds)}`,
        entries: editorEntries,
      };
    }

    if (result.range) {
      videoTimeRanges[String(index)] = result.range;
    }
  }

  return {
    ok: true,
    entries: editorEntries,
    videoTimeRanges: Object.keys(videoTimeRanges).length
      ? videoTimeRanges
      : undefined,
  };
}

export function LocalSourceFilesEditor({
  entries,
  onEntriesChange,
}: {
  entries: LocalEditEntry[];
  onEntriesChange: Dispatch<SetStateAction<LocalEditEntry[]>>;
}) {
  if (!entries.length) {
    return (
      <div className="text-wrap-anywhere rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
        Reload files before editing this source.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2">
      {entries.map((entry, index) => (
        <div
          key={`${entry.file.name}-${entry.file.size}-${index}`}
          className="grid min-w-0 gap-2 rounded-lg border border-border bg-surface p-2"
        >
          <div className="relative aspect-square overflow-hidden rounded-md border border-border/70 bg-background">
            {entry.previewUrl && entry.file.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.previewUrl}
                alt={`Preview ${entry.file.name}`}
                className="size-full object-cover"
              />
            ) : localEntryIsVideo(entry) ? (
              <span className="text-wrap-anywhere grid size-full place-items-center text-xs font-medium text-muted-foreground">
                Video
              </span>
            ) : entry.file.type.startsWith("audio/") ? (
              <span className="text-wrap-anywhere grid size-full place-items-center text-xs font-medium text-muted-foreground">
                Audio
              </span>
            ) : (
              <span className="text-wrap-anywhere grid size-full place-items-center text-xs font-medium text-muted-foreground">
                File
              </span>
            )}
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="absolute right-1 top-1 border-0 bg-background/60 text-foreground/90 backdrop-blur hover:bg-destructive/15 hover:text-destructive"
              aria-label={`Remove ${entry.file.name}`}
              onClick={() =>
                onEntriesChange((current) =>
                  current.filter(
                    (_entry, currentIndex) => currentIndex !== index,
                  ),
                )
              }
            >
              <Trash2 />
            </Button>
          </div>
          <span
            className="text-wrap-anywhere line-clamp-2 text-xs font-medium"
            title={entry.file.name}
          >
            {entry.file.name}
          </span>
          {localEntryIsVideo(entry) ? (
            <div className="grid grid-cols-2 gap-2">
              <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Start
                <Input
                  aria-label={`Start time for ${entry.file.name}`}
                  value={entry.start}
                  onChange={(event) => {
                    const value = event.target.value;
                    onEntriesChange((current) =>
                      updateLocalEntry(current, index, {
                        start: startDraftForDuration(
                          value,
                          entry.durationSeconds,
                        ),
                      }),
                    );
                  }}
                  placeholder="0:00"
                  inputMode="numeric"
                  className="h-9 font-mono text-xs"
                />
              </Label>
              <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                End
                <Input
                  aria-label={`End time for ${entry.file.name}`}
                  value={entry.end}
                  onChange={(event) => {
                    const value = event.target.value;
                    onEntriesChange((current) =>
                      updateLocalEntry(current, index, {
                        end: value,
                      }),
                    );
                  }}
                  placeholder="End"
                  inputMode="numeric"
                  className="h-9 font-mono text-xs"
                />
              </Label>
            </div>
          ) : null}
          {localEntryIsVideo(entry) && entry.previewUrl ? (
            <video
              data-video-duration-probe={`local-file-${index + 1}`}
              src={entry.previewUrl}
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
              className="hidden"
              onLoadedMetadata={(event) => {
                const duration = event.currentTarget.duration;
                onEntriesChange((current) =>
                  updateLocalEntryWithDuration(current, index, duration),
                );
              }}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function localEntryIsVideo(entry: LocalEditEntry) {
  return entry.mediaType === "video" || entry.file.type.startsWith("video/");
}

function updateLocalEntry(
  entries: LocalEditEntry[],
  index: number,
  patch: Partial<LocalEditEntry>,
) {
  return entries.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, ...patch } : entry,
  );
}

function localEntryWithKnownDurationStartCleared(
  entry: LocalEditEntry,
): LocalEditEntry {
  const start = startDraftForDuration(entry.start, entry.durationSeconds);
  return start === entry.start ? entry : { ...entry, start };
}

function updateLocalEntryWithDuration(
  entries: LocalEditEntry[],
  index: number,
  durationSeconds: number,
) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return entries;
  }

  const start = startDraftForDuration(
    entries[index]?.start ?? "",
    durationSeconds,
  );
  return updateLocalEntry(entries, index, { durationSeconds, start });
}

function rangeStartsBeforeDuration(
  range: VideoTimeRange | undefined,
  durationSeconds: number | undefined,
) {
  if (!range?.startSeconds || durationSeconds === undefined) return true;

  return range.startSeconds < durationSeconds;
}

function durationLabel(durationSeconds: number | undefined) {
  return durationSeconds === undefined
    ? ""
    : ` (${formatVideoTimestamp(durationSeconds)})`;
}
