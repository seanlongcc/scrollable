import type { FeedSession } from "./types";
import { shouldPreserveInactiveUrlIframe } from "./helpers";
import { SessionPane } from "./views";

export function InactiveIframeMounts({
  sessions,
  activeLayerId,
  galleryIndexes,
  videoPositions,
  onVideoPositionChange,
}: {
  sessions: FeedSession[];
  activeLayerId: string;
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  onVideoPositionChange: (
    key: string,
    seconds: number,
    durationSeconds?: number,
  ) => void;
}) {
  const preservedSessions = sessions.filter(
    (session) =>
      session.layerId !== activeLayerId &&
      shouldPreserveInactiveUrlIframe(session),
  );

  if (!preservedSessions.length) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 size-px overflow-hidden opacity-0"
    >
      {preservedSessions.map((session) => (
        <div key={session.id} className="absolute size-px overflow-hidden">
          <SessionPane
            session={session}
            canMountUrlIframe
            galleryIndexes={galleryIndexes}
            videoPositions={videoPositions}
            compact
            isFocused={false}
            forceInfoVisible={false}
            hideUi
            isPlaybackActive={false}
            isRuntimeLoading={session.isRuntimeLoading}
            onGalleryChange={() => undefined}
            onVideoPositionChange={onVideoPositionChange}
            onMove={() => undefined}
            onTogglePaused={() => undefined}
            onRestart={() => undefined}
            onTimerModeChange={() => undefined}
            onTimerSecondsChange={() => undefined}
            onLocalFilesSelected={() => undefined}
          />
        </div>
      ))}
    </div>
  );
}
