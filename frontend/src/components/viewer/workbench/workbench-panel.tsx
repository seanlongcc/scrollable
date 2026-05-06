"use client";

import {
  Clock3,
  Copy,
  Film,
  Grid2X2,
  Maximize2,
  Pencil,
  Shuffle,
  Trash2,
  Volume2,
} from "lucide-react";
import Link from "next/link";

import { ReleaseVersionLink } from "@/components/release-version-link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DESKTOP_FIXED_GRID_MAX,
  MOBILE_FIXED_GRID_MAX,
  type FixedGrid,
} from "@/lib/viewer/layout";
import type { TimerMode } from "@/lib/viewer/timer";
import { cn } from "@/lib/utils";
import { NumberField } from "./fields";
import type { LayerStats } from "./selection-state";
import {
  canRandomizeSessionSource,
  isSessionOrderRandomized,
} from "./source-order-state";
import type { FeedSession, LayoutMode, WorkspaceLayer } from "./types";
import type { GlobalTimerAction } from "./workbench-toolbar";
import { PlaybackControls } from "./workbench-playback-controls";
import {
  ActionsSection,
  GlobalSettingsSection,
  GridSection,
  LayerSection,
  LayoutModeSection,
  WorkbenchPanelDisclosure,
  workbenchActionButtonClass,
} from "./workbench-panel-sections";

const selectedSourceButtonClass = cn(
  workbenchActionButtonClass,
  "justify-center",
);

export type WorkbenchPanelContentProps = {
  mode: "mobile" | "desktop";
  workspaceName: string;
  layoutMode: LayoutMode;
  layoutModeLocked: boolean;
  fixedGrid: FixedGrid;
  globalSeconds: number;
  hasRunningSessionTimer: boolean;
  globalAudioEnabled?: boolean;
  finishVideoBeforeAdvance?: boolean;
  randomVideoStart?: boolean;
  globalOrderRandomized?: boolean;
  selected: FeedSession | null;
  canCloneOrFillSelectedSource: boolean;
  showAllInfo: boolean;
  isClearDisabled: boolean;
  layers: WorkspaceLayer[];
  layerStats: LayerStats[];
  activeLayerId: string;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onFixedGridChange: (patch: Partial<FixedGrid>) => void;
  onGlobalTimerSecondsChange: (seconds: number) => void;
  onGlobalTimerAction: (action: GlobalTimerAction) => void;
  onGlobalAudioEnabledChange?: (enabled: boolean) => void;
  onFinishVideoBeforeAdvanceChange?: (enabled: boolean) => void;
  onRandomVideoStartChange?: (enabled: boolean) => void;
  onGlobalOrderRandomizedChange?: (enabled: boolean) => void;
  onCloneSelectedSource: () => void;
  onFillSelectedSourceSpace: () => void;
  onRemoveSelectedSource: () => void;
  onRandomizeSelectedSource: () => void;
  onSelectedAudioEnabledChange?: (enabled: boolean) => void;
  onSelectedFinishVideoBeforeAdvanceChange?: (enabled: boolean) => void;
  onSelectedRandomVideoStartChange?: (enabled: boolean) => void;
  onSelectedTimerModeChange: (mode: TimerMode) => void;
  onSelectedTimerSecondsChange: (seconds: number) => void;
  onSelectedMove: (direction: 1 | -1) => void;
  onSelectedTogglePaused: () => void;
  onSelectedRestart: () => void;
  onEditSelectedSource: () => void;
  onOpenSatellite: () => void;
  onToggleShowAllInfo: () => void;
  onHideUi: () => void;
  onAddSource: () => void;
  onOpenSaveDialog: () => void;
  onImportJson: () => void;
  onExportCurrentJson: () => void;
  onOpenClearDialog: () => void;
  onPreloadOverlays?: () => void;
  onSelectLayer: (id: string) => void;
};

export type WorkbenchPanelSheetProps = Omit<
  WorkbenchPanelContentProps,
  "mode"
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WorkbenchPanelSheet({
  open,
  onOpenChange,
  ...props
}: WorkbenchPanelSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mobile-compact-controls max-h-[82dvh] overflow-y-auto overscroll-contain rounded-t-2xl border-border/70 bg-surface px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-18px_64px_rgba(18,10,10,0.58)] md:hidden"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-border" />
        <SheetHeader className="px-0 pt-0">
          <SheetTitle>Workbench</SheetTitle>
          <SheetDescription className="sr-only">
            Workspace controls
          </SheetDescription>
        </SheetHeader>
        <WorkbenchPanelContent mode="mobile" {...props} />
      </SheetContent>
    </Sheet>
  );
}

