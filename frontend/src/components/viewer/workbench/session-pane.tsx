import { Upload } from "lucide-react";
import { ChangeEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeedViewPane } from "@/components/viewer/feed-view-pane";
import { type TimerMode } from "@/lib/viewer/timer";
import type { FeedSession } from "./types";
import {
  hasPlayableRuntimeItems,
  shouldPreserveInactiveUrlIframe,
  urlResolutionIframeUrl,
} from "./helpers";
import { UrlSourcePane } from "./url-source-pane";

export function SessionPane({
  session,
  canMountUrlIframe = true,
  galleryIndexes,
  videoPositions,
  compact,
  isFocused,
  forceInfoVisible,
  hideUi,
  isPlaybackActive = true,
  isRuntimeLoading,
  onGalleryChange,
  onVideoPositionChange,
  onMove,
  onTogglePaused,
  onRestart,
  onSelect,
  onMaximize,
  onEdit,
  onRemove,
  onTimerModeChange,
  onTimerSecondsChange,
  onLocalFilesSelected,
}: {
  session: FeedSession;
  canMountUrlIframe?: boolean;
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  compact?: boolean;
  isFocused?: boolean;
  forceInfoVisible?: boolean;
  hideUi?: boolean;
  isPlaybackActive?: boolean;
  isRuntimeLoading?: boolean;
  onGalleryChange: (itemId: string, direction: 1 | -1) => void;
  onVideoPositionChange: (key: string, seconds: number) => void;
  onMove: (direction: 1 | -1) => void;
  onTogglePaused: () => void;
  onRestart: () => void;
  onSelect?: () => void;
  onMaximize?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onTimerModeChange: (mode: TimerMode) => void;
  onTimerSecondsChange: (seconds: number) => void;
  onLocalFilesSelected?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const localSourceConfig =
    session.sourceConfig.kind === "local" ? session.sourceConfig : null;
  const needsLocalReload = Boolean(
    localSourceConfig && session.items.length === 0,
  );
  const hasCachedLocalFiles =
    needsLocalReload && Boolean(localSourceConfig?.cacheSetId);
  const urlIframePlaybackKey =
    session.sourceConfig.kind === "url" &&
    session.urlResolution?.status === "resolved" &&
    session.urlResolution.mode === "provider" &&
    session.urlResolution.provider === "youtube" &&
    urlResolutionIframeUrl(session.urlResolution)
      ? `${session.id}:url-iframe`
      : null;

  if (
    session.sourceConfig.kind === "url" &&
    !hasPlayableRuntimeItems(session)
  ) {
    return (
      <UrlSourcePane
        title={session.title}
        resolution={session.urlResolution}
        isRuntimeLoading={isRuntimeLoading}
        hideUi={hideUi}
        isFocused={isFocused}
        canMountIframe={
          canMountUrlIframe &&
          (isPlaybackActive || shouldPreserveInactiveUrlIframe(session))
        }
        iframePlaybackSeconds={
          urlIframePlaybackKey ? (videoPositions[urlIframePlaybackKey] ?? 0) : 0
        }
        onIframePlaybackTimeChange={
          urlIframePlaybackKey
            ? (seconds) => onVideoPositionChange(urlIframePlaybackKey, seconds)
            : undefined
        }
        onSelect={onSelect}
        onMaximize={onMaximize}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    );
  }

  return (
    <FeedViewPane
      viewId={session.id}
      title={session.title}
      items={session.items}
      timer={session.timer}
      timerMode={session.timerMode}
      galleryIndexes={galleryIndexes}
      videoPositions={videoPositions}
      compact={compact}
      isFocused={isFocused}
      forceInfoVisible={forceInfoVisible}
      hideUi={hideUi}
      isPlaybackActive={isPlaybackActive}
      isRuntimeLoading={isRuntimeLoading}
      emptyMessage={
        hasCachedLocalFiles
          ? "Cached files unavailable"
          : needsLocalReload
            ? "Local files need reload"
            : undefined
      }
      emptyAction={
        needsLocalReload && onLocalFilesSelected && !hideUi ? (
          <div className="flex flex-wrap justify-center gap-2">
            <Label
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition hover:bg-muted"
              onClick={(event) => event.stopPropagation()}
            >
              <Upload className="size-3.5" />
              Select files
              <Input
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                className="sr-only"
                aria-label={`Reload files for ${session.title}`}
                onChange={onLocalFilesSelected}
              />
            </Label>
          </div>
        ) : undefined
      }
      onGalleryChange={onGalleryChange}
      onVideoPositionChange={onVideoPositionChange}
      onMove={onMove}
      onTogglePaused={onTogglePaused}
      onRestart={onRestart}
      onSelect={onSelect}
      onMaximize={onMaximize}
      onEdit={onEdit}
      onRemove={onRemove}
      onTimerModeChange={onTimerModeChange}
      onTimerSecondsChange={onTimerSecondsChange}
    />
  );
}
