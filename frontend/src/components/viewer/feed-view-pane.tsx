"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  GlobeOff,
  Maximize2,
  MousePointer2,
  Pencil,
  X,
} from "lucide-react";
import {
  type ReactNode,
  type MouseEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import type { RuntimeFeedItem, RuntimeMedia } from "@/lib/feed/types";
import { cn } from "@/lib/utils";
import {
  getTimerProgressPercent,
  type TimerMode,
  type TimerState,
} from "@/lib/viewer/timer";
import { MediaRenderer } from "./media-renderer";
import {
  collectImagePrefetchUrls,
  getNextImagePrefetchCount,
  shouldPrefetchLocalImages,
} from "./feed-view-pane-prefetch";
import { useFeedMediaTransition } from "./feed-view-pane-motion";
import { sourceActionRailClass } from "./source-action-rail";
import { useFeedSwipe } from "./use-feed-swipe";
import { videoPlaybackStateKey } from "./video-playback-keys";

type ActiveMediaFrame = {
  key: string;
  media: RuntimeMedia;
  title: string;
  audioEnabled: boolean;
  finishVideoBeforeAdvance: boolean;
  randomVideoStart: boolean;
  initialVideoTime: number;
  onVideoTimeChange?: (seconds: number, durationSeconds?: number) => void;
  onVideoEnded?: () => void;
};

export function FeedViewPane({
  viewId,
  title,
  items,
  timer,
  timerMode = "global",
  galleryIndexes,
  videoPositions = {},
  audioEnabled = false,
  finishVideoBeforeAdvance = false,
  randomVideoStart = false,
  compact = false,
  isFocused = false,
  forceInfoVisible = false,
  isPlaybackActive = true,
  isRuntimeLoading = false,
  emptyMessage = "No runtime media",
  emptyAction,
  hideUi = false,
  onGalleryChange,
  onVideoPositionChange,
  onVideoEnded,
  onMove,
  onSelect,
  onToggleSelect,
  onMaximize,
  onEdit,
  onRemove,
}: {
  viewId?: string;
  title: string;
  items: RuntimeFeedItem[];
  timer: TimerState;
  timerMode?: TimerMode;
  galleryIndexes: Record<string, number>;
  videoPositions?: Record<string, number>;
  audioEnabled?: boolean;
  finishVideoBeforeAdvance?: boolean;
  randomVideoStart?: boolean;
  compact?: boolean;
  isFocused?: boolean;
  forceInfoVisible?: boolean;
  isPlaybackActive?: boolean;
  isRuntimeLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  hideUi?: boolean;
  onGalleryChange: (itemId: string, direction: 1 | -1) => void;
  onVideoPositionChange?: (
    key: string,
    seconds: number,
    durationSeconds?: number,
  ) => void;
  onVideoEnded?: (key: string) => void;
  onMove: (direction: 1 | -1) => void;
  onTogglePaused: () => void;
  onRestart: () => void;
  onSelect?: () => void;
  onToggleSelect?: () => void;
  onMaximize?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onTimerModeChange?: (mode: TimerMode) => void;
  onTimerSecondsChange?: (seconds: number) => void;
}) {
  const prefetchedImageUrlsRef = useRef<Set<string>>(new Set());
  const activeItem = items[timer.activeIndex];
  const activeGalleryIndex = activeItem
    ? (galleryIndexes[activeItem.id] ?? 0)
    : 0;
  const activeMedia = activeItem?.media[activeGalleryIndex];
  const canSelectSource = Boolean(onSelect || onToggleSelect);
  const showMediaControls = !hideUi && (!canSelectSource || isFocused);
  const activeMediaKey =
    activeItem && activeMedia
      ? `${activeItem.id}:${activeGalleryIndex}:${activeMedia.type}:${activeMedia.url}:${audioEnabled ? "audio" : "muted"}:${finishVideoBeforeAdvance ? "finish" : "loop"}:${randomVideoStart ? "random-start" : "resume"}`
      : null;
  const {
    transition: mediaTransition,
    setFeedDirection,
    setGalleryDirection,
  } = useFeedMediaTransition({
    itemId: activeItem?.id ?? null,
    activeIndex: timer.activeIndex,
    itemCount: items.length,
    galleryIndex: activeGalleryIndex,
    galleryCount: activeItem?.media.length ?? 0,
    mediaKey: activeMediaKey,
  });
  const isVideo = activeMedia?.type === "video";
  const tracksPlaybackPosition =
    activeMedia?.type === "video" || activeMedia?.type === "audio";
  const modeLabel = timerMode === "global" ? "global" : "local";
  const TimerModeIcon = timerMode === "global" ? Globe : GlobeOff;
  const videoPositionKey =
    activeItem && tracksPlaybackPosition
      ? videoPlaybackStateKey({
          viewId,
          title,
          itemId: activeItem.id,
          galleryIndex: activeGalleryIndex,
        })
      : null;
  const handleVideoTimeChange = useCallback(
    (seconds: number, durationSeconds?: number) => {
      if (videoPositionKey) {
        onVideoPositionChange?.(videoPositionKey, seconds, durationSeconds);
      }
    },
    [onVideoPositionChange, videoPositionKey],
  );
  const handleVideoEnded = useCallback(() => {
    if (videoPositionKey) onVideoEnded?.(videoPositionKey);
  }, [onVideoEnded, videoPositionKey]);
  const currentMediaFrame =
    activeMediaKey && activeMedia && activeItem
      ? {
          key: activeMediaKey,
          media: activeMedia,
          title: activeItem.title,
          audioEnabled,
          finishVideoBeforeAdvance,
          randomVideoStart,
          initialVideoTime: videoPositionKey
            ? (videoPositions[videoPositionKey] ?? 0)
            : 0,
          onVideoTimeChange: videoPositionKey
            ? handleVideoTimeChange
            : undefined,
          onVideoEnded:
            isVideo && videoPositionKey ? handleVideoEnded : undefined,
        }
      : null;
  const [mediaFrameState, setMediaFrameState] = useState<{
    current: ActiveMediaFrame | null;
    outgoing: ActiveMediaFrame | null;
  }>({
    current: currentMediaFrame,
    outgoing: null,
  });
  if (
    (mediaFrameState.current?.key ?? null) !== (currentMediaFrame?.key ?? null)
  ) {
    setMediaFrameState({
      current: currentMediaFrame,
      outgoing: mediaFrameState.current,
    });
  }
  const outgoingMediaFrame =
    mediaTransition === "idle" ? null : mediaFrameState.outgoing;
  const progress = getTimerProgressPercent(timer);

  useEffect(() => {
    const prefetchNextItemCount = getNextImagePrefetchCount();
    if (prefetchNextItemCount === 0) return;

    const prefetchLocalImages = shouldPrefetchLocalImages();
    const prefetchedImageUrls = prefetchedImageUrlsRef.current;
    const urls = collectImagePrefetchUrls({
      items,
      activeIndex: timer.activeIndex,
      activeGalleryIndex,
      prefetchNextItemCount,
      prefetchLocalImages,
    });

    for (const url of urls) {
      if (prefetchedImageUrls.has(url)) continue;

      const image = new Image();
      image.decoding = "async";
      if ("fetchPriority" in image) image.fetchPriority = "low";
      image.src = url;
      if (typeof image.decode === "function") {
        void image.decode().catch(() => undefined);
      }
      prefetchedImageUrls.add(url);
    }
  }, [activeGalleryIndex, items, timer.activeIndex]);

  const showProgress = !hideUi && timer.itemCount > 1;
  const sourceChromeClass = cn(
    "transition-opacity duration-200",
    !isFocused &&
      !forceInfoVisible &&
      "opacity-0 group-hover/source:opacity-100 group-focus-within/source:opacity-100",
  );
  const handleGalleryChange = useCallback(
    (itemId: string, direction: 1 | -1) => {
      setGalleryDirection(direction);
      onGalleryChange(itemId, direction);
    },
    [onGalleryChange, setGalleryDirection],
  );
  const handleMove = useCallback(
    (direction: 1 | -1) => {
      setFeedDirection(direction);
      onMove(direction);
    },
    [onMove, setFeedDirection],
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
        handleGalleryChange(activeItem.id, direction);
        return;
      }

      handleMove(direction);
    },
    [activeItem, handleGalleryChange, handleMove],
  );
  const handlePaneClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (
        (event.target as HTMLElement).closest(
          "button, a, input, textarea, select, [contenteditable=true]",
        )
      ) {
        return;
      }

      event.stopPropagation();
      (onToggleSelect ?? onSelect)?.();
    },
    [onSelect, onToggleSelect],
  );
  const touchHandlers = useFeedSwipe({
    activeItem,
    onGalleryChange: handleGalleryChange,
    onMove: handleMove,
  });
  function selectThen(action?: () => void) {
    onSelect?.();
    action?.();
  }

  return (
    <article
      className="group/source relative grid size-full min-h-0 touch-none overflow-hidden rounded-none border border-border/65 bg-background text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.014)] md:rounded-2xl"
      onClick={handlePaneClick}
      onWheel={handleWheel}
      {...touchHandlers}
    >
      {showProgress ? (
        <div
          data-testid="feed-timer-progress"
          data-placement="top-inset"
          className="absolute top-2 right-2 left-2 z-20 h-0.5 overflow-hidden rounded-full bg-background/75 md:h-1"
          aria-label={`${title} timer progress`}
        >
          <div
            key={timer.activeIndex}
            className="h-full origin-left rounded-full bg-secondary transition-transform duration-[250ms] ease-linear will-change-transform"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
      ) : null}

      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {currentMediaFrame ? (
          <div
            key={activeMediaKey}
            data-testid="feed-media-transition"
            data-media-transition={mediaTransition}
            data-media-layer="incoming"
            className="feed-media-transition relative size-full overflow-hidden"
          >
            {outgoingMediaFrame ? (
              <div
                key={`outgoing:${outgoingMediaFrame.key}`}
                data-testid="feed-media-transition-outgoing"
                data-media-transition={mediaTransition}
                data-media-layer="outgoing"
                className="feed-media-transition-outgoing pointer-events-none absolute inset-0"
                aria-hidden="true"
              >
                <MediaRenderer
                  media={outgoingMediaFrame.media}
                  title={outgoingMediaFrame.title}
                  showControls={false}
                  shouldPlay={false}
                  audioEnabled={outgoingMediaFrame.audioEnabled}
                  finishVideoBeforeAdvance={
                    outgoingMediaFrame.finishVideoBeforeAdvance
                  }
                  randomVideoStart={outgoingMediaFrame.randomVideoStart}
                  initialVideoTime={outgoingMediaFrame.initialVideoTime}
                />
              </div>
            ) : null}
            <div
              key={`incoming:${currentMediaFrame.key}`}
              data-media-layer="incoming"
              className="feed-media-transition-incoming absolute inset-0"
            >
              <MediaRenderer
                media={currentMediaFrame.media}
                title={currentMediaFrame.title}
                showControls={showMediaControls}
                shouldPlay={isPlaybackActive}
                audioEnabled={currentMediaFrame.audioEnabled}
                finishVideoBeforeAdvance={
                  currentMediaFrame.finishVideoBeforeAdvance
                }
                randomVideoStart={currentMediaFrame.randomVideoStart}
                initialVideoTime={currentMediaFrame.initialVideoTime}
                onVideoTimeChange={currentMediaFrame.onVideoTimeChange}
                onVideoEnded={currentMediaFrame.onVideoEnded}
              />
            </div>
          </div>
        ) : (
          <div className="grid size-full place-items-center overflow-auto bg-background text-xs text-muted-foreground">
            <div className="grid max-h-full max-w-full justify-items-center gap-3 p-4 text-center">
              <span className="text-wrap-anywhere">
                {isRuntimeLoading ? "Loading runtime media" : emptyMessage}
              </span>
              {!isRuntimeLoading ? emptyAction : null}
            </div>
          </div>
        )}
      </div>

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
            onClick={() =>
              selectThen(() => handleGalleryChange(activeItem.id, -1))
            }
            aria-label={`Previous media for ${title}`}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="pointer-events-auto border-border bg-background/75 text-foreground"
            onClick={() =>
              selectThen(() => handleGalleryChange(activeItem.id, 1))
            }
            aria-label={`Next media for ${title}`}
          >
            <ChevronRight />
          </Button>
        </div>
      ) : null}

      {!hideUi && (onRemove || onMaximize || onEdit || onSelect) ? (
        <div
          data-source-action-rail
          data-focused={isFocused ? "true" : "false"}
          className={sourceActionRailClass(isFocused)}
        >
          {onRemove ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="pointer-events-auto border-border bg-background/75 text-foreground"
              onClick={() => selectThen(onRemove)}
              aria-label={`Remove ${title}`}
            >
              <X />
            </Button>
          ) : null}
          {onMaximize ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="pointer-events-auto border-border bg-background/75 text-foreground"
              onClick={() => selectThen(onMaximize)}
              aria-label={`Maximize ${title}`}
            >
              <Maximize2 />
            </Button>
          ) : null}
          {onEdit ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="pointer-events-auto border-border bg-background/75 text-foreground"
              onClick={() => selectThen(onEdit)}
              aria-label={`Edit ${title}`}
            >
              <Pencil />
            </Button>
          ) : null}
          {onSelect ? (
            <Button
              type="button"
              size="icon-sm"
              variant={isFocused ? "default" : "outline"}
              className="pointer-events-auto border-border bg-background/75 text-foreground"
              onClick={onToggleSelect ?? onSelect}
              aria-label={`Select ${title}`}
              aria-pressed={isFocused}
            >
              <MousePointer2 />
            </Button>
          ) : null}
        </div>
      ) : null}

      {!hideUi && forceInfoVisible && activeItem ? (
        <div
          data-testid="feed-item-info"
          data-placement="bottom"
          className={cn(
            "pointer-events-none absolute inset-x-0 z-20",
            isVideo
              ? "bottom-14 px-2 pb-2"
              : "bottom-0 bg-gradient-to-t from-background via-background/70 to-transparent px-0 pt-16 pb-0",
            sourceChromeClass,
          )}
        >
          <div
            className={cn(
              "pointer-events-auto border border-border/60 bg-background/78 backdrop-blur",
              compact ? "p-1.5" : "p-2",
              isVideo
                ? "mb-2 rounded-xl"
                : "rounded-t-xl rounded-b-none border-x-0 border-b-0",
            )}
          >
            <div
              className={cn(
                "text-wrap-anywhere font-medium",
                compact ? "line-clamp-1 text-[11px]" : "line-clamp-2 text-xs",
              )}
              title={activeItem.title}
            >
              {activeItem.title}
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-mono">
                {items.length ? timer.activeIndex + 1 : 0}/{items.length} ·{" "}
                {timer.durationSeconds}s
              </span>
              <span className="inline-flex items-center gap-1">
                <TimerModeIcon
                  className="size-3 text-secondary"
                  aria-label={`${modeLabel} timer`}
                  role="img"
                />
                {modeLabel}
              </span>
              {activeItem.subreddit ? (
                <span className="max-w-full truncate">
                  r/{activeItem.subreddit}
                </span>
              ) : null}
              {activeItem.author ? (
                <span className="max-w-full truncate">
                  u/{activeItem.author}
                </span>
              ) : null}
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
        </div>
      ) : null}

      {!hideUi && isFocused ? (
        <div
          data-testid="feed-selected-outline"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 border-2 border-primary ring-2 ring-primary/15 md:rounded-2xl"
        />
      ) : null}
    </article>
  );
}
