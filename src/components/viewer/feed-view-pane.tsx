"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  GlobeOff,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { type ReactNode, type WheelEvent, useCallback } from "react";

import { Button } from "@/components/ui/button";
import type { RuntimeFeedItem } from "@/lib/feed/types";
import { cn } from "@/lib/utils";
import {
  getTimerProgressPercent,
  type TimerMode,
  type TimerState,
} from "@/lib/viewer/timer";
import { MediaRenderer } from "./media-renderer";

export function FeedViewPane({
  viewId,
  title,
  items,
  timer,
  timerMode = "global",
  galleryIndexes,
  videoPositions = {},
  compact = false,
  isFocused = false,
  forceInfoVisible = false,
  isRuntimeLoading = false,
  emptyMessage = "No runtime media",
  emptyAction,
  hideUi = false,
  onGalleryChange,
  onVideoPositionChange,
  onMove,
  onTogglePaused,
  onRestart,
  onMaximize,
  onRemove,
  onTimerModeChange,
  onTimerSecondsChange,
}: {
  viewId?: string;
  title: string;
  items: RuntimeFeedItem[];
  timer: TimerState;
  timerMode?: TimerMode;
  galleryIndexes: Record<string, number>;
  videoPositions?: Record<string, number>;
  compact?: boolean;
  isFocused?: boolean;
  forceInfoVisible?: boolean;
  isRuntimeLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  hideUi?: boolean;
  onGalleryChange: (itemId: string, direction: 1 | -1) => void;
  onVideoPositionChange?: (key: string, seconds: number) => void;
  onMove: (direction: 1 | -1) => void;
  onTogglePaused: () => void;
  onRestart: () => void;
  onMaximize?: () => void;
  onRemove?: () => void;
  onTimerModeChange?: (mode: TimerMode) => void;
  onTimerSecondsChange?: (seconds: number) => void;
}) {
  const activeItem = items[timer.activeIndex];
  const activeGalleryIndex = activeItem
    ? (galleryIndexes[activeItem.id] ?? 0)
    : 0;
  const activeMedia = activeItem?.media[activeGalleryIndex];
  const isVideo = activeMedia?.type === "video";
  const modeLabel = timerMode === "global" ? "global" : "local";
  const TimerModeIcon = timerMode === "global" ? Globe : GlobeOff;
  const videoPositionKey =
    activeItem && isVideo
      ? `${viewId ?? title}:${activeItem.id}:${activeGalleryIndex}`
      : null;
  const handleVideoTimeChange = useCallback(
    (seconds: number) => {
      if (videoPositionKey) onVideoPositionChange?.(videoPositionKey, seconds);
    },
    [onVideoPositionChange, videoPositionKey],
  );
  const progress = getTimerProgressPercent(timer);

  const showProgress = !hideUi && timer.itemCount > 1;
  const sourceChromeClass = cn(
    "transition-opacity duration-200",
    !isFocused &&
      !forceInfoVisible &&
      "opacity-0 group-hover/source:opacity-100 group-focus-within/source:opacity-100",
  );
  const handleWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const delta = horizontal ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 24) return;

      event.preventDefault();
      const direction = delta > 0 ? 1 : -1;

      if (
        horizontal &&
        activeItem?.media.length &&
        activeItem.media.length > 1
      ) {
        onGalleryChange(activeItem.id, direction);
        return;
      }

      onMove(direction);
    },
    [activeItem, onGalleryChange, onMove],
  );

  return (
    <article
      className="group/source relative grid size-full min-h-0 overflow-hidden rounded-lg border border-border/70 bg-background text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.018)]"
      onWheel={handleWheel}
    >
      {showProgress ? (
        <div
          className="absolute inset-x-0 top-0 z-20 h-1 bg-surface-elevated"
          aria-label={`${title} timer progress`}
        >
          <div
            key={timer.activeIndex}
            className="h-full origin-left bg-primary transition-transform duration-[250ms] ease-linear will-change-transform"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
      ) : null}

      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {activeItem && activeMedia ? (
          <MediaRenderer
            media={activeMedia}
            title={activeItem.title}
            showControls={!hideUi}
            initialVideoTime={
              videoPositionKey ? (videoPositions[videoPositionKey] ?? 0) : 0
            }
            onVideoTimeChange={
              videoPositionKey ? handleVideoTimeChange : undefined
            }
          />
        ) : (
          <div className="grid size-full place-items-center bg-background text-xs text-muted-foreground">
            <div className="grid justify-items-center gap-3 px-4 text-center">
              <span>
                {isRuntimeLoading ? "Loading runtime media" : emptyMessage}
              </span>
              {!isRuntimeLoading ? emptyAction : null}
            </div>
          </div>
        )}
      </div>

      {hideUi ? null : (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2",
            sourceChromeClass,
          )}
        >
          <div className="min-w-0 rounded-md bg-background/75 px-2 py-1.5 backdrop-blur">
            <div className="truncate text-xs font-medium">{title}</div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              {items.length ? timer.activeIndex + 1 : 0}/{items.length} ·{" "}
              {timer.durationSeconds}s ·{" "}
              <TimerModeIcon
                className="size-3 text-primary"
                aria-label={`${modeLabel} timer`}
                role="img"
              />
            </div>
          </div>
          <div className="pointer-events-auto flex shrink-0 flex-wrap justify-end gap-1">
            {onTimerModeChange ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={() =>
                  onTimerModeChange(timerMode === "local" ? "global" : "local")
                }
                aria-label={`${title} uses ${modeLabel} timer`}
              >
                <TimerModeIcon />
              </Button>
            ) : null}
            {onTimerSecondsChange && timerMode === "local" ? (
              <input
                type="number"
                value={timer.durationSeconds}
                min={1}
                max={120}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) onTimerSecondsChange(next);
                }}
                aria-label={`${title} local timer seconds`}
                className="h-7 w-14 rounded-lg border border-border bg-background/75 px-1.5 text-center font-mono text-[11px] text-foreground outline-none focus-visible:border-primary"
              />
            ) : null}
            {onMaximize ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={onMaximize}
                aria-label={`Maximize ${title}`}
              >
                <Maximize2 />
              </Button>
            ) : null}
            {onRemove ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={onRemove}
                aria-label={`Remove ${title}`}
              >
                <X />
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {!hideUi && activeItem?.media.length && activeItem.media.length > 1 ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-2",
            sourceChromeClass,
          )}
        >
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="pointer-events-auto border-border bg-background/75 text-foreground"
            onClick={() => onGalleryChange(activeItem.id, -1)}
            aria-label={`Previous media for ${title}`}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="pointer-events-auto border-border bg-background/75 text-foreground"
            onClick={() => onGalleryChange(activeItem.id, 1)}
            aria-label={`Next media for ${title}`}
          >
            <ChevronRight />
          </Button>
        </div>
      ) : null}

      {hideUi ? null : (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 z-20 p-2",
            isVideo
              ? "bottom-14"
              : "bottom-0 bg-gradient-to-t from-background via-background/70 to-transparent pt-16",
            sourceChromeClass,
          )}
        >
          {!compact && activeItem ? (
            <div className="pointer-events-auto mb-2 rounded-md bg-background/75 p-2 backdrop-blur">
              <div className="line-clamp-2 text-xs font-medium">
                {activeItem.title}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                {activeItem.subreddit ? (
                  <span>r/{activeItem.subreddit}</span>
                ) : null}
                {activeItem.author ? <span>u/{activeItem.author}</span> : null}
                {activeItem.isNsfw ? <span>NSFW</span> : null}
                {activeItem.permalink ? (
                  <a
                    href={activeItem.permalink}
                    target="_blank"
                    rel="noreferrer"
                    title={`Open ${activeItem.title} on Reddit`}
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    Reddit
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="pointer-events-auto flex items-center justify-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="border-border bg-background/75 text-foreground"
              onClick={() => onMove(-1)}
              aria-label={`Previous item for ${title}`}
            >
              <SkipBack />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="border-border bg-background/75 text-foreground"
              onClick={onTogglePaused}
              aria-label={timer.isPaused ? `Resume ${title}` : `Pause ${title}`}
            >
              {timer.isPaused ? <Play /> : <Pause />}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="border-border bg-background/75 text-foreground"
              onClick={onRestart}
              aria-label={`Restart ${title}`}
            >
              <RotateCcw />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="border-border bg-background/75 text-foreground"
              onClick={() => onMove(1)}
              aria-label={`Next item for ${title}`}
            >
              <SkipForward />
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
