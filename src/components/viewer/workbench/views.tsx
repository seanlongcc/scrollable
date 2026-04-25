import {
  ExternalLink,
  Globe,
  GripHorizontal,
  Info,
  Maximize2,
  Move,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeedViewPane } from "@/components/viewer/feed-view-pane";
import type { UrlRuntimeResolution } from "@/lib/url-source/types";
import { cn } from "@/lib/utils";
import {
  FREE_LAYOUT_SIZE,
  type FixedGrid,
  type FreeRect,
} from "@/lib/viewer/layout";
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
  hasPlayableRuntimeItems,
  isIframeUrlSession,
  urlResolutionIframeUrl,
  urlResolutionRequiresDisplayWarning,
} from "./helpers";

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
  onEditSource,
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
          : "h-full min-h-[360px] min-w-0 gap-2 md:min-w-[720px]",
      )}
      style={{
        gridTemplateColumns: `repeat(${fixedGrid.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${fixedGrid.rows}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: visibleCells }, (_, slot) => {
        const session = sessions.find(
          (candidate) => candidate.fixedSlot === slot,
        );

        return (
          <div
            key={slot}
            data-testid={`fixed-cell-${slot}`}
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
              />
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
          : "h-full min-h-[360px] min-w-0 gap-2 md:min-w-[720px]",
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
              "group/template-slot relative grid min-h-0 cursor-pointer place-items-center rounded-xl border border-dashed border-primary/45 bg-surface/35 p-2 text-center text-xs text-muted-foreground transition hover:border-primary hover:bg-surface-elevated/70 hover:text-primary",
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
              <div className="absolute bottom-2 right-2 z-30 flex flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover/template-slot:opacity-100 group-focus-within/template-slot:opacity-100">
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
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-background/70 px-2 py-1 backdrop-blur transition hover:bg-background hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <Plus className="size-4" />
              Add source
            </button>
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
                "group/free relative min-h-0 rounded-xl outline outline-1 outline-offset-0 outline-transparent transition",
                !hideUi &&
                  session.id === selectedId &&
                  "outline-2 outline-offset-1 outline-primary ring-2 ring-primary/20 shadow-[0_0_20px_rgba(143,239,225,0.08)]",
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
                setSelectedId(session.id === selectedId ? null : session.id);
              }}
            >
              {!hideUi ? (
                <div
                  className={cn(
                    "absolute bottom-2 right-2 z-30 flex flex-col gap-1 transition-opacity duration-200",
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
              />
            </div>
          );
        })
      ) : templateSlots.length ? null : (
        <div
          className="grid place-items-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground"
          style={{
            gridColumn: `1 / span ${FREE_LAYOUT_SIZE}`,
            gridRow: `1 / span ${FREE_LAYOUT_SIZE}`,
          }}
        >
          Add a source, then drag and resize it here.
        </div>
      )}
    </div>
  );
}

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
        canMountIframe={isPlaybackActive && canMountUrlIframe}
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
      onMaximize={onMaximize}
      onEdit={onEdit}
      onRemove={onRemove}
      onTimerModeChange={onTimerModeChange}
      onTimerSecondsChange={onTimerSecondsChange}
    />
  );
}

export function UrlSourcePane({
  title,
  resolution,
  isRuntimeLoading,
  hideUi,
  canMountIframe,
  onMaximize,
  onEdit,
  onRemove,
}: {
  title: string;
  resolution?: UrlRuntimeResolution;
  isRuntimeLoading?: boolean;
  hideUi?: boolean;
  canMountIframe: boolean;
  onMaximize?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const [approvedFallbackIframeUrl, setApprovedFallbackIframeUrl] = useState<
    string | null
  >(null);
  const displayTitle = resolution?.title ?? title;
  const externalUrl = resolution?.externalUrl;
  const iframeUrl = resolution ? urlResolutionIframeUrl(resolution) : null;
  const requiresDisplayWarning =
    urlResolutionRequiresDisplayWarning(resolution);
  const hasApprovedFallbackIframe =
    Boolean(iframeUrl) && approvedFallbackIframeUrl === iframeUrl;
  const shouldShowDisplayWarning =
    Boolean(iframeUrl) && requiresDisplayWarning && !hasApprovedFallbackIframe;
  const shouldMountIframe =
    Boolean(iframeUrl) &&
    canMountIframe &&
    (!requiresDisplayWarning || hasApprovedFallbackIframe);
  const iframeBlocked =
    resolution?.status === "resolved" &&
    iframeUrl &&
    !shouldShowDisplayWarning &&
    !shouldMountIframe;

  return (
    <article className="group/source relative grid size-full min-h-0 overflow-hidden rounded-lg border border-border/70 bg-background text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.018)]">
      {shouldMountIframe ? (
        <iframe
          title={displayTitle}
          src={iframeUrl ?? ""}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          className="absolute inset-0 z-0 size-full border-0 bg-background"
        />
      ) : (
        <div className="absolute inset-0 z-0 grid place-items-center bg-background p-4">
          <div className="grid max-w-md justify-items-center gap-3 text-center">
            <Globe className="size-8 text-primary" />
            <div className="grid gap-1">
              <h3 className="text-sm font-medium">{displayTitle}</h3>
              {isRuntimeLoading ? (
                <p className="text-xs text-muted-foreground">
                  Loading runtime media
                </p>
              ) : resolution?.status === "resolved" &&
                resolution.mode === "metadata" ? (
                <>
                  {resolution.metadata.siteName ? (
                    <p className="text-[11px] font-medium text-primary">
                      {resolution.metadata.siteName}
                    </p>
                  ) : null}
                  {resolution.metadata.description ? (
                    <p className="text-xs text-muted-foreground">
                      {resolution.metadata.description}
                    </p>
                  ) : null}
                  {resolution.metadata.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolution.metadata.thumbnailUrl}
                      alt=""
                      className="mx-auto mt-1 max-h-36 max-w-full rounded-md border border-border object-contain"
                    />
                  ) : null}
                </>
              ) : shouldShowDisplayWarning ? (
                <>
                  <p className="text-xs font-medium text-primary">
                    Site not natively supported
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This source will open as an embedded site instead of native
                    media.
                  </p>
                </>
              ) : iframeBlocked ? (
                <p className="text-xs text-muted-foreground">
                  Iframe limit reached
                </p>
              ) : resolution?.status === "blocked" ? (
                <p className="text-xs text-muted-foreground">
                  This site blocks embedded viewing.
                </p>
              ) : resolution?.status === "unsupported" ? (
                <p className="text-xs text-muted-foreground">
                  This URL cannot be displayed inside the viewer.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  URL source is waiting for runtime resolution.
                </p>
              )}
            </div>
            {shouldShowDisplayWarning ? (
              <Button
                size="sm"
                onClick={() => setApprovedFallbackIframeUrl(iframeUrl)}
              >
                <Info />
                Display site
              </Button>
            ) : null}
            {externalUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={externalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Open externally
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {hideUi ? null : (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 opacity-0 transition-opacity duration-200 group-hover/source:opacity-100 group-focus-within/source:opacity-100">
          <div className="min-w-0 rounded-md bg-background/75 px-2 py-1.5 backdrop-blur">
            <div className="truncate text-xs font-medium">{displayTitle}</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              URL source
            </div>
          </div>
          <div className="pointer-events-auto flex shrink-0 flex-wrap justify-end gap-1">
            {onMaximize ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={onMaximize}
                aria-label={`Maximize ${displayTitle}`}
              >
                <Maximize2 />
              </Button>
            ) : null}
            {onEdit ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={onEdit}
                aria-label={`Edit ${displayTitle}`}
              >
                <Pencil />
              </Button>
            ) : null}
            {onRemove ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-border bg-background/75 text-foreground"
                onClick={onRemove}
                aria-label={`Remove ${displayTitle}`}
              >
                <X />
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}

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
