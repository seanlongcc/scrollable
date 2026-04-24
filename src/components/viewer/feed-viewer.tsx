"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Grid2X2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { RuntimeFeedItem } from "@/lib/feed/types";
import {
  advanceTimerState,
  createTimerState,
  moveTimerIndex,
  togglePaused,
} from "@/lib/viewer/timer";
import { MediaRenderer } from "./media-renderer";

export function FeedViewer({
  title,
  items,
  timerSeconds,
  onBackToGrid,
}: {
  title: string;
  items: RuntimeFeedItem[];
  timerSeconds: number;
  onBackToGrid?: () => void;
}) {
  const [timer, setTimer] = useState(() =>
    createTimerState({ durationSeconds: timerSeconds, itemCount: items.length }),
  );
  const [galleryIndexes, setGalleryIndexes] = useState<Record<string, number>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const activeItem = items[timer.activeIndex];
  const activeGalleryIndex = activeItem ? galleryIndexes[activeItem.id] ?? 0 : 0;
  const activeMedia = activeItem?.media[activeGalleryIndex];

  useEffect(() => {
    scrollerRef.current?.children[timer.activeIndex]?.scrollIntoView({
      block: "start",
    });
  }, [timer.activeIndex]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimer((state) => advanceTimerState(state, 250));
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        setTimer((state) => moveTimerIndex(state, 1));
      }
      if (event.key === "ArrowUp") {
        setTimer((state) => moveTimerIndex(state, -1));
      }
      if (event.key === " ") {
        event.preventDefault();
        setTimer(togglePaused);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const progress = useMemo(() => {
    if (timer.durationSeconds <= 0) return 0;
    return Math.min(100, (timer.elapsedMs / (timer.durationSeconds * 1000)) * 100);
  }, [timer.durationSeconds, timer.elapsedMs]);

  if (!activeItem || !activeMedia) {
    return (
      <div className="grid min-h-[70dvh] place-items-center rounded-lg border border-border/60 text-sm text-muted-foreground">
        No runtime media
      </div>
    );
  }

  const changeGallery = (direction: 1 | -1) => {
    setGalleryIndexes((state) => {
      const current = state[activeItem.id] ?? 0;
      const next =
        (current + direction + activeItem.media.length) % activeItem.media.length;
      return { ...state, [activeItem.id]: next };
    });
  };

  const onScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientHeight === 0) return;

    const nextIndex = Math.round(scroller.scrollTop / scroller.clientHeight);
    if (nextIndex === timer.activeIndex || !items[nextIndex]) return;

    setTimer((state) => ({
      ...state,
      activeIndex: nextIndex,
      elapsedMs: 0,
    }));
  };

  return (
    <section className="relative h-dvh overflow-hidden bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-20 h-1 bg-white/10">
        <div
          className="h-full bg-cyan-300 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="h-full snap-y snap-mandatory overflow-y-auto"
      >
        {items.map((item) => {
          const galleryIndex = galleryIndexes[item.id] ?? 0;
          const media = item.media[galleryIndex] ?? item.media[0];

          if (!media) return null;

          return (
            <article
              key={item.id}
              className="relative flex h-dvh snap-start items-center justify-center"
            >
              <MediaRenderer media={media} title={item.title} />
            </article>
          );
        })}
      </div>

      {activeItem.media.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="pointer-events-auto border-white/25 bg-black/40 text-white"
            onClick={() => changeGallery(-1)}
            aria-label="Previous gallery media"
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="pointer-events-auto border-white/25 bg-black/40 text-white"
            onClick={() => changeGallery(1)}
            aria-label="Next gallery media"
          >
            <ChevronRight />
          </Button>
        </div>
      ) : null}

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-3">
        <div className="min-w-0 rounded-lg bg-black/55 px-3 py-2 backdrop-blur">
          <div className="truncate text-sm font-medium">{title}</div>
          <div className="font-mono text-xs text-white/60">
            {timer.activeIndex + 1}/{items.length}
          </div>
        </div>
        {onBackToGrid ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="border-white/25 bg-black/40 text-white"
            onClick={onBackToGrid}
            aria-label="Grid"
          >
            <Grid2X2 />
          </Button>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/75 to-transparent p-3 pt-20">
        <div className="mx-auto grid max-w-2xl gap-3">
          <div className="rounded-lg bg-black/55 p-3 backdrop-blur">
            <div className="line-clamp-2 text-sm font-medium">
              {activeItem.title}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-white/60">
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

          {activeItem.media.length > 1 ? (
            <div className="flex justify-center gap-1">
              {activeItem.media.map((media, index) => (
                <span
                  key={`${media.url}-${index}`}
                  className={`h-1.5 w-8 rounded-full ${
                    index === activeGalleryIndex ? "bg-cyan-300" : "bg-white/25"
                  }`}
                />
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="border-white/25 bg-black/40 text-white"
              onClick={() => setTimer((state) => moveTimerIndex(state, -1))}
              aria-label="Previous item"
            >
              <SkipBack />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="border-white/25 bg-black/40 text-white"
              onClick={() => setTimer(togglePaused)}
              aria-label={timer.isPaused ? "Resume timer" : "Pause timer"}
            >
              {timer.isPaused ? <Play /> : <Pause />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="border-white/25 bg-black/40 text-white"
              onClick={() => setTimer((state) => ({ ...state, elapsedMs: 0 }))}
              aria-label="Restart timer"
            >
              <RotateCcw />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="border-white/25 bg-black/40 text-white"
              onClick={() => setTimer((state) => moveTimerIndex(state, 1))}
              aria-label="Next item"
            >
              <SkipForward />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
