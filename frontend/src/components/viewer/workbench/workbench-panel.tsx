"use client";

import { Clock3, Copy, Grid2X2, Maximize2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

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
  type FreeRect,
} from "@/lib/viewer/layout";
import type { TimerMode } from "@/lib/viewer/timer";
import { cn } from "@/lib/utils";
import { NumberField } from "./fields";
import { SelectedFreeLayoutControls } from "./selected-free-layout-controls";
import type { LayerStats } from "./selection-state";
import type { FeedSession, LayoutMode, WorkspaceLayer } from "./types";
import type { GlobalTimerAction } from "./workbench-toolbar";
import { PlaybackControls } from "./workbench-playback-controls";
import {
  ActionsSection,
  GlobalTimerSection,
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
  onCloneSelectedSource: () => void;
  onFillSelectedSourceSpace: () => void;
  onRemoveSelectedSource: () => void;
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
  onFreeRectChange: (id: string, patch: Partial<FreeRect>) => void;
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
        className="mobile-compact-controls max-h-[82dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-border/70 bg-surface px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-22px_74px_rgba(18,10,10,0.62)] md:hidden"
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
  onCloneSelectedSource,
  onFillSelectedSourceSpace,
  onRemoveSelectedSource,
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
  onFreeRectChange,
}: WorkbenchPanelContentProps) {
  const maxGridSize =
    mode === "mobile" ? MOBILE_FIXED_GRID_MAX : DESKTOP_FIXED_GRID_MAX;

  return (
    <div className="flex min-h-full flex-col gap-4">
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
          <GlobalTimerSection
            mode={mode}
            globalSeconds={globalSeconds}
            hasRunningSessionTimer={hasRunningSessionTimer}
            onGlobalTimerSecondsChange={onGlobalTimerSecondsChange}
            onGlobalTimerAction={onGlobalTimerAction}
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
          <WorkbenchPanelDisclosure label="Timer">
            <GlobalTimerSection
              mode={mode}
              globalSeconds={globalSeconds}
              hasRunningSessionTimer={hasRunningSessionTimer}
              onGlobalTimerSecondsChange={onGlobalTimerSecondsChange}
              onGlobalTimerAction={onGlobalTimerAction}
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
              <Button
                type="button"
                variant="destructive"
                onClick={onRemoveSelectedSource}
                className={cn(
                  selectedSourceButtonClass,
                  "col-span-2 justify-center",
                )}
              >
                <Trash2 />
                <span className="min-w-0 truncate">Remove</span>
              </Button>
            </div>
            {layoutMode === "free" ? (
              <SelectedFreeLayoutControls
                selected={selected}
                onFreeRectChange={onFreeRectChange}
              />
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
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border/60 pt-3 font-mono text-[10px] text-muted-foreground">
      <Link className="hover:text-foreground" href="/privacy">
        Privacy
      </Link>
      <Link className="hover:text-foreground" href="/terms">
        Terms
      </Link>
    </footer>
  );
}
