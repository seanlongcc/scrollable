import { Plus } from "lucide-react";
import { ChangeEvent, type CSSProperties } from "react";

import { cn } from "@/lib/utils";
import type { FixedGrid } from "@/lib/viewer/layout";
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

export function FixedGridView({
  sessions,
  visibleCells,
  fixedGrid,
  galleryIndexes,
  videoPositions,
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
  const shouldStackMobile =
    fixedGrid.rows === 1 && fixedGrid.columns >= 2 && fixedGrid.columns <= 4;
  const mobileColumns = shouldStackMobile ? 1 : fixedGrid.columns;
  const mobileRows = shouldStackMobile ? fixedGrid.columns : fixedGrid.rows;
  const gridStyle = {
    "--mobile-grid-columns": mobileColumns,
    "--mobile-grid-rows": mobileRows,
    "--desktop-grid-columns": fixedGrid.columns,
    "--desktop-grid-rows": fixedGrid.rows,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "grid [grid-template-columns:repeat(var(--mobile-grid-columns),minmax(0,1fr))] [grid-template-rows:repeat(var(--mobile-grid-rows),minmax(0,1fr))] md:[grid-template-columns:repeat(var(--desktop-grid-columns),minmax(0,1fr))] md:[grid-template-rows:repeat(var(--desktop-grid-rows),minmax(0,1fr))]",
        hideUi
          ? "h-dvh min-h-0 min-w-0 gap-0"
          : "h-full min-h-0 min-w-0 gap-1 md:min-h-[360px] md:min-w-[720px] md:gap-2",
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
              "min-h-0 rounded-xl outline outline-1 outline-offset-0 outline-transparent transition",
              !hideUi &&
                session?.id === selectedId &&
                "outline-2 outline-offset-1 outline-primary ring-2 ring-primary/20",
            )}
            onClick={(event) => {
              if (!session) return;
              if ((event.target as HTMLElement).closest("button,a,input")) {
                return;
              }
              setSelectedId(session.id === selectedId ? null : session.id);
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
                compact={fixedGrid.columns * fixedGrid.rows > 4}
                isFocused={session.id === selectedId}
                forceInfoVisible={showInfo}
                hideUi={hideUi}
                isPlaybackActive={isPlaybackActive}
                isRuntimeLoading={session.isRuntimeLoading}
                onGalleryChange={changeGallery}
                onVideoPositionChange={onVideoPositionChange}
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
                className="grid size-full min-h-0 cursor-pointer place-items-center rounded-lg border border-dashed border-border/70 bg-surface/40 text-sm text-muted-foreground transition hover:border-primary/70 hover:text-primary"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="size-4" />
                  Add source
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
