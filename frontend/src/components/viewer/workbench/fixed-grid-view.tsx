import { Plus } from "lucide-react";
import { ChangeEvent, type CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { mobileFixedGridDisplay, type FixedGrid } from "@/lib/viewer/layout";
import {
  moveTimerIndex,
  togglePaused,
  type TimerMode,
} from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import {
  activeIframeFallbackLimit,
  isIframeUrlSession,
  isVideoPointerTarget,
} from "./helpers";
import { SessionPane } from "./session-pane";
import { sessionFinishVideoBeforeAdvance } from "./workbench-effect-state";

export function FixedGridView({
  sessions,
  visibleCells,
  fixedGrid,
  galleryIndexes,
  videoPositions,
  globalAudioEnabled = true,
  finishVideoBeforeAdvance = false,
  selectedId,
  hideUi,
  isPlaybackActive,
  showInfo,
  openSourcePanel,
  setSelectedId,
  setMaximizedId,
  updateSession,
  removeSession,
  changeGallery,
  onVideoPositionChange,
  onVideoEnded,
  setViewTimerMode,
  setViewTimerSeconds,
  onLocalFilesSelected,
  onLocalCacheAccessRequested,
  onEditSource,
  cellTestIdPrefix = "fixed-cell",
}: {
  sessions: FeedSession[];
  visibleCells: number;
  fixedGrid: FixedGrid;
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  globalAudioEnabled?: boolean;
  finishVideoBeforeAdvance?: boolean;
  selectedId: string | null;
  hideUi: boolean;
  isPlaybackActive: boolean;
  showInfo: boolean;
  openSourcePanel: (slot: number | null) => void;
  setSelectedId: (id: string | null) => void;
  setMaximizedId: (id: string) => void;
  updateSession: (
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) => void;
  removeSession: (id: string) => void;
  changeGallery: (itemId: string, direction: 1 | -1) => void;
  onVideoPositionChange: (key: string, seconds: number) => void;
  onVideoEnded?: (key: string) => void;
  setViewTimerMode: (id: string, mode: TimerMode) => void;
  setViewTimerSeconds: (id: string, value: number) => void;
  onLocalFilesSelected: (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onLocalCacheAccessRequested?: (id: string) => void;
  onEditSource: (id: string) => void;
  cellTestIdPrefix?: string;
}) {
  let mountedIframeCount = 0;
  const iframeLimit = activeIframeFallbackLimit();
  const mobileGrid = mobileFixedGridDisplay({ fixedGrid, visibleCells });
  const gridStyle = {
    "--mobile-grid-columns": mobileGrid.columns,
    "--mobile-grid-rows": mobileGrid.rows,
    "--desktop-grid-columns": fixedGrid.columns,
    "--desktop-grid-rows": fixedGrid.rows,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "grid [grid-template-columns:repeat(var(--mobile-grid-columns),minmax(0,1fr))] [grid-template-rows:repeat(var(--mobile-grid-rows),minmax(0,1fr))] md:[grid-template-columns:repeat(var(--desktop-grid-columns),minmax(0,1fr))] md:[grid-template-rows:repeat(var(--desktop-grid-rows),minmax(0,1fr))]",
        hideUi
          ? "h-dvh min-h-0 min-w-0 gap-0"
          : "h-full min-h-0 min-w-0 gap-0 md:min-h-[360px] md:gap-0.5 min-[1080px]:min-w-[720px]",
      )}
      style={gridStyle}
      onClick={(event) => {
        if (event.target === event.currentTarget) setSelectedId(null);
      }}
    >
      {Array.from({ length: visibleCells }, (_, slot) => {
        const session = sessions.find(
          (candidate) => candidate.fixedSlot === slot,
        );

        return (
          <div
            key={slot}
            data-testid={`${cellTestIdPrefix}-${slot}`}
            className={cn(
              "min-h-0 rounded-none transition md:rounded-2xl",
              slot >= mobileGrid.visibleCells && "max-md:hidden",
            )}
            onClick={(event) => {
              if (!session) return;
              if ((event.target as HTMLElement).closest("button,a,input")) {
                return;
              }
              if (session.id === selectedId) {
                setSelectedId(null);
                return;
              }
              setSelectedId(session.id);
            }}
            onPointerDownCapture={(event) => {
              if (!session || session.id === selectedId) return;
              if (isVideoPointerTarget(event.target)) setSelectedId(session.id);
            }}
          >
            {session ? (
              <SessionPane
                session={session}
                canMountUrlIframe={(() => {
                  if (!isIframeUrlSession(session)) return true;
                  mountedIframeCount += 1;
                  return mountedIframeCount <= iframeLimit;
                })()}
                galleryIndexes={galleryIndexes}
                videoPositions={videoPositions}
                audioEnabled={session.isAudioEnabled ?? globalAudioEnabled}
                finishVideoBeforeAdvance={sessionFinishVideoBeforeAdvance(
                  session,
                  finishVideoBeforeAdvance,
                )}
                compact={fixedGrid.columns * fixedGrid.rows > 4}
                isFocused={session.id === selectedId}
                forceInfoVisible={showInfo}
                hideUi={hideUi}
                isPlaybackActive={isPlaybackActive && !session.timer.isPaused}
                isRuntimeLoading={session.isRuntimeLoading}
                onGalleryChange={changeGallery}
                onVideoPositionChange={onVideoPositionChange}
                onVideoEnded={onVideoEnded}
                onMove={(direction) =>
                  updateSession(session.id, (current) => ({
                    ...current,
                    timer: moveTimerIndex(current.timer, direction),
                  }))
                }
                onTogglePaused={() =>
                  updateSession(session.id, (current) => ({
                    ...current,
                    timer: togglePaused(current.timer),
                  }))
                }
                onRestart={() =>
                  updateSession(session.id, (current) => ({
                    ...current,
                    timer: { ...current.timer, elapsedMs: 0 },
                  }))
                }
                onSelect={() => setSelectedId(session.id)}
                onToggleSelect={() =>
                  setSelectedId(session.id === selectedId ? null : session.id)
                }
                onMaximize={() => setMaximizedId(session.id)}
                onEdit={() => onEditSource(session.id)}
                onRemove={() => removeSession(session.id)}
                onTimerModeChange={(mode) => setViewTimerMode(session.id, mode)}
                onTimerSecondsChange={(value) =>
                  setViewTimerSeconds(session.id, value)
                }
                onLocalFilesSelected={(event) =>
                  onLocalFilesSelected(session.id, event)
                }
                onLocalCacheAccessRequested={() =>
                  onLocalCacheAccessRequested?.(session.id)
                }
              />
            ) : hideUi ? (
              <button
                type="button"
                onClick={() => openSourcePanel(slot)}
                aria-label="Add source to empty cell"
                className="size-full bg-background"
              >
                <span className="sr-only">Add source</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openSourcePanel(slot)}
                aria-label="Add source to empty cell"
                title="Add source to empty cell"
                className="group grid size-full min-h-0 min-w-0 cursor-pointer place-items-center rounded-none border border-dashed border-border/65 bg-background/42 p-2 text-sm font-semibold text-muted-foreground transition-[background-color,border-color,color,box-shadow] hover:border-primary/70 hover:bg-primary-soft/35 hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:outline-none md:rounded-xl"
              >
                <span className="inline-flex max-w-full min-w-0 items-center gap-2">
                  <Plus className="size-4 text-primary" />
                  <span className="min-w-0 truncate">Add source</span>
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
