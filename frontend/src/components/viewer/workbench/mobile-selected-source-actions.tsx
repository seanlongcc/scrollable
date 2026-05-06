import {
  Clock3,
  Copy,
  Dices,
  Film,
  Grid2X2,
  Maximize2,
  MoreHorizontal,
  Pencil,
  Shuffle,
  Trash2,
  Volume2,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { TimerMode } from "@/lib/viewer/timer";
import { cn } from "@/lib/utils";
import { NumberField } from "./fields";
import {
  canRandomizeSessionSource,
  isSessionOrderRandomized,
} from "./source-order-state";
import type { FeedSession } from "./types";

type OpenPopover = "timer" | "more" | null;

export type MobileSelectedSourceActionsProps = {
  selected: FeedSession;
  canCloneOrFillSelectedSource: boolean;
  globalAudioEnabled: boolean;
  finishVideoBeforeAdvance: boolean;
  randomVideoStart: boolean;
  onCloneSelectedSource: () => void;
  onFillSelectedSourceSpace: () => void;
  onRemoveSelectedSource: () => void;
  onRandomizeSelectedSource: () => void;
  onSelectedAudioEnabledChange: (enabled: boolean) => void;
  onSelectedFinishVideoBeforeAdvanceChange: (enabled: boolean) => void;
  onSelectedRandomVideoStartChange: (enabled: boolean) => void;
  onSelectedTimerModeChange: (mode: TimerMode) => void;
  onSelectedTimerSecondsChange: (seconds: number) => void;
  onEditSelectedSource: () => void;
  onOpenSatellite: () => void;
};

export function MobileSelectedSourceActions({
  selected,
  canCloneOrFillSelectedSource,
  globalAudioEnabled,
  finishVideoBeforeAdvance,
  randomVideoStart,
  onCloneSelectedSource,
  onFillSelectedSourceSpace,
  onRemoveSelectedSource,
  onRandomizeSelectedSource,
  onSelectedAudioEnabledChange,
  onSelectedFinishVideoBeforeAdvanceChange,
  onSelectedRandomVideoStartChange,
  onSelectedTimerModeChange,
  onSelectedTimerSecondsChange,
  onEditSelectedSource,
  onOpenSatellite,
}: MobileSelectedSourceActionsProps) {
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const canRandomizeSelectedSource = canRandomizeSessionSource(selected);
  const isRandomizeSelectedSourceEnabled = isSessionOrderRandomized(selected);
  const isSelectedSourceAudioEnabled =
    selected.isAudioEnabled ?? globalAudioEnabled;
  const isSelectedSourceFinishVideoBeforeAdvance =
    selected.finishVideoBeforeAdvance ?? finishVideoBeforeAdvance;
  const isSelectedSourceRandomVideoStart =
    selected.randomVideoStart ?? randomVideoStart;
  const selectedAudioLabel = isSelectedSourceAudioEnabled ? "Mute" : "Unmute";

  function toggleTimerPopover() {
    setOpenPopover((current) => (current === "timer" ? null : "timer"));
  }

  function openTimerPopover() {
    setOpenPopover("timer");
  }

  function toggleMorePopover() {
    setOpenPopover((current) => (current === "more" ? null : "more"));
  }

  function closePopovers() {
    setOpenPopover(null);
  }

  return (
    <>
      {canRandomizeSelectedSource ? (
        <MobileRailButton
          ariaLabel="Shuffle selected source"
          active={isRandomizeSelectedSourceEnabled}
          onClick={() => {
            closePopovers();
            onRandomizeSelectedSource();
          }}
        >
          <Shuffle />
        </MobileRailButton>
      ) : (
        <MobileRailButton
          ariaLabel="Edit local timer"
          active={selected.timerMode === "local"}
          onClick={toggleTimerPopover}
        >
          <Clock3 />
        </MobileRailButton>
      )}
      <MobileRailButton
        ariaLabel="Edit source"
        onClick={() => {
          closePopovers();
          onEditSelectedSource();
        }}
      >
        <Pencil />
      </MobileRailButton>
      <MobileRailButton
        ariaLabel="Open in satellite"
        onClick={() => {
          closePopovers();
          onOpenSatellite();
        }}
        active
      >
        <Maximize2 />
      </MobileRailButton>
      <MobileRailButton
        ariaLabel="More source actions"
        onClick={toggleMorePopover}
      >
        <MoreHorizontal />
      </MobileRailButton>

      {openPopover === "timer" ? (
        <MobileSelectedTimerPopover
          selected={selected}
          onSelectedTimerModeChange={onSelectedTimerModeChange}
          onSelectedTimerSecondsChange={onSelectedTimerSecondsChange}
        />
      ) : null}

      {openPopover === "more" ? (
        <div
          data-testid="mobile-source-actions-menu"
          className="absolute right-14 bottom-0 grid w-[min(12rem,calc(100vw-5.5rem))] gap-1 rounded-xl border border-border/80 bg-popover/96 p-2 shadow-[0_16px_44px_rgba(18,10,10,0.48)] backdrop-blur-sm"
        >
          {canCloneOrFillSelectedSource ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="min-w-0 justify-start"
                onClick={() => {
                  closePopovers();
                  onCloneSelectedSource();
                }}
              >
                <Copy />
                <span className="min-w-0 truncate">Clone</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-w-0 justify-start"
                onClick={() => {
                  closePopovers();
                  onFillSelectedSourceSpace();
                }}
              >
                <Grid2X2 />
                <span className="min-w-0 truncate">Fill</span>
              </Button>
            </>
          ) : null}
          {canRandomizeSelectedSource ? (
            <Button
              type="button"
              variant={selected.timerMode === "local" ? "default" : "outline"}
              aria-pressed={selected.timerMode === "local"}
              aria-label="Edit local timer"
              className="min-w-0 justify-start"
              onClick={openTimerPopover}
            >
              <Clock3 />
              <span className="min-w-0 truncate">Local timer</span>
            </Button>
          ) : null}
          <Button
            type="button"
            variant={isSelectedSourceAudioEnabled ? "default" : "outline"}
            aria-pressed={isSelectedSourceAudioEnabled}
            className="min-w-0 justify-start"
            onClick={() => {
              closePopovers();
              onSelectedAudioEnabledChange(!isSelectedSourceAudioEnabled);
            }}
          >
            <Volume2 />
            <span className="min-w-0 truncate">{selectedAudioLabel}</span>
          </Button>
          <Button
            type="button"
            variant={
              isSelectedSourceFinishVideoBeforeAdvance ? "default" : "outline"
            }
            aria-pressed={isSelectedSourceFinishVideoBeforeAdvance}
            aria-label="Play selected source to end"
            className="min-w-0 justify-start"
            onClick={() => {
              closePopovers();
              onSelectedFinishVideoBeforeAdvanceChange(
                !isSelectedSourceFinishVideoBeforeAdvance,
              );
            }}
          >
            <Film />
            <span className="min-w-0 truncate">Play to end</span>
          </Button>
          <Button
            type="button"
            variant={isSelectedSourceRandomVideoStart ? "default" : "outline"}
            aria-pressed={isSelectedSourceRandomVideoStart}
            aria-label="Use random seek for selected source videos"
            className="min-w-0 justify-start"
            onClick={() => {
              closePopovers();
              onSelectedRandomVideoStartChange(
                !isSelectedSourceRandomVideoStart,
              );
            }}
          >
            <Dices />
            <span className="min-w-0 truncate">Random seek</span>
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-w-0 justify-start"
            onClick={() => {
              closePopovers();
              onRemoveSelectedSource();
            }}
          >
            <Trash2 />
            <span className="min-w-0 truncate">Remove</span>
          </Button>
        </div>
      ) : null}
    </>
  );
}

