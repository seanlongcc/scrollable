import { Maximize2 } from "lucide-react";
import { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type TimerMode } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import { SessionPane } from "./session-pane";

export function FocusLayout({
  focused,
  sessions,
  galleryIndexes,
  videoPositions,
  hideUi,
  showInfo,
  onRestore,
  onFocus,
  onGalleryChange,
  onVideoPositionChange,
  onMove,
  onTogglePaused,
  onRestart,
  onTimerModeChange,
  onTimerSecondsChange,
  onLocalFilesSelected,
  onLocalCacheAccessRequested,
  onEditSource,
}: {
  focused: FeedSession;
  sessions: FeedSession[];
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  hideUi: boolean;
  showInfo: boolean;
  onRestore: () => void;
  onFocus: (id: string) => void;
  onGalleryChange: (itemId: string, direction: 1 | -1) => void;
  onVideoPositionChange: (key: string, seconds: number) => void;
  onMove: (id: string, direction: 1 | -1) => void;
  onTogglePaused: (id: string) => void;
  onRestart: (id: string) => void;
  onTimerModeChange: (id: string, mode: TimerMode) => void;
  onTimerSecondsChange: (id: string, value: number) => void;
  onLocalFilesSelected: (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onLocalCacheAccessRequested?: (id: string) => void;
  onEditSource: (id: string) => void;
}) {
  const satellites = sessions.filter((session) => session.id !== focused.id);

  return (
    <section
      className={cn(
        "relative grid min-h-0 gap-3",
        hideUi
          ? "h-dvh p-0"
          : "h-full grid-rows-[minmax(0,1fr)_7rem] p-3 md:grid-cols-[minmax(0,1fr)_220px] md:grid-rows-[minmax(0,1fr)]",
      )}
    >
      {!hideUi ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="absolute top-3 right-3 z-40 rounded-full bg-background/80 backdrop-blur md:hidden"
          onClick={onRestore}
          aria-label="Exit satellite"
        >
          <Maximize2 />
        </Button>
      ) : null}
      <div className={cn("grid min-h-0 grid-rows-[minmax(0,1fr)]")}>
        <SessionPane
          session={focused}
          galleryIndexes={galleryIndexes}
          videoPositions={videoPositions}
          forceInfoVisible={showInfo}
          hideUi={hideUi}
          isPlaybackActive
          isRuntimeLoading={focused.isRuntimeLoading}
          onGalleryChange={onGalleryChange}
          onVideoPositionChange={onVideoPositionChange}
          onMove={(direction) => onMove(focused.id, direction)}
          onTogglePaused={() => onTogglePaused(focused.id)}
          onRestart={() => onRestart(focused.id)}
          onTimerModeChange={(mode) => onTimerModeChange(focused.id, mode)}
          onTimerSecondsChange={(value) =>
            onTimerSecondsChange(focused.id, value)
          }
          onEdit={() => onEditSource(focused.id)}
          onLocalFilesSelected={(event) =>
            onLocalFilesSelected(focused.id, event)
          }
          onLocalCacheAccessRequested={() =>
            onLocalCacheAccessRequested?.(focused.id)
          }
        />
      </div>

      {!hideUi ? (
        <aside className="grid min-h-0 gap-2 md:grid-rows-[auto_minmax(0,1fr)]">
          <Button
            type="button"
            variant="outline"
            className="hidden w-full bg-background/80 backdrop-blur md:inline-flex"
            onClick={onRestore}
            aria-label="Exit satellite"
          >
            <Maximize2 />
            Exit satellite
          </Button>
          <div className="flex min-h-0 gap-2 overflow-x-auto md:grid md:content-start md:overflow-x-hidden md:overflow-y-auto">
            <h2 className="sr-only">Satellite sources</h2>
            {satellites.length ? (
              satellites.map((session) => (
                <div
                  key={session.id}
                  title={`Focus ${session.title}`}
                  data-testid={`satellite-pane-${session.id}`}
                  className="relative h-full min-w-28 shrink-0 text-left md:h-32 md:min-w-0"
                >
                  <SessionPane
                    session={session}
                    galleryIndexes={galleryIndexes}
                    videoPositions={videoPositions}
                    compact
                    forceInfoVisible={showInfo}
                    hideUi
                    isPlaybackActive
                    isRuntimeLoading={session.isRuntimeLoading}
                    onGalleryChange={onGalleryChange}
                    onVideoPositionChange={onVideoPositionChange}
                    onMove={(direction) => onMove(session.id, direction)}
                    onTogglePaused={() => onTogglePaused(session.id)}
                    onRestart={() => onRestart(session.id)}
                    onTimerModeChange={(mode) =>
                      onTimerModeChange(session.id, mode)
                    }
                    onTimerSecondsChange={(value) =>
                      onTimerSecondsChange(session.id, value)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => onFocus(session.id)}
                    aria-label={`Focus ${session.title}`}
                    className="absolute inset-0 z-30 rounded-lg bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                No satellite views
              </div>
            )}
          </div>
        </aside>
      ) : null}
    </section>
  );
}
