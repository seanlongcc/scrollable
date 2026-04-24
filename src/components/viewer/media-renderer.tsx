"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";

import type { RuntimeMedia } from "@/lib/feed/types";
import { chooseVideoPlayback } from "@/lib/viewer/video";

export function MediaRenderer({ media, title }: { media: RuntimeMedia; title: string }) {
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
      controls
      playsInline
      muted
      loop
    />
  );
}
