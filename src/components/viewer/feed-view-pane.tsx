"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import type { RuntimeFeedItem } from "@/lib/feed/types";
import type { TimerMode, TimerState } from "@/lib/viewer/timer";
import { MediaRenderer } from "./media-renderer";

export function FeedViewPane({
  title,
  items,
  timer,
  timerMode = "own",
  galleryIndexes,
  compact = false,
  isFocused = false,
  onGalleryChange,
  onMove,
  onTogglePaused,
  onRestart,
  onMaximize,
  onRemove,
  onTimerModeChange,
}: {
  title: string;
  items: RuntimeFeedItem[];
  timer: TimerState;
  timerMode?: TimerMode;
  galleryIndexes: Record<string, number>;
  compact?: boolean;
  isFocused?: boolean;
  onGalleryChange: (itemId: string, direction: 1 | -1) => void;
  onMove: (direction: 1 | -1) => void;
  onTogglePaused: () => void;
  onRestart: () => void;
  onMaximize?: () => void;
  onRemove?: () => void;
  onTimerModeChange?: (mode: TimerMode) => void;
}) {
  const activeItem = items[timer.activeIndex];
  const activeGalleryIndex = activeItem ? galleryIndexes[activeItem.id] ?? 0 : 0;
  const activeMedia = activeItem?.media[activeGalleryIndex];
  const progress = useMemo(() => {
    if (timer.durationSeconds <= 0) return 0;
    return Math.min(100, (timer.elapsedMs / (timer.durationSeconds * 1000)) * 100);
  }, [timer.durationSeconds, timer.elapsedMs]);

  return (
    <article className="relative grid size-full min-h-0 overflow-hidden rounded-lg border border-white/10 bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-20 h-1 bg-white/10">
        <div
          className="h-full bg-cyan-300 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {activeItem && activeMedia ? (
          <MediaRenderer media={activeMedia} title={activeItem.title} />
        ) : (
          <div className="grid size-full place-items-center bg-zinc-950 text-xs text-white/45">
            No runtime media
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2">
        <div className="min-w-0 rounded-md bg-black/65 px-2 py-1.5 backdrop-blur">
          <div className="truncate text-xs font-medium">{title}</div>
          <div className="font-mono text-[10px] text-white/60">
            {items.length ? timer.activeIndex + 1 : 0}/{items.length} ·{" "}
            {timer.durationSeconds}s · {timerMode}
          </div>
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-1">
          {onTimerModeChange ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="border-white/25 bg-black/45 text-white"
              onClick={() =>
                onTimerModeChange(timerMode === "own" ? "master" : "own")
              }
              aria-label={`${title} timer mode`}
            >
              <span className="text-[10px] uppercase">
                {timerMode === "own" ? "O" : "M"}
              </span>
            </Button>
          ) : null}
          {onMaximize ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="border-white/25 bg-black/45 text-white"
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
              className="border-white/25 bg-black/45 text-white"
              onClick={onRemove}
              aria-label={`Remove ${title}`}
            >
              <X />
            </Button>
          ) : null}
        </div>
      </div>

      {activeItem?.media.length && activeItem.media.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-2">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="pointer-events-auto border-white/25 bg-black/45 text-white"
            onClick={() => onGalleryChange(activeItem.id, -1)}
            aria-label={`Previous media for ${title}`}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="pointer-events-auto border-white/25 bg-black/45 text-white"
            onClick={() => onGalleryChange(activeItem.id, 1)}
            aria-label={`Next media for ${title}`}
          >
            <ChevronRight />
          </Button>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/70 to-transparent p-2 pt-16">
        {!compact && activeItem ? (
          <div className="mb-2 rounded-md bg-black/55 p-2 backdrop-blur">
            <div className="line-clamp-2 text-xs font-medium">{activeItem.title}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-white/60">
              {activeItem.subreddit ? <span>r/{activeItem.subreddit}</span> : null}
              {activeItem.author ? <span>u/{activeItem.author}</span> : null}
              {activeItem.isNsfw ? <span>NSFW</span> : null}
              {activeItem.permalink ? (
                <a
                  href={activeItem.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Reddit
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="border-white/25 bg-black/45 text-white"
            onClick={() => onMove(-1)}
            aria-label={`Previous item for ${title}`}
          >
            <SkipBack />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="border-white/25 bg-black/45 text-white"
            onClick={onTogglePaused}
            aria-label={timer.isPaused ? `Resume ${title}` : `Pause ${title}`}
          >
            {timer.isPaused ? <Play /> : <Pause />}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="border-white/25 bg-black/45 text-white"
            onClick={onRestart}
            aria-label={`Restart ${title}`}
          >
            <RotateCcw />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="border-white/25 bg-black/45 text-white"
            onClick={() => onMove(1)}
            aria-label={`Next item for ${title}`}
          >
            <SkipForward />
          </Button>
        </div>
        {isFocused ? (
          <div className="mt-2 text-center font-mono text-[10px] text-cyan-200">
            focus
          </div>
        ) : null}
      </div>
    </article>
  );
}