export function WorkbenchPanelContent({
  mode,
  workspaceName,
  layoutMode,
  layoutModeLocked,
  fixedGrid,
  globalSeconds,
  hasRunningSessionTimer,
  globalAudioEnabled = true,
  finishVideoBeforeAdvance = false,
  randomVideoStart = false,
  globalOrderRandomized = true,
  selected,
  canCloneOrFillSelectedSource,
  showAllInfo,
  isClearDisabled,
  layers,
  layerStats,
  activeLayerId,
  onLayoutModeChange,
  onFixedGridChange,
  onGlobalTimerSecondsChange,
  onGlobalTimerAction,
  onGlobalAudioEnabledChange = () => undefined,
  onFinishVideoBeforeAdvanceChange = () => undefined,
  onRandomVideoStartChange = () => undefined,
  onGlobalOrderRandomizedChange = () => undefined,
  onCloneSelectedSource,
  onFillSelectedSourceSpace,
  onRemoveSelectedSource,
  onRandomizeSelectedSource,
  onSelectedAudioEnabledChange = () => undefined,
  onSelectedFinishVideoBeforeAdvanceChange = () => undefined,
  onSelectedRandomVideoStartChange = () => undefined,
  onSelectedTimerModeChange,
  onSelectedTimerSecondsChange,
  onSelectedMove,
  onSelectedTogglePaused,
  onSelectedRestart,
  onEditSelectedSource,
  onOpenSatellite,
  onToggleShowAllInfo,
  onHideUi,
  onAddSource,
  onOpenSaveDialog,
  onImportJson,
  onExportCurrentJson,
  onOpenClearDialog,
  onPreloadOverlays,
  onSelectLayer,
}: WorkbenchPanelContentProps) {
  const maxGridSize =
    mode === "mobile" ? MOBILE_FIXED_GRID_MAX : DESKTOP_FIXED_GRID_MAX;
  const removeSelectedSourceButton = (className?: string) => (
    <Button
      type="button"
      variant="destructive"
      onClick={onRemoveSelectedSource}
      className={cn(
        selectedSourceButtonClass,
        "w-full justify-center",
        className,
      )}
    >
      <Trash2 />
      <span className="min-w-0 truncate">Remove</span>
    </Button>
  );
  const canRandomizeSelectedSource = canRandomizeSessionSource(selected);
  const isRandomizeSelectedSourceEnabled = isSessionOrderRandomized(selected);
  const isSelectedSourceAudioEnabled =
    selected?.isAudioEnabled ?? globalAudioEnabled;
  const isSelectedSourceFinishVideoBeforeAdvance =
    selected?.finishVideoBeforeAdvance ?? finishVideoBeforeAdvance;
  const isSelectedSourceRandomVideoStart =
    selected?.randomVideoStart ?? randomVideoStart;
  const selectedAudioLabel = isSelectedSourceAudioEnabled ? "Mute" : "Unmute";
  const selectedSourceOrderButtons = (removeClassName?: string) => {
    const selectedRemoveClassName = cn(
      canRandomizeSelectedSource && "col-span-2",
      removeClassName,
    );

    return (
      <>
        {canRandomizeSelectedSource ? (
          <Button
            type="button"
            variant={isRandomizeSelectedSourceEnabled ? "default" : "outline"}
            aria-pressed={isRandomizeSelectedSourceEnabled}
            aria-label="Shuffle selected source"
            onClick={onRandomizeSelectedSource}
            className={selectedSourceButtonClass}
          >
            <Shuffle />
            <span className="min-w-0 truncate">Shuffle</span>
          </Button>
        ) : null}
        <Button
          type="button"
          variant={isSelectedSourceAudioEnabled ? "default" : "outline"}
          aria-pressed={isSelectedSourceAudioEnabled}
          aria-label={`${selectedAudioLabel} selected source`}
          onClick={() =>
            onSelectedAudioEnabledChange(!isSelectedSourceAudioEnabled)
          }
          className={selectedSourceButtonClass}
        >
          <Volume2 />
          <span className="min-w-0 truncate">{selectedAudioLabel}</span>
        </Button>
        <Button
          type="button"
          variant={
            isSelectedSourceFinishVideoBeforeAdvance ? "default" : "outline"
          }
          aria-pressed={isSelectedSourceFinishVideoBeforeAdvance}
          aria-label="Play selected source to end"
          onClick={() =>
            onSelectedFinishVideoBeforeAdvanceChange(
              !isSelectedSourceFinishVideoBeforeAdvance,
            )
          }
          className={selectedSourceButtonClass}
        >
          <Film />
          <span className="min-w-0 truncate">Play to end</span>
        </Button>
        <Button
          type="button"
          variant={isSelectedSourceRandomVideoStart ? "default" : "outline"}
          aria-pressed={isSelectedSourceRandomVideoStart}
          aria-label="Use random seek for selected source videos"
          onClick={() =>
            onSelectedRandomVideoStartChange(!isSelectedSourceRandomVideoStart)
          }
          className={selectedSourceButtonClass}
        >
          <Shuffle />
          <span className="min-w-0 truncate">Random seek</span>
        </Button>
        {removeSelectedSourceButton(selectedRemoveClassName)}
      </>
    );
  };

  return (
    <div className="flex min-h-full flex-col gap-3">
      <div className="hidden min-w-0 text-sm font-semibold md:block">
        <div className="truncate" title={workspaceName}>
          {workspaceName}
        </div>
      </div>

      {mode === "desktop" ? (
        <>
          <LayoutModeSection
            layoutMode={layoutMode}
            layoutModeLocked={layoutModeLocked}
            onLayoutModeChange={onLayoutModeChange}
          />
          <LayerSection
            layers={layers}
            layerStats={layerStats}
            activeLayerId={activeLayerId}
            onSelectLayer={onSelectLayer}
          />
          <GridSection
            fixedGrid={fixedGrid}
            maxGridSize={maxGridSize}
            onFixedGridChange={onFixedGridChange}
          />
          <GlobalSettingsSection
            mode={mode}
            globalSeconds={globalSeconds}
            hasRunningSessionTimer={hasRunningSessionTimer}
            globalAudioEnabled={globalAudioEnabled}
            finishVideoBeforeAdvance={finishVideoBeforeAdvance}
            randomVideoStart={randomVideoStart}
            globalOrderRandomized={globalOrderRandomized}
            onGlobalTimerSecondsChange={onGlobalTimerSecondsChange}
            onGlobalTimerAction={onGlobalTimerAction}
            onGlobalAudioEnabledChange={onGlobalAudioEnabledChange}
            onFinishVideoBeforeAdvanceChange={onFinishVideoBeforeAdvanceChange}
            onRandomVideoStartChange={onRandomVideoStartChange}
            onGlobalOrderRandomizedChange={onGlobalOrderRandomizedChange}
          />
          <ActionsSection
            showAllInfo={showAllInfo}
            isClearDisabled={isClearDisabled}
            onAddSource={onAddSource}
            onHideUi={onHideUi}
            onToggleShowAllInfo={onToggleShowAllInfo}
            onOpenSaveDialog={onOpenSaveDialog}
            onImportJson={onImportJson}
            onExportCurrentJson={onExportCurrentJson}
            onOpenClearDialog={onOpenClearDialog}
            onPreloadOverlays={onPreloadOverlays}
          />
        </>
      ) : (
        <>
          <ActionsSection
            showAllInfo={showAllInfo}
            isClearDisabled={isClearDisabled}
            onAddSource={onAddSource}
            onHideUi={onHideUi}
            onToggleShowAllInfo={onToggleShowAllInfo}
            onOpenSaveDialog={onOpenSaveDialog}
            onImportJson={onImportJson}
            onExportCurrentJson={onExportCurrentJson}
            onOpenClearDialog={onOpenClearDialog}
            onPreloadOverlays={onPreloadOverlays}
          />
          <WorkbenchPanelDisclosure label="Layout">
            <LayerSection
              layers={layers}
              layerStats={layerStats}
              activeLayerId={activeLayerId}
              onSelectLayer={onSelectLayer}
            />
            <GridSection
              fixedGrid={fixedGrid}
              maxGridSize={maxGridSize}
              onFixedGridChange={onFixedGridChange}
            />
          </WorkbenchPanelDisclosure>
          <WorkbenchPanelDisclosure label="Global settings">
            <GlobalSettingsSection
              mode={mode}
              globalSeconds={globalSeconds}
              hasRunningSessionTimer={hasRunningSessionTimer}
              globalAudioEnabled={globalAudioEnabled}
              finishVideoBeforeAdvance={finishVideoBeforeAdvance}
              randomVideoStart={randomVideoStart}
              globalOrderRandomized={globalOrderRandomized}
              onGlobalTimerSecondsChange={onGlobalTimerSecondsChange}
              onGlobalTimerAction={onGlobalTimerAction}
              onGlobalAudioEnabledChange={onGlobalAudioEnabledChange}
              onFinishVideoBeforeAdvanceChange={
                onFinishVideoBeforeAdvanceChange
              }
              onRandomVideoStartChange={onRandomVideoStartChange}
              onGlobalOrderRandomizedChange={onGlobalOrderRandomizedChange}
            />
          </WorkbenchPanelDisclosure>
        </>
      )}

      {mode === "desktop" && selected ? (
        <>
          <section className="grid gap-2">
            <h2 className="font-mono text-[10px] font-semibold tracking-normal text-muted-foreground uppercase">
              Selected source
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={selected.timerMode === "local" ? "default" : "outline"}
                onClick={() =>
                  onSelectedTimerModeChange(
                    selected.timerMode === "local" ? "global" : "local",
                  )
                }
                className={selectedSourceButtonClass}
              >
                <Clock3 />
                <span className="min-w-0 truncate">Local timer</span>
              </Button>
              <NumberField
                label="Local timer seconds"
                hideLabel
                value={selected.timer.durationSeconds}
                min={1}
                max={120}
                className="min-w-0"
                inputClassName="h-10 min-h-10 w-full min-w-0 flex-1 rounded-xl border-border/80 bg-surface-elevated/80 text-center font-mono text-sm md:h-8 md:min-h-0 md:text-sm"
                onChange={onSelectedTimerSecondsChange}
              />
              <Button
                type="button"
                variant="outline"
                aria-label="Edit selected source"
                onClick={onEditSelectedSource}
                className={selectedSourceButtonClass}
              >
                <Pencil />
                <span className="min-w-0 truncate">Edit</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onOpenSatellite}
                className={selectedSourceButtonClass}
              >
                <Maximize2 />
                <span className="min-w-0 truncate">Focus</span>
              </Button>
              {canCloneOrFillSelectedSource ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Clone selected source"
                    onClick={onCloneSelectedSource}
                    className={selectedSourceButtonClass}
                  >
                    <Copy />
                    <span className="min-w-0 truncate">Clone</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Fill empty spaces with selected source"
                    onClick={onFillSelectedSourceSpace}
                    className={selectedSourceButtonClass}
                  >
                    <Grid2X2 />
                    <span className="min-w-0 truncate">Fill</span>
                  </Button>
                </>
              ) : null}
              {layoutMode !== "free" ? selectedSourceOrderButtons() : null}
            </div>
            {layoutMode === "free" ? (
              <div className="grid grid-cols-2 gap-2">
                {selectedSourceOrderButtons()}
              </div>
            ) : null}
          </section>
          <section className="grid gap-2">
            <h2 className="font-mono text-[10px] font-semibold tracking-normal text-muted-foreground uppercase">
              Playback
            </h2>
            <PlaybackControls
              selected={selected}
              variant="panel"
              onSelectedMove={onSelectedMove}
              onSelectedTogglePaused={onSelectedTogglePaused}
              onSelectedRestart={onSelectedRestart}
            />
          </section>
        </>
      ) : null}

      {mode === "desktop" ? <WorkbenchLegalFooter /> : null}
    </div>
  );
}

function WorkbenchLegalFooter() {
  const linkClass = "hover:text-foreground";

  return (
    <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border/60 pt-3 font-mono text-[10px] text-muted-foreground">
      <Link className={linkClass} href="/privacy">
        Privacy
      </Link>
      <Link className={linkClass} href="/terms">
        Terms
      </Link>
      <Link className={linkClass} href="/changelog">
        Changelog
      </Link>
      <ReleaseVersionLink className={linkClass} />
    </footer>
  );
}
