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
  onEditSource: (id: string) => void;
}) {
  const satellites = sessions.filter((session) => session.id !== focused.id);

  return (
    <section
      className={cn(
        "grid min-h-0 gap-3",
        hideUi ? "h-dvh p-0" : "h-full p-3 lg:grid-cols-[minmax(0,1fr)_220px]",
      )}
    >
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
        />
      </div>

      {!hideUi ? (
        <aside className="grid min-h-0 content-start gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Satellite View
            </h2>
            <Button type="button" variant="outline" onClick={onRestore}>
              <Maximize2 />
              Restore grid
            </Button>
          </div>
          {satellites.length ? (
            satellites.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onFocus(session.id)}
                title={`Focus ${session.title}`}
                className="h-32 min-h-0 text-left"
              >
                <SessionPane
                  session={session}
                  galleryIndexes={galleryIndexes}
                  videoPositions={videoPositions}
                  compact
                  forceInfoVisible={showInfo}
                  isPlaybackActive={false}
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
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              No satellite views
            </div>
          )}
        </aside>
      ) : null}
    </section>
  );
}
