import type {
  ChangeEvent,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
} from "react";

import { cn } from "@/lib/utils";
import type { FixedGrid, FreeRect } from "@/lib/viewer/layout";
import {
  moveTimerIndex,
  togglePaused,
  type TimerMode,
} from "@/lib/viewer/timer";
import { FixedGridView, FocusLayout, FreeGridView } from "./views";
import type {
  FeedSession,
  FreeDragState,
  LayoutMode,
  WorkspaceLayer,
  WorkspaceTemplateSlot,
} from "./types";

export function WorkbenchStage({
  maximized,
  sessions,
  galleryIndexes,
  videoPositions,
  isUiHidden,
  showAllInfo,
  setMaximizedId,
  changeGallery,
  rememberVideoPosition,
  updateSession,
  setViewTimerMode,
  setViewTimerSeconds,
  replaceLocalSessionFiles,
  requestLocalCacheAccess,
  openEditSource,
  layoutMode,
  layers,
  activeLayerId,
  fixedGrid,
  visibleFixedCells,
  selectedId,
  openSourcePanel,
  setSelectedId,
  removeSession,
  freeGridRef,
  templateSlots,
  freeDrag,
  removeTemplateSlot,
  beginFreeDrag,
}: {
  maximized: FeedSession | null;
  sessions: FeedSession[];
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  isUiHidden: boolean;
  showAllInfo: boolean;
  setMaximizedId: Dispatch<SetStateAction<string | null>>;
  changeGallery: (itemId: string, direction: 1 | -1) => void;
  rememberVideoPosition: (key: string, seconds: number) => void;
  updateSession: (
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) => void;
  setViewTimerMode: (id: string, mode: TimerMode) => void;
  setViewTimerSeconds: (id: string, value: number) => void;
  replaceLocalSessionFiles: (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  requestLocalCacheAccess: (id: string) => void;
  openEditSource: (id: string) => void;
  layoutMode: LayoutMode;
  layers: WorkspaceLayer[];
  activeLayerId: string;
  fixedGrid: FixedGrid;
  visibleFixedCells: number;
  selectedId: string | null;
  openSourcePanel: (
    fixedSlot?: number | null,
    templateSlotId?: string | null,
  ) => void;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  removeSession: (id: string) => void;
  freeGridRef: RefObject<HTMLDivElement | null>;
  templateSlots: WorkspaceTemplateSlot[];
  freeDrag: FreeDragState | null;
  removeTemplateSlot: (id: string) => void;
  beginFreeDrag: (
    event: ReactPointerEvent<HTMLButtonElement>,
    target: { id: string; freeRect: FreeRect },
    mode: "move" | "resize",
    targetType?: FreeDragState["targetType"],
  ) => void;
}) {
  if (maximized) {
    return (
      <FocusLayout
        focused={maximized}
        sessions={sessions}
        galleryIndexes={galleryIndexes}
        videoPositions={videoPositions}
        hideUi={isUiHidden}
        showInfo={showAllInfo}
        onRestore={() => setMaximizedId(null)}
        onFocus={setMaximizedId}
        onGalleryChange={changeGallery}
        onVideoPositionChange={rememberVideoPosition}
        onMove={(id, direction) =>
          updateSession(id, (session) => ({
            ...session,
            timer: moveTimerIndex(session.timer, direction),
          }))
        }
        onTogglePaused={(id) =>
          updateSession(id, (session) => ({
            ...session,
            timer: togglePaused(session.timer),
          }))
        }
        onRestart={(id) =>
          updateSession(id, (session) => ({
            ...session,
            timer: { ...session.timer, elapsedMs: 0 },
          }))
        }
        onTimerModeChange={setViewTimerMode}
        onTimerSecondsChange={setViewTimerSeconds}
        onLocalFilesSelected={replaceLocalSessionFiles}
        onLocalCacheAccessRequested={requestLocalCacheAccess}
        onEditSource={openEditSource}
      />
    );
  }

  return (
    <section
      className={cn(
        "grid min-h-0 grid-rows-[minmax(0,1fr)]",
        isUiHidden
          ? "p-0"
          : "px-2 pt-[3.25rem] pb-[4.5rem] md:pt-16 md:pr-4 md:pb-4 md:pl-[20.5rem]",
      )}
    >
      <div
        className={cn(
          "h-full min-h-0 overflow-auto border-border/70 bg-background bg-[linear-gradient(rgba(255,255,255,.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.008)_1px,transparent_1px)]",
          isUiHidden ? "rounded-none border-0 p-0" : "rounded-xl border p-1",
          layoutMode === "free" && "bg-[size:6.25%_6.25%]",
        )}
      >
        {layoutMode === "fixed" ? (
          <FixedLayerStage
            layers={layers}
            activeLayerId={activeLayerId}
            sessions={sessions}
            visibleFixedCells={visibleFixedCells}
            fixedGrid={fixedGrid}
            galleryIndexes={galleryIndexes}
            videoPositions={videoPositions}
            selectedId={selectedId}
            isUiHidden={isUiHidden}
            showAllInfo={showAllInfo}
            openSourcePanel={openSourcePanel}
            setSelectedId={setSelectedId}
            setMaximizedId={setMaximizedId}
            updateSession={updateSession}
            removeSession={removeSession}
            changeGallery={changeGallery}
            rememberVideoPosition={rememberVideoPosition}
            setViewTimerMode={setViewTimerMode}
            setViewTimerSeconds={setViewTimerSeconds}
            replaceLocalSessionFiles={replaceLocalSessionFiles}
            requestLocalCacheAccess={requestLocalCacheAccess}
            openEditSource={openEditSource}
          />
        ) : (
          <FreeLayerStage
            freeGridRef={freeGridRef}
            layers={layers}
            activeLayerId={activeLayerId}
            sessions={sessions}
            templateSlots={templateSlots}
            galleryIndexes={galleryIndexes}
            videoPositions={videoPositions}
            selectedId={selectedId}
            isUiHidden={isUiHidden}
            showAllInfo={showAllInfo}
            freeDrag={freeDrag}
            setSelectedId={setSelectedId}
            setMaximizedId={setMaximizedId}
            updateSession={updateSession}
            removeSession={removeSession}
            removeTemplateSlot={removeTemplateSlot}
            openSourcePanel={openSourcePanel}
            changeGallery={changeGallery}
            rememberVideoPosition={rememberVideoPosition}
            setViewTimerMode={setViewTimerMode}
            setViewTimerSeconds={setViewTimerSeconds}
            beginFreeDrag={beginFreeDrag}
            replaceLocalSessionFiles={replaceLocalSessionFiles}
            requestLocalCacheAccess={requestLocalCacheAccess}
            openEditSource={openEditSource}
          />
        )}
      </div>
    </section>
  );
}

function FixedLayerStage({
  layers,
  activeLayerId,
  sessions,
  visibleFixedCells,
  fixedGrid,
  galleryIndexes,
  videoPositions,
  selectedId,
  isUiHidden,
  showAllInfo,
  openSourcePanel,
  setSelectedId,
  setMaximizedId,
  updateSession,
  removeSession,
  changeGallery,
  rememberVideoPosition,
  setViewTimerMode,
  setViewTimerSeconds,
  replaceLocalSessionFiles,
  requestLocalCacheAccess,
  openEditSource,
}: {
  layers: WorkspaceLayer[];
  activeLayerId: string;
  sessions: FeedSession[];
  visibleFixedCells: number;
  fixedGrid: FixedGrid;
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  selectedId: string | null;
  isUiHidden: boolean;
  showAllInfo: boolean;
  openSourcePanel: (fixedSlot?: number | null) => void;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setMaximizedId: Dispatch<SetStateAction<string | null>>;
  updateSession: (
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) => void;
  removeSession: (id: string) => void;
  changeGallery: (itemId: string, direction: 1 | -1) => void;
  rememberVideoPosition: (key: string, seconds: number) => void;
  setViewTimerMode: (id: string, mode: TimerMode) => void;
  setViewTimerSeconds: (id: string, value: number) => void;
  replaceLocalSessionFiles: (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  requestLocalCacheAccess: (id: string) => void;
  openEditSource: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "relative",
        isUiHidden
          ? "h-dvh min-h-0 min-w-0"
          : "h-full min-h-0 min-w-0 md:min-h-[360px] md:min-w-[720px]",
      )}
    >
      {layers.map((layer) => {
        const isActiveLayer = layer.id === activeLayerId;

        return (
          <div
            key={layer.id}
            aria-hidden={!isActiveLayer}
            style={{
              visibility: isActiveLayer ? "visible" : "hidden",
            }}
            className={cn(
              isActiveLayer
                ? "relative z-10 size-full"
                : "pointer-events-none absolute inset-0 opacity-0",
            )}
          >
            <FixedGridView
              sessions={sessions.filter(
                (session) => session.layerId === layer.id,
              )}
              visibleCells={visibleFixedCells}
              fixedGrid={fixedGrid}
              galleryIndexes={galleryIndexes}
              videoPositions={videoPositions}
              selectedId={isActiveLayer ? selectedId : null}
              hideUi={isUiHidden}
              isPlaybackActive={isActiveLayer}
              showInfo={isActiveLayer && showAllInfo}
              openSourcePanel={openSourcePanel}
              setSelectedId={setSelectedId}
              setMaximizedId={setMaximizedId}
              updateSession={updateSession}
              removeSession={removeSession}
              changeGallery={changeGallery}
              onVideoPositionChange={rememberVideoPosition}
              setViewTimerMode={setViewTimerMode}
              setViewTimerSeconds={setViewTimerSeconds}
              onLocalFilesSelected={replaceLocalSessionFiles}
              onLocalCacheAccessRequested={requestLocalCacheAccess}
              onEditSource={openEditSource}
            />
          </div>
        );
      })}
    </div>
  );
}

