"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";

import type { RuntimeMedia } from "@/lib/feed/types";
import { chooseVideoPlayback } from "@/lib/viewer/video";

export function MediaRenderer({
  media,
  title,
  showControls = true,
  initialVideoTime = 0,
  onVideoTimeChange,
}: {
  media: RuntimeMedia;
  title: string;
  showControls?: boolean;
  initialVideoTime?: number;
  onVideoTimeChange?: (seconds: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || media.type !== "video") return;

    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";
    const playback = chooseVideoPlayback({
      url: media.url,
      isHls: media.isHls,
      canPlayNativeHls: nativeHls,
    });

    if (playback.mode === "native") {
      video.src = playback.src;
      return;
    }

    if (!Hls.isSupported()) {
      video.src = playback.src;
      return;
    }

    const hls = new Hls();
    hls.loadSource(playback.src);
    hls.attachMedia(video);

    return () => hls.destroy();
  }, [media]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || media.type !== "video") return;
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
  }, [initialVideoTime, media]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || media.type !== "video" || !onVideoTimeChange) return;
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
  }, [media, onVideoTimeChange]);

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

  return (
    <video
      ref={videoRef}
      className="h-full w-full object-contain"
      autoPlay
      controls={showControls}
      playsInline
      muted
      loop
    />
  );
}
