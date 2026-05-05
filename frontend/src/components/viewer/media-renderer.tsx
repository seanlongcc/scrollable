"use client";

import { useEffect, useRef, useState } from "react";

import type { RuntimeMedia } from "@/lib/feed/types";
import {
  appendHlsSegmentQuery,
  chooseVideoPlayback,
  normalizedPlaybackSeconds,
  randomVideoStartSeconds,
  shouldSeekToPlaybackTime,
} from "@/lib/viewer/video";

type PlaybackRestoreTarget = {
  key: string;
  targetSeconds: number;
  randomVideoStart: boolean;
};

type HlsInstance = InstanceType<typeof import("hls.js").default>;

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
  onVideoTimeChange?: (seconds: number) => void;
  onVideoEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRestoreTargetRef = useRef<PlaybackRestoreTarget | null>(null);
  const restoredVideoKeyRef = useRef<string | null>(null);
  const lastReportedVideoSecondRef = useRef<number | null>(null);
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
  const videoPlaybackKey = isVideo
    ? `${videoUrl}:${videoIsHls ? "hls" : "native"}:${videoHlsSegmentQuery ?? ""}`
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
      targetSeconds: normalizedPlaybackSeconds(initialVideoTime),
      randomVideoStart: media.type === "video" && randomVideoStart,
    };
    restoredVideoKeyRef.current = null;
    lastReportedVideoSecondRef.current = null;
    // Capture resume target only when source or random-start mode changes.
    // Live parent time updates must not reset this value, or playback
    // micro-seeks on every report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.type, playbackPositionKey, randomVideoStart]);

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
      handleTimeChange(seconds);
    }

    function reportPosition() {
      reportCurrentPosition();
    }

    function forceReportPosition() {
      reportCurrentPosition(true);
    }

    mediaElement.addEventListener("timeupdate", reportPosition);
    mediaElement.addEventListener("pause", forceReportPosition);
    mediaElement.addEventListener("seeked", forceReportPosition);

    return () => {
      forceReportPosition();
      mediaElement.removeEventListener("timeupdate", reportPosition);
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
        ? randomVideoStartSeconds(mediaElement.duration)
        : savedTargetSeconds;
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
  ]);

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
      loop={!finishVideoBeforeAdvance}
      onEnded={onVideoEnded}
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

function unloadVideo(video: HTMLVideoElement) {
  const isJsdom =
    typeof navigator !== "undefined" && /\bjsdom\b/i.test(navigator.userAgent);

  if (!isJsdom) video.pause();
  video.removeAttribute("src");
  if (!isJsdom) video.load();
}
