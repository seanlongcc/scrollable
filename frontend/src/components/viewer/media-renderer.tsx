"use client";

import { useEffect, useRef, useState } from "react";

import type { RuntimeMedia } from "@/lib/feed/types";
import {
  appendHlsSegmentQuery,
  chooseVideoPlayback,
  normalizedPlaybackSeconds,
  shouldSeekToPlaybackTime,
} from "@/lib/viewer/video";
import {
  isAtOrAfterVideoRangeEnd,
  isBeforeVideoRangeStart,
  playbackStartSecondsForRange,
  randomVideoStartSecondsWithinRange,
  videoTimeRangeEndSeconds,
  videoTimeRangeForDuration,
  videoTimeRangeKey,
  videoTimeRangeStartSeconds,
} from "@/lib/viewer/video-time-range";

type PlaybackRestoreTarget = {
  key: string;
  targetSeconds: number;
  randomVideoStart: boolean;
};

type HlsInstance = InstanceType<typeof import("hls.js").default>;

const REFERRERLESS_BLOB_PLAYBACK_HOSTS = new Set(["media.redgifs.com"]);
const REFERRERLESS_BLOB_PREFETCH_LIMIT = 4;

type ReferrerlessBlobPlaybackEntry = {
  objectUrl?: string;
  promise: Promise<string>;
  refs: number;
  lastUsedAt: number;
};

const referrerlessBlobPlaybackCache = new Map<
  string,
  ReferrerlessBlobPlaybackEntry
>();

export function canPrefetchReferrerlessBlobPlayback(url: string) {
  return shouldUseReferrerlessBlobPlayback(url);
}

export function prefetchReferrerlessBlobPlayback(url: string) {
  if (!canPrefetchReferrerlessBlobPlayback(url)) return null;

  const entry = referrerlessBlobPlaybackEntry(url);
  pruneReferrerlessBlobPlaybackCache();
  return entry.promise;
}

