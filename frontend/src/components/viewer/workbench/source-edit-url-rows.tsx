import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RuntimeFeedItem, RuntimeMedia } from "@/lib/feed/types";
import type { UrlSourceRow } from "@/lib/url-source/types";
import { formatVideoTimestamp } from "@/lib/viewer/video-time-range";
import { videoPlaybackDuration } from "../video-playback-keys";
import type { FeedSession } from "./types";
import {
  normalizeRangeDraft,
  startDraftForDuration,
  videoTimeRangeDraft,
  type TimeRangeDraft,
} from "./source-edit-time-range-drafts";

export type UrlEditRow = TimeRangeDraft & {
  id: string;
  url: string;
  videoUrls?: string[];
  durationSeconds?: number;
};

type PrepareUrlRowsForSaveResult =
  | { ok: true; rows: UrlSourceRow[]; editorRows: UrlEditRow[] }
  | { ok: false; error: string; editorRows: UrlEditRow[] };

type RuntimeVideoMedia = {
  item: RuntimeFeedItem;
  media: RuntimeMedia;
  mediaIndex: number;
};

export function urlRowsFromSource(
  source: FeedSession,
  videoDurations: Record<string, number> = {},
): UrlEditRow[] {
  if (source.sourceConfig.kind !== "url") return [];

  const rows: UrlSourceRow[] = source.sourceConfig.urlRows?.length
    ? source.sourceConfig.urlRows
    : urlSourceInputValue(source)
        .split(/\r?\n/)
        .filter(Boolean)
        .map((url, index) => ({
          id: `legacy-${index + 1}`,
          url,
        }));

  return rows.map((row, index) => {
    const videos = runtimeVideoMediaForUrlRow(source, row.id, index);

    return {
      id: row.id,
      url: row.url,
      videoUrls: videos.map(({ media }) => media.url),
      durationSeconds: videoDurationForUrlRow(source, videos, videoDurations),
      ...videoTimeRangeDraft(row.videoTimeRange),
    };
  });
}

export function prepareUrlRowsForSave(
  rows: UrlEditRow[],
): PrepareUrlRowsForSaveResult {
  const editorRows = rows.map(urlRowWithKnownDurationStartCleared);
  const nextRows: UrlSourceRow[] = [];

  for (const [index, row] of editorRows.entries()) {
    const url = row.url.trim();
    if (!url) continue;

    const result = normalizeRangeDraft(
      { start: row.start, end: row.end },
      `URL ${index + 1}`,
    );
    if (!result.ok) return { ...result, editorRows };
    if (!rangeStartsBeforeDuration(result.range, row.durationSeconds)) {
      return {
        ok: false,
        error: `URL ${index + 1}: Start must be before video duration${durationLabel(row.durationSeconds)}`,
        editorRows,
      };
    }

    nextRows.push({
      id: row.id,
      url,
      ...(result.range ? { videoTimeRange: result.range } : {}),
    });
  }

  if (!nextRows.length) {
    return { ok: false, error: "Keep at least one URL", editorRows };
  }

  return { ok: true, rows: nextRows, editorRows };
}

