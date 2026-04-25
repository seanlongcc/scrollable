"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";

import type { RuntimeMedia } from "@/lib/feed/types";
import { appendHlsSegmentQuery, chooseVideoPlayback } from "@/lib/viewer/video";

export function MediaRenderer({
  media,
  title,
  showControls = true,
  shouldPlay = true,
  initialVideoTime = 0,
  onVideoTimeChange,
}: {
  media: RuntimeMedia;
  title: string;
  showControls?: boolean;
  shouldPlay?: boolean;
  initialVideoTime?: number;
  onVideoTimeChange?: (seconds: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || media.type !== "video") return;

    if (!shouldPlay) {
      unloadVideo(video);
      return;
    }

    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";
    const playback = chooseVideoPlayback({
      url: media.url,
      isHls: media.isHls,
      canPlayNativeHls: nativeHls,
      hlsSegmentQuery: media.hlsSegmentQuery,
    });

    if (playback.mode === "native") {
      video.src = playback.src;
      return () => unloadVideo(video);
    }

    if (!Hls.isSupported()) {
      video.src = playback.src;
      return () => unloadVideo(video);
    }

    const hls = new Hls({
      maxBufferLength: 90,
      maxMaxBufferLength: 180,
      backBufferLength: 30,
      capLevelToPlayerSize: true,
      startFragPrefetch: true,
      ...(media.hlsSegmentQuery
        ? {
            xhrSetup(xhr, url) {
              const nextUrl = appendHlsSegmentQuery(url, media.hlsSegmentQuery);
              if (nextUrl !== url) xhr.open("GET", nextUrl, true);
            },
            fetchSetup(context, initParams) {
              return new Request(
                appendHlsSegmentQuery(context.url, media.hlsSegmentQuery),
                initParams,
              );
            },
          }
        : {}),
    });
    hls.loadSource(playback.src);
    hls.attachMedia(video);

    return () => {
      hls.destroy();
      unloadVideo(video);
    };
  }, [media, shouldPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || media.type !== "video" || !shouldPlay) return;
    const videoElement = video;

    function restorePosition() {
      if (!Number.isFinite(initialVideoTime) || initialVideoTime <= 0) return;

      try {
        videoElement.currentTime = initialVideoTime;
      } catch {
        // Some streamed videos reject seeking before enough metadata is ready.
      }
    }

    restorePosition();
    videoElement.addEventListener("loadedmetadata", restorePosition);
    videoElement.addEventListener("canplay", restorePosition, { once: true });

    return () => {
      videoElement.removeEventListener("loadedmetadata", restorePosition);
      videoElement.removeEventListener("canplay", restorePosition);
    };
  }, [initialVideoTime, media, shouldPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || media.type !== "video" || !onVideoTimeChange || !shouldPlay) {
      return;
    }
    const videoElement = video;
    const handleTimeChange = onVideoTimeChange;

    function reportPosition() {
      if (Number.isFinite(videoElement.currentTime)) {
        handleTimeChange(videoElement.currentTime);
      }
    }

    videoElement.addEventListener("timeupdate", reportPosition);
    videoElement.addEventListener("pause", reportPosition);
    videoElement.addEventListener("seeked", reportPosition);

    return () => {
      reportPosition();
      videoElement.removeEventListener("timeupdate", reportPosition);
      videoElement.removeEventListener("pause", reportPosition);
      videoElement.removeEventListener("seeked", reportPosition);
    };
  }, [media, onVideoTimeChange, shouldPlay]);

  if (media.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={media.url}
        alt={title}
        className="h-full w-full object-contain"
        draggable={false}
      />
    );
  }

  if (media.type === "audio") {
    return (
      <div className="grid size-full place-items-center bg-background px-6">
        <audio
          src={shouldPlay ? media.url : undefined}
          aria-label={title}
          className="w-full max-w-md"
          autoPlay={shouldPlay}
          preload={shouldPlay ? "auto" : "metadata"}
          controls={showControls}
          loop
        />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      aria-label={title}
      className="h-full w-full object-contain"
      autoPlay={shouldPlay}
      controls={showControls}
      playsInline
      muted
      preload={shouldPlay ? "auto" : "metadata"}
      loop
    />
  );
}

function unloadVideo(video: HTMLVideoElement) {
  const isJsdom =
    typeof navigator !== "undefined" && /\bjsdom\b/i.test(navigator.userAgent);

  if (!isJsdom) video.pause();
  video.removeAttribute("src");
  if (!isJsdom) video.load();
}