export function MediaRenderer({
  media,
  title,
  showControls = true,
  shouldPlay = true,
  initialVideoTime = 0,
  audioEnabled = false,
  finishVideoBeforeAdvance = false,
  randomVideoStart = false,
  onVideoTimeChange,
  onVideoEnded,
}: {
  media: RuntimeMedia;
  title: string;
  showControls?: boolean;
  shouldPlay?: boolean;
  initialVideoTime?: number;
  audioEnabled?: boolean;
  finishVideoBeforeAdvance?: boolean;
  randomVideoStart?: boolean;
  onVideoTimeChange?: (seconds: number, durationSeconds?: number) => void;
  onVideoEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRestoreTargetRef = useRef<PlaybackRestoreTarget | null>(null);
  const restoredVideoKeyRef = useRef<string | null>(null);
  const lastReportedVideoSecondRef = useRef<number | null>(null);
  const reportedRangeEndKeyRef = useRef<string | null>(null);
  const [hasLoadedPlayback, setHasLoadedPlayback] = useState(false);
  const [failedMediaKey, setFailedMediaKey] = useState<string | null>(null);
  const mediaKey = `${media.type}:${media.url}`;
  const hasLoadError = failedMediaKey === mediaKey;
  const mediaHost = hostFromUrl(media.url);
  const shouldLoadPlayback = shouldPlay || hasLoadedPlayback;
  const isVideo = media.type === "video";
  const videoUrl = media.url;
  const videoIsHls = isVideo ? media.isHls : undefined;
  const videoHlsSegmentQuery = isVideo ? media.hlsSegmentQuery : undefined;
  const videoRange = isVideo ? media.videoTimeRange : undefined;
  const videoRangeKey = isVideo ? videoTimeRangeKey(videoRange) : "full";
  const hasVideoRangeEnd = videoTimeRangeEndSeconds(videoRange) !== undefined;
  const videoPlaybackKey = isVideo
    ? `${videoUrl}:${videoIsHls ? "hls" : "native"}:${videoHlsSegmentQuery ?? ""}:${videoRangeKey}`
    : null;
  const playbackPositionKey =
    media.type === "video"
      ? videoPlaybackKey
      : media.type === "audio"
        ? `${media.url}:audio`
        : null;

  function markPlaybackLoaded() {
    if (!hasLoadedPlayback) {
      setHasLoadedPlayback(true);
    }
  }

  useEffect(() => {
    if (!playbackPositionKey) {
      playbackRestoreTargetRef.current = null;
      restoredVideoKeyRef.current = null;
      lastReportedVideoSecondRef.current = null;
      return;
    }

    playbackRestoreTargetRef.current = {
      key: playbackPositionKey,
      targetSeconds:
        media.type === "video"
          ? playbackStartSecondsForRange({
              currentSeconds: normalizedPlaybackSeconds(initialVideoTime),
              range: videoRange,
            })
          : normalizedPlaybackSeconds(initialVideoTime),
      randomVideoStart: media.type === "video" && randomVideoStart,
    };
    restoredVideoKeyRef.current = null;
    lastReportedVideoSecondRef.current = null;
    // Capture resume target only when source or random-start mode changes.
    // Live parent time updates must not reset this value, or playback
    // micro-seeks on every report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.type, playbackPositionKey, randomVideoStart, videoRange]);

  useEffect(() => {
    const element =
      media.type === "video" ? videoRef.current : audioRef.current;
    if (
      !element ||
      (media.type !== "video" && media.type !== "audio") ||
      !onVideoTimeChange ||
      !shouldLoadPlayback ||
      hasLoadError
    ) {
      return;
    }
    const mediaElement = element;
    const handleTimeChange = onVideoTimeChange;

    function reportCurrentPosition(force = false) {
      const seconds = normalizedPlaybackSeconds(mediaElement.currentTime);
      if (!force && lastReportedVideoSecondRef.current === seconds) return;

      lastReportedVideoSecondRef.current = seconds;
      handleTimeChange(
        seconds,
        media.type === "video"
          ? finiteDurationSeconds(mediaElement.duration)
          : undefined,
      );
    }

    function reportPosition() {
      reportCurrentPosition();
    }

    function forceReportPosition() {
      reportCurrentPosition(true);
    }

    mediaElement.addEventListener("timeupdate", reportPosition);
    mediaElement.addEventListener("loadedmetadata", forceReportPosition);
    mediaElement.addEventListener("durationchange", forceReportPosition);
    mediaElement.addEventListener("pause", forceReportPosition);
    mediaElement.addEventListener("seeked", forceReportPosition);

    return () => {
      forceReportPosition();
      mediaElement.removeEventListener("timeupdate", reportPosition);
      mediaElement.removeEventListener("loadedmetadata", forceReportPosition);
      mediaElement.removeEventListener("durationchange", forceReportPosition);
      mediaElement.removeEventListener("pause", forceReportPosition);
      mediaElement.removeEventListener("seeked", forceReportPosition);
    };
  }, [
    hasLoadError,
    media.type,
    onVideoTimeChange,
    playbackPositionKey,
    shouldLoadPlayback,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || media.type !== "video" || hasLoadError) return;

    if (!shouldLoadPlayback) {
      unloadVideo(video);
      return;
    }

    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";
    const playback = chooseVideoPlayback({
      url: videoUrl,
      isHls: videoIsHls,
      canPlayNativeHls: nativeHls,
      hlsSegmentQuery: videoHlsSegmentQuery,
    });

    if (playback.mode === "native") {
      if (shouldUseReferrerlessBlobPlayback(playback.src)) {
        const retainedPrefetch = retainReferrerlessBlobPlayback(playback.src);
        if (retainedPrefetch) {
          let isCancelled = false;

          video.removeAttribute("src");
          void retainedPrefetch.promise.then(
            (objectUrl) => {
              if (!isCancelled) video.src = objectUrl;
            },
            () => {
              if (!isCancelled) video.src = playback.src;
            },
          );

          return () => {
            isCancelled = true;
            retainedPrefetch.release();
            unloadVideo(video);
          };
        }

        const controller = new AbortController();
        let isCancelled = false;
        let objectUrl: string | null = null;

        video.removeAttribute("src");
        void fetch(playback.src, {
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        })
          .then((response) => {
            if (!response.ok) throw new Error("media_fetch_failed");
            return response.blob();
          })
          .then((blob) => {
            if (isCancelled) return;
            objectUrl = URL.createObjectURL(blob);
            video.src = objectUrl;
          })
          .catch(() => {
            if (!isCancelled) video.src = playback.src;
          });

        return () => {
          isCancelled = true;
          controller.abort();
          unloadVideo(video);
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
      }

      video.src = playback.src;
      return () => unloadVideo(video);
    }

    let isCancelled = false;
    let hls: HlsInstance | null = null;

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (isCancelled) return;

        if (!Hls.isSupported()) {
          video.src = playback.src;
          return;
        }

        hls = new Hls({
          maxBufferLength: 90,
          maxMaxBufferLength: 180,
          backBufferLength: 30,
          capLevelToPlayerSize: true,
          startFragPrefetch: true,
          ...(videoHlsSegmentQuery
            ? {
                xhrSetup(xhr, url) {
                  const nextUrl = appendHlsSegmentQuery(
                    url,
                    videoHlsSegmentQuery,
                  );
                  if (nextUrl !== url) xhr.open("GET", nextUrl, true);
                },
                fetchSetup(context, initParams) {
                  return new Request(
                    appendHlsSegmentQuery(context.url, videoHlsSegmentQuery),
                    initParams,
                  );
                },
              }
            : {}),
        });
        hls.loadSource(playback.src);
        hls.attachMedia(video);
      })
      .catch(() => {
        if (!isCancelled) video.src = playback.src;
      });

    return () => {
      isCancelled = true;
      hls?.destroy();
      unloadVideo(video);
    };
  }, [
    hasLoadError,
    media.type,
    shouldLoadPlayback,
    videoHlsSegmentQuery,
    videoIsHls,
    videoPlaybackKey,
    videoUrl,
  ]);

  useEffect(() => {
    if (
      hasLoadError ||
      !shouldLoadPlayback ||
      (media.type !== "video" && media.type !== "audio")
    ) {
      return;
    }

    const element =
      media.type === "video" ? videoRef.current : audioRef.current;
    if (!element) return;

    if (!shouldPlay) {
      element.pause();
      return;
    }

    requestMediaPlayback(element);
  }, [
    audioEnabled,
    hasLoadError,
    media.type,
    shouldLoadPlayback,
    shouldPlay,
    mediaKey,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (
      !video ||
      media.type !== "video" ||
      !shouldLoadPlayback ||
      hasLoadError
    ) {
      return;
    }
    const videoElement = video;
    let isCancelled = false;

    videoElement.muted = !audioEnabled;
    videoElement.defaultMuted = !audioEnabled;
    videoElement.playsInline = true;
    videoElement.autoplay = true;
    videoElement.setAttribute("playsinline", "");
    videoElement.setAttribute("webkit-playsinline", "");

    function requestPlayback() {
      if (isCancelled || !shouldLoadPlayback || videoElement.paused === false) {
        return;
      }

      requestMediaPlayback(videoElement);
    }

    requestPlayback();
    videoElement.addEventListener("loadedmetadata", requestPlayback);
    videoElement.addEventListener("loadeddata", requestPlayback);
    videoElement.addEventListener("canplay", requestPlayback);
    videoElement.addEventListener("canplaythrough", requestPlayback);

    return () => {
      isCancelled = true;
      videoElement.removeEventListener("loadedmetadata", requestPlayback);
      videoElement.removeEventListener("loadeddata", requestPlayback);
      videoElement.removeEventListener("canplay", requestPlayback);
      videoElement.removeEventListener("canplaythrough", requestPlayback);
    };
  }, [
    audioEnabled,
    hasLoadError,
    media.type,
    shouldLoadPlayback,
    videoPlaybackKey,
  ]);

  useEffect(() => {
    const element =
      media.type === "video" ? videoRef.current : audioRef.current;
    if (
      !element ||
      (media.type !== "video" && media.type !== "audio") ||
      !shouldLoadPlayback ||
      hasLoadError
    ) {
      return;
    }
    const mediaElement = element;
    const restoreTarget = playbackPositionKey
      ? playbackRestoreTargetRef.current
      : null;
    if (!restoreTarget || restoreTarget.key !== playbackPositionKey) return;
    const restoreKey = restoreTarget.key;
    const shouldRandomVideoStart = restoreTarget.randomVideoStart;
    const savedTargetSeconds = restoreTarget.targetSeconds;
    function restorePosition() {
      if (restoredVideoKeyRef.current === restoreKey) return;
      if (shouldRandomVideoStart && Number.isNaN(mediaElement.duration)) {
        return;
      }
      const targetSeconds = shouldRandomVideoStart
        ? randomVideoStartSecondsWithinRange({
            durationSeconds: mediaElement.duration,
            range: videoRange,
          })
        : playbackStartSecondsForRange({
            currentSeconds: savedTargetSeconds,
            range: videoRange,
            durationSeconds: mediaElement.duration,
          });
      if (targetSeconds <= 0) {
        restoredVideoKeyRef.current = restoreKey;
        lastReportedVideoSecondRef.current = 0;
        return;
      }
      if (
        !shouldSeekToPlaybackTime({
          currentSeconds: mediaElement.currentTime,
          targetSeconds,
        })
      ) {
        restoredVideoKeyRef.current = restoreKey;
        lastReportedVideoSecondRef.current = targetSeconds;
        return;
      }

      try {
        mediaElement.currentTime = targetSeconds;
        restoredVideoKeyRef.current = restoreKey;
        lastReportedVideoSecondRef.current = targetSeconds;
      } catch {
        // Some streamed media rejects seeking before enough metadata is ready.
      }
    }

    restorePosition();
    mediaElement.addEventListener("loadedmetadata", restorePosition);
    mediaElement.addEventListener("canplay", restorePosition, { once: true });

    return () => {
      mediaElement.removeEventListener("loadedmetadata", restorePosition);
      mediaElement.removeEventListener("canplay", restorePosition);
    };
  }, [
    hasLoadError,
    media.type,
    playbackPositionKey,
    randomVideoStart,
    shouldLoadPlayback,
    videoRange,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (
      !video ||
      media.type !== "video" ||
      !shouldLoadPlayback ||
      hasLoadError ||
      !videoRange
    ) {
      return;
    }
    const videoElement = video;
    const rangeEndKey = `${videoPlaybackKey}:${videoRangeKey}`;

    function enforceVideoRange() {
      const effectiveRange = videoTimeRangeForDuration({
        range: videoRange,
        durationSeconds: videoElement.duration,
      });

      if (!effectiveRange) {
        if (
          Number.isFinite(videoElement.duration) &&
          videoElement.duration > 0 &&
          videoElement.currentTime >= videoElement.duration
        ) {
          videoElement.currentTime = 0;
        }
        reportedRangeEndKeyRef.current = null;
        return;
      }

      if (
        isBeforeVideoRangeStart({
          currentSeconds: videoElement.currentTime,
          range: effectiveRange,
        })
      ) {
        videoElement.currentTime = videoTimeRangeStartSeconds(effectiveRange);
        return;
      }

      if (
        !isAtOrAfterVideoRangeEnd({
          currentSeconds: videoElement.currentTime,
          range: effectiveRange,
        })
      ) {
        reportedRangeEndKeyRef.current = null;
        return;
      }

      if (finishVideoBeforeAdvance) {
        if (reportedRangeEndKeyRef.current !== rangeEndKey) {
          reportedRangeEndKeyRef.current = rangeEndKey;
          onVideoEnded?.();
        }
        return;
      }

      reportedRangeEndKeyRef.current = null;
      videoElement.currentTime = videoTimeRangeStartSeconds(effectiveRange);
      if (shouldPlay) requestMediaPlayback(videoElement);
    }

    enforceVideoRange();
    videoElement.addEventListener("loadedmetadata", enforceVideoRange);
    videoElement.addEventListener("timeupdate", enforceVideoRange);
    videoElement.addEventListener("seeked", enforceVideoRange);

    return () => {
      videoElement.removeEventListener("loadedmetadata", enforceVideoRange);
      videoElement.removeEventListener("timeupdate", enforceVideoRange);
      videoElement.removeEventListener("seeked", enforceVideoRange);
    };
  }, [
    finishVideoBeforeAdvance,
    hasLoadError,
    media.type,
    onVideoEnded,
    shouldLoadPlayback,
    shouldPlay,
    videoPlaybackKey,
    videoRange,
    videoRangeKey,
  ]);

  function handleVideoElementEnded() {
    if (media.type !== "video" || !videoRange || finishVideoBeforeAdvance) {
      onVideoEnded?.();
      return;
    }

    const video = videoRef.current;
    if (!video) {
      onVideoEnded?.();
      return;
    }

    const effectiveRange = videoTimeRangeForDuration({
      range: videoRange,
      durationSeconds: video.duration,
    });
    const shouldLoopFromRange =
      effectiveRange || videoTimeRangeEndSeconds(videoRange) !== undefined;

    if (!shouldLoopFromRange) {
      onVideoEnded?.();
      return;
    }

    video.currentTime = videoTimeRangeStartSeconds(effectiveRange);
    if (shouldPlay) requestMediaPlayback(video);
  }

  function handleMediaError() {
    setFailedMediaKey(mediaKey);
  }

  if (hasLoadError) {
    return (
      <div
        role="alert"
        className="grid size-full place-items-center bg-background p-4 text-center"
      >
        <div className="grid max-w-sm gap-2">
          <h3 className="text-sm font-medium text-foreground">
            Media failed to load
          </h3>
          <p className="text-xs text-muted-foreground">
            {mediaHost} refused this media request or blocked direct playback.
          </p>
        </div>
      </div>
    );
  }

  if (media.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={media.url}
        alt={title}
        decoding="async"
        loading="eager"
        fetchPriority="high"
        className="h-full w-full object-contain"
        draggable={false}
        onError={handleMediaError}
      />
    );
  }

  if (media.type === "audio") {
    return (
      <div className="grid size-full place-items-center bg-background px-6">
        <audio
          ref={audioRef}
          src={shouldLoadPlayback ? media.url : undefined}
          aria-label={title}
          className="w-full max-w-md"
          autoPlay={shouldLoadPlayback}
          preload={shouldLoadPlayback ? "auto" : "metadata"}
          controls={showControls}
          loop
          onLoadedMetadata={markPlaybackLoaded}
          onCanPlay={markPlaybackLoaded}
          onPlay={markPlaybackLoaded}
          onError={handleMediaError}
        />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      aria-label={title}
      className="h-full w-full object-contain"
      autoPlay={shouldLoadPlayback}
      controls={showControls}
      playsInline
      muted={!audioEnabled}
      preload={shouldLoadPlayback ? "auto" : "metadata"}
      loop={!finishVideoBeforeAdvance && !hasVideoRangeEnd}
      onEnded={handleVideoElementEnded}
      onLoadedMetadata={markPlaybackLoaded}
      onCanPlay={markPlaybackLoaded}
      onPlay={markPlaybackLoaded}
      onError={handleMediaError}
    />
  );
}

function hostFromUrl(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "Media host";
  }
}