function FreeLayerStage({
  freeGridRef,
  layers,
  activeLayerId,
  sessions,
  templateSlots,
  galleryIndexes,
  videoPositions,
  selectedId,
  isUiHidden,
  showAllInfo,
  freeDrag,
  setSelectedId,
  setMaximizedId,
  updateSession,
  removeSession,
  removeTemplateSlot,
  openSourcePanel,
  changeGallery,
  rememberVideoPosition,
  setViewTimerMode,
  setViewTimerSeconds,
  beginFreeDrag,
  replaceLocalSessionFiles,
  requestLocalCacheAccess,
  openEditSource,
}: {
  freeGridRef: RefObject<HTMLDivElement | null>;
  layers: WorkspaceLayer[];
  activeLayerId: string;
  sessions: FeedSession[];
  templateSlots: WorkspaceTemplateSlot[];
  galleryIndexes: Record<string, number>;
  videoPositions: Record<string, number>;
  selectedId: string | null;
  isUiHidden: boolean;
  showAllInfo: boolean;
  freeDrag: FreeDragState | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setMaximizedId: Dispatch<SetStateAction<string | null>>;
  updateSession: (
    id: string,
    updater: (session: FeedSession) => FeedSession,
  ) => void;
  removeSession: (id: string) => void;
  removeTemplateSlot: (id: string) => void;
  openSourcePanel: (
    fixedSlot?: number | null,
    templateSlotId?: string | null,
  ) => void;
  changeGallery: (itemId: string, direction: 1 | -1) => void;
  rememberVideoPosition: (key: string, seconds: number) => void;
  setViewTimerMode: (id: string, mode: TimerMode) => void;
  setViewTimerSeconds: (id: string, value: number) => void;
  beginFreeDrag: (
    event: ReactPointerEvent<HTMLButtonElement>,
    target: { id: string; freeRect: FreeRect },
    mode: "move" | "resize",
    targetType?: FreeDragState["targetType"],
  ) => void;
  replaceLocalSessionFiles: (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  requestLocalCacheAccess: (id: string) => void;
  openEditSource: (id: string) => void;
}) {
  return (
    <div
      ref={freeGridRef}
      className={cn(
        "relative",
        isUiHidden
          ? "h-dvh min-h-0 min-w-0"
          : "h-full min-h-0 min-w-0 md:min-h-[360px] md:min-w-[720px]",
      )}
    >
      {layers.map((layer) => {
        const isActiveLayer = layer.id === activeLayerId;

        return (
          <div
            key={layer.id}
            aria-hidden={!isActiveLayer}
            style={{
              visibility: isActiveLayer ? "visible" : "hidden",
            }}
            className={cn(
              isActiveLayer
                ? "relative z-10 size-full"
                : "pointer-events-none absolute inset-0 opacity-0",
            )}
          >
            <FreeGridView
              sessions={sessions.filter(
                (session) => session.layerId === layer.id,
              )}
              templateSlots={templateSlots.filter(
                (slot) => (slot.layerId ?? layer.id) === layer.id,
              )}
              galleryIndexes={galleryIndexes}
              videoPositions={videoPositions}
              selectedId={isActiveLayer ? selectedId : null}
              hideUi={isUiHidden}
              isPlaybackActive={isActiveLayer}
              showInfo={isActiveLayer && showAllInfo}
              freeDrag={isActiveLayer ? freeDrag : null}
              setSelectedId={setSelectedId}
              setMaximizedId={setMaximizedId}
              updateSession={updateSession}
              removeSession={removeSession}
              removeTemplateSlot={removeTemplateSlot}
              openSourcePanel={openSourcePanel}
              changeGallery={changeGallery}
              onVideoPositionChange={rememberVideoPosition}
              setViewTimerMode={setViewTimerMode}
              setViewTimerSeconds={setViewTimerSeconds}
              beginFreeDrag={beginFreeDrag}
              onLocalFilesSelected={replaceLocalSessionFiles}
              onLocalCacheAccessRequested={requestLocalCacheAccess}
              onEditSource={openEditSource}
            />
          </div>
        );
      })}
    </div>
  );
}
