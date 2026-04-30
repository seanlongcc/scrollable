import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FeedSession } from "./types";

export function PlaybackControls({
  selected,
  variant = "pill",
  className,
  onSelectedMove,
  onSelectedTogglePaused,
  onSelectedRestart,
}: {
  selected: FeedSession;
  variant?: "pill" | "panel";
  className?: string;
  onSelectedMove: (direction: 1 | -1) => void;
  onSelectedTogglePaused: () => void;
  onSelectedRestart: () => void;
}) {
  const buttonClassName = variant === "panel" ? "h-8 w-full" : undefined;
  const buttonSize = variant === "panel" ? "icon" : "icon-sm";

  return (
    <div
      aria-label="Selected source playback controls"
      className={cn(
        variant === "panel"
          ? "pointer-events-auto grid w-full grid-cols-4 gap-2"
          : "pointer-events-auto flex gap-1",
        className,
      )}
    >
      <Button
        type="button"
        size={buttonSize}
        variant="outline"
        aria-label="Back"
        onClick={() => onSelectedMove(-1)}
        className={buttonClassName}
      >
        <SkipBack />
      </Button>
      <Button
        type="button"
        size={buttonSize}
        variant="default"
        aria-label={selected.timer.isPaused ? "Play" : "Pause"}
        onClick={onSelectedTogglePaused}
        className={buttonClassName}
      >
        {selected.timer.isPaused ? <Play /> : <Pause />}
      </Button>
      <Button
        type="button"
        size={buttonSize}
        variant="outline"
        aria-label="Next"
        onClick={() => onSelectedMove(1)}
        className={buttonClassName}
      >
        <SkipForward />
      </Button>
      <Button
        type="button"
        size={buttonSize}
        variant="outline"
        aria-label="Restart"
        onClick={onSelectedRestart}
        className={buttonClassName}
      >
        <RotateCcw />
      </Button>
    </div>
  );
}