function MobileSelectedTimerPopover({
  selected,
  onSelectedTimerModeChange,
  onSelectedTimerSecondsChange,
}: {
  selected: FeedSession;
  onSelectedTimerModeChange: (mode: TimerMode) => void;
  onSelectedTimerSecondsChange: (seconds: number) => void;
}) {
  const isLocalTimer = selected.timerMode === "local";
  const modeLabel = isLocalTimer
    ? "Use global timer for selected source"
    : "Use local timer for selected source";

  return (
    <div
      role="dialog"
      aria-label="Selected source local timer"
      className="absolute top-0 right-14 grid w-[min(13rem,calc(100vw-5.5rem))] gap-2 rounded-xl border border-border/80 bg-popover/96 p-2 shadow-[0_16px_44px_rgba(18,10,10,0.48)] backdrop-blur-sm"
    >
      <Button
        type="button"
        variant={isLocalTimer ? "default" : "outline"}
        aria-pressed={isLocalTimer}
        aria-label={modeLabel}
        className="min-w-0 justify-start"
        onClick={() =>
          onSelectedTimerModeChange(isLocalTimer ? "global" : "local")
        }
      >
        <Clock3 />
        <span className="min-w-0 truncate">Local timer</span>
      </Button>
      <NumberField
        label="Local timer seconds"
        icon={<Clock3 className="size-3.5" />}
        value={selected.timer.durationSeconds}
        min={1}
        max={120}
        className="min-w-0"
        inputClassName="w-full min-w-0 flex-1"
        onChange={onSelectedTimerSecondsChange}
      />
    </div>
  );
}

export function MobileRailButton({
  ariaLabel,
  active,
  onClick,
  onPreload,
  children,
}: {
  ariaLabel: string;
  active?: boolean;
  onClick: () => void;
  onPreload?: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "default" : "outline"}
      aria-label={ariaLabel}
      onMouseEnter={onPreload}
      onPointerDown={onPreload}
      onFocus={onPreload}
      onClick={onClick}
      className={cn(
        "rounded-full shadow-[0_10px_30px_rgba(18,10,10,0.44)] backdrop-blur-sm",
        !active && "border-border/70 bg-surface/92",
      )}
    >
      {children}
    </Button>
  );
}
