import { GripHorizontal, Move, Plus, Trash2 } from "lucide-react";
import { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";

import { cn } from "@/lib/utils";
import { FREE_LAYOUT_SIZE, type FreeRect } from "@/lib/viewer/layout";
import {
  moveTimerIndex,
  togglePaused,
  type TimerMode,
} from "@/lib/viewer/timer";
import type {
  FeedSession,
  FreeDragState,
  WorkspaceTemplateSlot,
} from "./types";
import {
  activeIframeFallbackLimit,
  isIframeUrlSession,
  isVideoPointerTarget,
} from "./helpers";
import { SessionPane } from "./session-pane";

export function FreeGridView({
  sessions,
  templateSlots,
  galleryIndexes,
  videoPositions,
  selectedId,
  hideUi,
  isPlaybackActive,
  showInfo,
  freeDrag,
  setSelectedId,
  setMaximizedId,
  updateSession,
  removeSession,
  removeTemplateSlot,
  openSourcePanel,
  changeGallery,
  onVideoPositionChange,
  setViewTimerMode,
  setViewTimerSeconds,
  beginFreeDrag,
  onLocalFilesSelected,
  onLocalCacheAccessRequested,
  onEditSource,
}: {
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  selectedId: string | null;
  hideUi: boolean;
  isPlaybackActive: boolean;
  showInfo: boolean;
  freeDrag: FreeDragState | null;
  setSelectedId: (id: string | null) => void;
  setMaximizedId: (id: string) => void;
  updateSession: (
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) => void;
  removeSession: (id: string) => void;
  removeTemplateSlot: (id: string) => void;
  openSourcePanel: (
    slot: number | null,
    templateSlotId?: string | null,
  ) => void;
  changeGallery: (itemId: string, direction: 1 | -1) => void;
  onVideoPositionChange: (key: string, seconds: number) => void;
  setViewTimerMode: (id: string, mode: TimerMode) => void;
  setViewTimerSeconds: (id: string, value: number) => void;
  beginFreeDrag: (
    event: ReactPointerEvent<HTMLButtonElement>,
    target: { id: string; freeRect: FreeRect },
    mode: "move" | "resize",
    targetType?: FreeDragState["targetType"],
  ) => void;
  onLocalFilesSelected: (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onLocalCacheAccessRequested?: (id: string) => void;
  onEditSource: (id: string) => void;
}) {
  let mountedIframeCount = 0;
  const iframeLimit = activeIframeFallbackLimit();

  return (
    <div
      className={cn(
        "grid",
        hideUi
          ? "h-dvh min-h-0 min-w-0 gap-0"
          : "h-full min-h-0 min-w-0 gap-0.5 md:min-h-[360px] min-[1080px]:min-w-[720px]",
      )}
      style={{
        gridTemplateColumns: `repeat(${FREE_LAYOUT_SIZE}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${FREE_LAYOUT_SIZE}, minmax(0, 1fr))`,
      }}
    >
      {templateSlots.map((slot, index) => {
        const dragRect =
          freeDrag?.targetType === "template-slot" && freeDrag.id === slot.id
            ? freeDrag.currentRect
            : slot.freeRect;
        const boxNumber = index + 1;

        return (
          <div
            key={slot.id}
            data-testid={`template-slot-${slot.id}`}
            className={cn(
              "group/template-slot relative grid min-h-0 cursor-pointer place-items-center rounded-2xl border border-dashed border-border/70 bg-surface/35 p-2 text-center text-xs text-muted-foreground transition hover:border-primary/70 hover:bg-surface-elevated/70 hover:text-primary max-md:pointer-events-none",
              freeDrag?.targetType === "template-slot" &&
                freeDrag.id === slot.id &&
                "z-40 scale-[1.01]",
              hideUi && "pointer-events-none opacity-40",
            )}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button")) return;
              openSourcePanel(null, slot.id);
            }}
            style={{
              gridColumn: `${dragRect.column} / span ${dragRect.columnSpan}`,
              gridRow: `${dragRect.row} / span ${dragRect.rowSpan}`,
            }}
          >
            {!hideUi ? (
              <div className="absolute right-2 bottom-2 z-30 hidden flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover/template-slot:opacity-100 group-focus-within/template-slot:opacity-100 md:flex">
                <button
                  type="button"
                  aria-label={`Move source box ${boxNumber}`}
                  title={`Move source box ${boxNumber}`}
                  onPointerDown={(event) =>
                    beginFreeDrag(event, slot, "move", "template-slot")
                  }
                  className="grid size-8 cursor-grab place-items-center rounded-lg border border-primary/50 bg-background/80 text-primary backdrop-blur active:cursor-grabbing"
                >
                  <Move className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label={`Resize source box ${boxNumber}`}
                  title={`Resize source box ${boxNumber}`}
                  onPointerDown={(event) =>
                    beginFreeDrag(event, slot, "resize", "template-slot")
                  }
                  className="grid size-8 cursor-se-resize place-items-center rounded-lg border border-primary/50 bg-background/80 text-primary backdrop-blur"
                >
                  <GripHorizontal className="size-4 rotate-45" />
                </button>
                <button
                  type="button"
                  aria-label={`Remove source box ${boxNumber}`}
                  title={`Remove source box ${boxNumber}`}
                  onClick={() => removeTemplateSlot(slot.id)}
                  className="grid size-8 place-items-center rounded-lg border border-destructive/40 bg-background/80 text-destructive backdrop-blur hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              aria-label="Add source to template box"
              title="Add source to template box"
              onClick={() => openSourcePanel(null, slot.id)}
              className="hidden cursor-pointer items-center gap-2 rounded-md bg-background/70 px-2 py-1 backdrop-blur transition hover:bg-background hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none md:inline-flex"
            >
              <Plus className="size-4" />
              <span className="min-w-0 truncate">Add source</span>
            </button>
            {!hideUi ? (
              <span className="text-wrap-anywhere rounded-md bg-background/70 px-2 py-1 text-[11px] backdrop-blur md:hidden">
                Edit free layout on desktop.
              </span>
            ) : null}
          </div>
        );
      })}
      {sessions.length ? (
        sessions.map((session) => {
          const dragRect =
            freeDrag?.targetType === "session" && freeDrag.id === session.id
              ? freeDrag.currentRect
              : session.freeRect;

          return (
            <div
              key={session.id}
              data-testid={`free-cell-${session.id}`}
              className={cn(
                "group/free relative min-h-0 rounded-2xl transition",
                freeDrag?.targetType === "session" &&
                  freeDrag.id === session.id &&
                  "z-40 scale-[1.01]",
              )}
              style={{
                gridColumn: `${dragRect.column} / span ${dragRect.columnSpan}`,
                gridRow: `${dragRect.row} / span ${dragRect.rowSpan}`,
              }}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("button,a,input")) {
                  return;
                }
                if (session.id === selectedId) {
                  if (event.target === event.currentTarget) setSelectedId(null);
                  return;
                }
                setSelectedId(session.id);
              }}
              onPointerDownCapture={(event) => {
                if (session.id === selectedId) return;
                if (isVideoPointerTarget(event.target))
                  setSelectedId(session.id);
              }}
            >
              {!hideUi ? (
                <div
                  className={cn(
                    "absolute right-2 bottom-2 z-30 hidden flex-col gap-1 transition-opacity duration-200 md:flex",
                    session.id !== selectedId &&
                      "opacity-0 group-hover/free:opacity-100 group-focus-within/free:opacity-100",
                  )}
                >
                  <button
                    type="button"
                    aria-label={`Move ${session.title}`}
                    title={`Move ${session.title}`}
                    onPointerDown={(event) =>
                      beginFreeDrag(event, session, "move")
                    }
                    className="grid size-8 cursor-grab place-items-center rounded-lg border border-primary/50 bg-background/80 text-primary backdrop-blur active:cursor-grabbing"
                  >
                    <Move className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Resize ${session.title}`}
                    title={`Resize ${session.title}`}
                    onPointerDown={(event) =>
                      beginFreeDrag(event, session, "resize")
                    }
                    className="grid size-8 cursor-se-resize place-items-center rounded-lg border border-primary/50 bg-background/80 text-primary backdrop-blur"
                  >
                    <GripHorizontal className="size-4 rotate-45" />
                  </button>
                </div>
              ) : null}
              <SessionPane
                session={session}
                canMountUrlIframe={(() => {
                  if (!isIframeUrlSession(session)) return true;
                  mountedIframeCount += 1;
                  return mountedIframeCount <= iframeLimit;
                })()}
                galleryIndexes={galleryIndexes}
                videoPositions={videoPositions}
                compact={
                  session.freeRect.columnSpan < 3 ||
                  session.freeRect.rowSpan < 3
                }
                isFocused={session.id === selectedId}
                forceInfoVisible={showInfo}
                hideUi={hideUi}
                isPlaybackActive={isPlaybackActive && !session.timer.isPaused}
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
            </div>
          );
        })
      ) : templateSlots.length ? null : (
        <div
          className="grid min-w-0 place-items-center rounded-2xl border border-dashed border-border/60 px-4 text-center text-sm text-muted-foreground"
          style={{
            gridColumn: `1 / span ${FREE_LAYOUT_SIZE}`,
            gridRow: `1 / span ${FREE_LAYOUT_SIZE}`,
          }}
        >
          <span className="text-wrap-anywhere">
            <span className="hidden md:inline">
              Add a source, then drag and resize it here.
            </span>
            <span className="md:hidden">Edit free layout on desktop.</span>
          </span>
        </div>
      )}
    </div>
  );
}
