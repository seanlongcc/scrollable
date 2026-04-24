"use client";

import { Grid2X2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { RuntimeFeedItem } from "@/lib/feed/types";
import {
  advanceTimerState,
  createTimerState,
  moveTimerIndex,
  togglePaused,
} from "@/lib/viewer/timer";
import { FeedViewPane } from "./feed-view-pane";

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

  function changeGallery(itemId: string, direction: 1 | -1) {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return;

    setGalleryIndexes((state) => {
      const current = state[itemId] ?? 0;
      const next = (current + direction + item.media.length) % item.media.length;
      return { ...state, [itemId]: next };
    });
  }

  return (
    <section className="relative h-dvh overflow-hidden bg-black text-white">
      <FeedViewPane
        title={title}
        items={items}
        timer={timer}
        galleryIndexes={galleryIndexes}
        isFocused
        onGalleryChange={changeGallery}
        onMove={(direction) => setTimer((state) => moveTimerIndex(state, direction))}
        onTogglePaused={() => setTimer(togglePaused)}
        onRestart={() => setTimer((state) => ({ ...state, elapsedMs: 0 }))}
      />
      {onBackToGrid ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="absolute right-3 top-3 z-30 border-white/25 bg-black/45 text-white"
          onClick={onBackToGrid}
          aria-label="Grid"
        >
          <Grid2X2 />
        </Button>
      ) : null}
    </section>
  );
}