export function UrlSourceRowsEditor({
  rows,
  onRowsChange,
}: {
  rows: UrlEditRow[];
  onRowsChange: Dispatch<SetStateAction<UrlEditRow[]>>;
}) {
  return (
    <div className="grid gap-2">
      {rows.map((row, index) => {
        const rowNumber = index + 1;

        return (
          <div
            key={row.id}
            className="grid gap-2 rounded-lg border border-border bg-surface p-2 md:grid-cols-[minmax(0,1fr)_5.75rem_5.75rem_auto] md:items-end"
          >
            <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
              URL {rowNumber}
              <Input
                value={row.url}
                onChange={(event) => {
                  const value = event.target.value;
                  onRowsChange((current) =>
                    updateUrlRow(current, index, {
                      url: value,
                    }),
                  );
                }}
                className="h-9 font-mono text-xs"
              />
            </Label>
            <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Start
              <Input
                aria-label={`Start time for URL ${rowNumber}`}
                value={row.start}
                onChange={(event) => {
                  const value = event.target.value;
                  onRowsChange((current) =>
                    updateUrlRow(current, index, {
                      start: startDraftForDuration(value, row.durationSeconds),
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
                aria-label={`End time for URL ${rowNumber}`}
                value={row.end}
                onChange={(event) => {
                  const value = event.target.value;
                  onRowsChange((current) =>
                    updateUrlRow(current, index, {
                      end: value,
                    }),
                  );
                }}
                placeholder="End"
                inputMode="numeric"
                className="h-9 font-mono text-xs"
              />
            </Label>
            <div className="grid grid-cols-3 gap-1.5 justify-self-start md:flex md:justify-self-end">
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label={`Move URL ${rowNumber} up`}
                disabled={index === 0}
                onClick={() =>
                  onRowsChange((current) =>
                    moveUrlRow(current, index, index - 1),
                  )
                }
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label={`Move URL ${rowNumber} down`}
                disabled={index === rows.length - 1}
                onClick={() =>
                  onRowsChange((current) =>
                    moveUrlRow(current, index, index + 1),
                  )
                }
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                aria-label={`Remove URL ${rowNumber}`}
                onClick={() =>
                  onRowsChange((current) =>
                    current.filter(
                      (_candidate, candidateIndex) => candidateIndex !== index,
                    ),
                  )
                }
              >
                <Trash2 />
              </Button>
            </div>
            {row.videoUrls?.map((videoUrl, videoIndex) => (
              <video
                key={`${row.id}-${videoUrl}-${videoIndex}`}
                data-video-duration-probe={`url-row-${rowNumber}`}
                src={videoUrl}
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
                className="hidden"
                onLoadedMetadata={(event) => {
                  const duration = event.currentTarget.duration;
                  onRowsChange((current) =>
                    updateUrlRowDuration(current, index, duration),
                  );
                }}
              />
            ))}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={() =>
          onRowsChange((current) => [
            ...current,
            { id: createUrlRowId(), url: "", start: "", end: "" },
          ])
        }
      >
        <Plus data-icon="inline-start" />
        Add URL
      </Button>
    </div>
  );
}

function urlSourceInputValue(source: FeedSession) {
  if (source.sourceConfig.kind !== "url") return "";

  const urls = source.sourceConfig.urls?.length
    ? source.sourceConfig.urls
    : [source.sourceConfig.url];

  return urls.join("\n");
}

function runtimeVideoMediaForUrlRow(
  source: FeedSession,
  rowId: string,
  index: number,
): RuntimeVideoMedia[] {
  const runtimeItems = source.allItems ?? source.items;
  const rowItems = runtimeItems.filter((item) =>
    item.id.startsWith(`url-row:${rowId}:`),
  );
  const items = rowItems.length
    ? rowItems
    : runtimeItems[index]
      ? [runtimeItems[index]]
      : [];

  return items.flatMap((item) =>
    item.media.flatMap((media, mediaIndex) =>
      media.type === "video" ? [{ item, media, mediaIndex }] : [],
    ),
  );
}

function videoDurationForUrlRow(
  source: FeedSession,
  videos: RuntimeVideoMedia[],
  videoDurations: Record<string, number>,
) {
  const durations = videos
    .map(({ item, mediaIndex }) =>
      videoPlaybackDuration({
        videoDurations,
        viewId: source.id,
        title: source.title,
        itemId: item.id,
        galleryIndex: mediaIndex,
      }),
    )
    .filter((duration) => duration !== undefined);

  return durations.length ? Math.min(...durations) : undefined;
}

function updateUrlRow(
  rows: UrlEditRow[],
  index: number,
  patch: Partial<UrlEditRow>,
) {
  return rows.map((row, rowIndex) =>
    rowIndex === index ? { ...row, ...patch } : row,
  );
}

function urlRowWithKnownDurationStartCleared(row: UrlEditRow): UrlEditRow {
  const start = startDraftForDuration(row.start, row.durationSeconds);
  return start === row.start ? row : { ...row, start };
}

function moveUrlRow(rows: UrlEditRow[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= rows.length) return rows;

  const nextRows = [...rows];
  const [row] = nextRows.splice(fromIndex, 1);
  if (!row) return rows;
  nextRows.splice(toIndex, 0, row);

  return nextRows;
}

function updateUrlRowDuration(
  rows: UrlEditRow[],
  index: number,
  durationSeconds: number,
) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return rows;

  const currentDuration = rows[index]?.durationSeconds;
  const nextDuration =
    currentDuration === undefined
      ? durationSeconds
      : Math.min(currentDuration, durationSeconds);
  const start = startDraftForDuration(rows[index]?.start ?? "", nextDuration);

  return updateUrlRow(rows, index, { durationSeconds: nextDuration, start });
}

function rangeStartsBeforeDuration(
  range: UrlSourceRow["videoTimeRange"],
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

function createUrlRowId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `url-row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
