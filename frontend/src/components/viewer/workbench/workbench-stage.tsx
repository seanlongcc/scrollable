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
  globalAudioEnabled = true,
  finishVideoBeforeAdvance = false,
  randomVideoStart = false,
  isUiHidden,
  isDesktopWorkbenchCollapsed,
  showAllInfo,
  setMaximizedId,
  changeGallery,
  rememberVideoPosition,
  rememberVideoFinished = () => undefined,
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
  globalAudioEnabled?: boolean;
  finishVideoBeforeAdvance?: boolean;
  randomVideoStart?: boolean;
  isUiHidden: boolean;
  isDesktopWorkbenchCollapsed: boolean;
  showAllInfo: boolean;
  setMaximizedId: Dispatch<SetStateAction<string | null>>;
  changeGallery: (itemId: string, direction: 1 | -1) => void;
  rememberVideoPosition: (
    key: string,
    seconds: number,
    durationSeconds?: number,
  ) => void;
  rememberVideoFinished?: (key: string) => void;
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
        globalAudioEnabled={globalAudioEnabled}
        finishVideoBeforeAdvance={finishVideoBeforeAdvance}
        randomVideoStart={randomVideoStart}
        hideUi={isUiHidden}
        showInfo={showAllInfo}
        onRestore={() => setMaximizedId(null)}
        onFocus={setMaximizedId}
        onGalleryChange={changeGallery}
        onVideoPositionChange={rememberVideoPosition}
        onVideoEnded={rememberVideoFinished}
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
      data-testid="workbench-stage-shell"
      className={cn(
        "grid min-h-0 grid-rows-[minmax(0,1fr)]",
        isUiHidden
          ? "p-0"
          : cn(
              "px-0 pt-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pt-16 md:pr-4 md:pb-4",
              isDesktopWorkbenchCollapsed ? "md:pl-[5rem]" : "md:pl-[20.5rem]",
            ),
      )}
    >
      <div
        className={cn(
          "h-full min-h-0 overflow-auto border-border/70 bg-background bg-[linear-gradient(rgba(255,255,255,.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.01)_1px,transparent_1px)]",
          isUiHidden
            ? "rounded-none border-0 p-0"
            : "rounded-none border-0 p-0 md:rounded-2xl md:border md:p-0.5",
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
            globalAudioEnabled={globalAudioEnabled}
            finishVideoBeforeAdvance={finishVideoBeforeAdvance}
            randomVideoStart={randomVideoStart}
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
            rememberVideoFinished={rememberVideoFinished}
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
            globalAudioEnabled={globalAudioEnabled}
            finishVideoBeforeAdvance={finishVideoBeforeAdvance}
            randomVideoStart={randomVideoStart}
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
            rememberVideoFinished={rememberVideoFinished}
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
  globalAudioEnabled,
  finishVideoBeforeAdvance,
  randomVideoStart,
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
  rememberVideoFinished,
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
  globalAudioEnabled: boolean;
  finishVideoBeforeAdvance: boolean;
  randomVideoStart: boolean;
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
  rememberVideoPosition: (
    key: string,
    seconds: number,
    durationSeconds?: number,
  ) => void;
  rememberVideoFinished: (key: string) => void;
  setViewTimerMode: (id: string, mode: TimerMode) => void;
  setViewTimerSeconds: (id: string, value: number) => void;
  replaceLocalSessionFiles: (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  requestLocalCacheAccess: (id: string) => void;
  openEditSource: (id: string) => void;
}) {
  const activeLayer = layers.find((layer) => layer.id === activeLayerId);

  if (!activeLayer) return null;

  return (
    <div
      className={cn(
        "relative",
        isUiHidden
          ? "h-dvh min-h-0 min-w-0"
          : "h-full min-h-0 min-w-0 md:min-h-[360px] min-[1080px]:min-w-[720px]",
      )}
    >
      {layers.map((layer) => {
        const isActiveLayer = layer.id === activeLayer.id;

        return (
          <div
            key={layer.id}
            data-testid={`layer-${layer.id}`}
            className={layerStageClass(isActiveLayer)}
            aria-hidden={!isActiveLayer}
          >
            <FixedGridView
              sessions={sessions.filter(
                (session) => session.layerId === layer.id,
              )}
              visibleCells={visibleFixedCells}
              fixedGrid={fixedGrid}
              galleryIndexes={galleryIndexes}
              videoPositions={videoPositions}
              globalAudioEnabled={globalAudioEnabled}
              finishVideoBeforeAdvance={finishVideoBeforeAdvance}
              randomVideoStart={randomVideoStart}
              selectedId={selectedId}
              hideUi={isUiHidden}
              isPlaybackActive
              showInfo={showAllInfo}
              openSourcePanel={openSourcePanel}
              setSelectedId={setSelectedId}
              setMaximizedId={setMaximizedId}
              updateSession={updateSession}
              removeSession={removeSession}
              changeGallery={changeGallery}
              onVideoPositionChange={rememberVideoPosition}
              onVideoEnded={rememberVideoFinished}
              setViewTimerMode={setViewTimerMode}
              setViewTimerSeconds={setViewTimerSeconds}
              onLocalFilesSelected={replaceLocalSessionFiles}
              onLocalCacheAccessRequested={requestLocalCacheAccess}
              onEditSource={openEditSource}
              cellTestIdPrefix={
                isActiveLayer ? "fixed-cell" : `${layer.id}-fixed-cell`
              }
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
  globalAudioEnabled,
  finishVideoBeforeAdvance,
  randomVideoStart,
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
  rememberVideoFinished,
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
  globalAudioEnabled: boolean;
  finishVideoBeforeAdvance: boolean;
  randomVideoStart: boolean;
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
  rememberVideoPosition: (
    key: string,
    seconds: number,
    durationSeconds?: number,
  ) => void;
  rememberVideoFinished: (key: string) => void;
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
  const activeLayer = layers.find((layer) => layer.id === activeLayerId);

  if (!activeLayer) return null;

  return (
    <div
      ref={freeGridRef}
      className={cn(
        "relative",
        isUiHidden
          ? "h-dvh min-h-0 min-w-0"
          : "h-full min-h-0 min-w-0 md:min-h-[360px] min-[1080px]:min-w-[720px]",
      )}
    >
      {layers.map((layer) => {
        const isActiveLayer = layer.id === activeLayer.id;

        return (
          <div
            key={layer.id}
            data-testid={`layer-${layer.id}`}
            className={layerStageClass(isActiveLayer)}
            aria-hidden={!isActiveLayer}
          >
            <FreeGridView
              sessions={sessions.filter(
                (session) => session.layerId === layer.id,
              )}
              templateSlots={templateSlots.filter(
                (slot) => (slot.layerId ?? activeLayer.id) === layer.id,
              )}
              galleryIndexes={galleryIndexes}
              videoPositions={videoPositions}
              globalAudioEnabled={globalAudioEnabled}
              finishVideoBeforeAdvance={finishVideoBeforeAdvance}
              randomVideoStart={randomVideoStart}
              selectedId={selectedId}
              hideUi={isUiHidden}
              isPlaybackActive
              showInfo={showAllInfo}
              freeDrag={freeDrag}
              setSelectedId={setSelectedId}
              setMaximizedId={setMaximizedId}
              updateSession={updateSession}
              removeSession={removeSession}
              removeTemplateSlot={removeTemplateSlot}
              openSourcePanel={openSourcePanel}
              changeGallery={changeGallery}
              onVideoPositionChange={rememberVideoPosition}
              onVideoEnded={rememberVideoFinished}
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

function layerStageClass(isActiveLayer: boolean) {
  return cn(
    "absolute inset-0 size-full transition-opacity duration-150",
    isActiveLayer
      ? "pointer-events-auto z-10 opacity-100"
      : "pointer-events-none z-0 opacity-0",
  );
}