function shouldUseReferrerlessBlobPlayback(value: string) {
  try {
    const url = new URL(value);
    return REFERRERLESS_BLOB_PLAYBACK_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function retainReferrerlessBlobPlayback(value: string) {
  const entry = referrerlessBlobPlaybackCache.get(value);
  if (!entry) return null;

  entry.refs += 1;
  entry.lastUsedAt = Date.now();

  return {
    promise: entry.promise,
    release: () => {
      entry.refs = Math.max(0, entry.refs - 1);
      entry.lastUsedAt = Date.now();
      pruneReferrerlessBlobPlaybackCache();
    },
  };
}

function referrerlessBlobPlaybackEntry(value: string) {
  const cached = referrerlessBlobPlaybackCache.get(value);
  if (cached) {
    cached.lastUsedAt = Date.now();
    return cached;
  }

  const entry: ReferrerlessBlobPlaybackEntry = {
    refs: 0,
    lastUsedAt: Date.now(),
    promise: Promise.resolve(""),
  };
  entry.promise = fetch(value, {
    cache: "no-store",
    referrerPolicy: "no-referrer",
  })
    .then((response) => {
      if (!response.ok) throw new Error("media_fetch_failed");
      return response.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      entry.objectUrl = objectUrl;
      entry.lastUsedAt = Date.now();
      pruneReferrerlessBlobPlaybackCache();
      return objectUrl;
    })
    .catch((error: unknown) => {
      referrerlessBlobPlaybackCache.delete(value);
      throw error;
    });

  referrerlessBlobPlaybackCache.set(value, entry);
  return entry;
}

function pruneReferrerlessBlobPlaybackCache() {
  const evictable = [...referrerlessBlobPlaybackCache.entries()]
    .filter(([, entry]) => entry.refs === 0 && entry.objectUrl)
    .sort((first, second) => first[1].lastUsedAt - second[1].lastUsedAt);

  while (
    referrerlessBlobPlaybackCache.size > REFERRERLESS_BLOB_PREFETCH_LIMIT &&
    evictable.length
  ) {
    const [url, entry] = evictable.shift()!;
    if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
    referrerlessBlobPlaybackCache.delete(url);
  }
}

function requestMediaPlayback(element: HTMLMediaElement) {
  try {
    const playResult = element.play();
    if (playResult && typeof playResult.catch === "function") {
      void playResult.catch(() => undefined);
    }
  } catch {
    // Autoplay can be rejected by browser policy; controls stay available.
  }
}

function finiteDurationSeconds(durationSeconds: number) {
  return Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : undefined;
}

function unloadVideo(video: HTMLVideoElement) {
  const isJsdom =
    typeof navigator !== "undefined" && /\bjsdom\b/i.test(navigator.userAgent);

  if (!isJsdom) video.pause();
  video.removeAttribute("src");
  if (!isJsdom) video.load();
}
