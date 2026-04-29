import {
  Clock3,
  Copy,
  EyeOff,
  FolderOpen,
  Grid2X2,
  Maximize2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Trash2,
  UserCircle,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { FixedGrid, FreeRect } from "@/lib/viewer/layout";
import type { TimerMode } from "@/lib/viewer/timer";
import { cn } from "@/lib/utils";
import { NumberField } from "./fields";
import { SelectedFreeLayoutControls } from "./selected-free-layout-controls";
import type { LayerStats } from "./selection-state";
import type { GlobalTimerAction } from "./workbench-toolbar";
import type { FeedSession, LayoutMode, WorkspaceLayer } from "./types";
import {
  ActionsSection,
  GlobalTimerSection,
  GridSection,
  LayerSection,
  LayoutModeSection,
  WorkbenchPanelDisclosure,
} from "./workbench-panel-sections";

export function WorkbenchChrome({
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
  isAnySheetOpen,
  isDesktopWorkbenchCollapsed,
  layers,
  layerStats,
  activeLayerId,
  accountButtonLabel,
  accountButtonTitle,
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
  onOpenLibrary,
  onOpenSaveDialog,
  onImportJson,
  onExportCurrentJson,
  onOpenClearDialog,
  onOpenAccount,
  onDesktopWorkbenchCollapsedChange,
  onSelectLayer,
  onFreeRectChange,
}: {
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
  isAnySheetOpen: boolean;
  isDesktopWorkbenchCollapsed: boolean;
  layers: WorkspaceLayer[];
  layerStats: LayerStats[];
  activeLayerId: string;
  accountButtonLabel: string;
  accountButtonTitle: string;
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
  onOpenLibrary: () => void;
  onOpenSaveDialog: () => void;
  onImportJson: () => void;
  onExportCurrentJson: () => void;
  onOpenClearDialog: () => void;
  onOpenAccount: () => void;
  onDesktopWorkbenchCollapsedChange: (collapsed: boolean) => void;
  onSelectLayer: (id: string) => void;
  onFreeRectChange: (id: string, patch: Partial<FreeRect>) => void;
}) {
  const [isWorkbenchSheetOpen, setIsWorkbenchSheetOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const controlsHidden = isAnySheetOpen || isWorkbenchSheetOpen;
  const showPlaybackPill = Boolean(selected) && !controlsHidden;
  const desktopWorkbenchButtonLabel = isDesktopWorkbenchCollapsed
    ? "Open workbench"
    : "Collapse workbench";
  const mobileBottomButtonClass =
    "h-12 w-full rounded-none border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-transparent hover:text-primary focus-visible:ring-2 [&_svg:not([class*='size-'])]:size-5";
  const desktopRailButtonClass =
    "h-10 w-full rounded-2xl shadow-[0_14px_34px_rgba(18,10,10,0.42)]";

  function openMobileWorkbench() {
    setIsMoreOpen(false);
    setIsWorkbenchSheetOpen(true);
  }

  function closeMobileChrome() {
    setIsMoreOpen(false);
    setIsWorkbenchSheetOpen(false);
  }

  function openAddSource() {
    closeMobileChrome();
    onAddSource();
  }

  function openLibrary() {
    closeMobileChrome();
    onOpenLibrary();
  }

  function openSaveDialog() {
    closeMobileChrome();
    onOpenSaveDialog();
  }

  function openClearDialog() {
    closeMobileChrome();
    onOpenClearDialog();
  }

  function openAccount() {
    closeMobileChrome();
    onOpenAccount();
  }

  return (
    <>
      <aside
        aria-label="Workbench contextual panel"
        className={cn(
          "pointer-events-auto fixed top-16 bottom-3 left-3 z-40 hidden grid-rows-[auto_minmax(0,1fr)] gap-3 md:grid",
          isDesktopWorkbenchCollapsed ? "w-14" : "w-[19rem]",
        )}
      >
        <nav
          aria-label="Desktop context actions"
          className={cn(
            "grid w-full items-center gap-2",
            isDesktopWorkbenchCollapsed ? "grid-cols-1" : "grid-cols-3",
          )}
        >
          <Button
            type="button"
            size="icon-lg"
            variant="default"
            aria-label={desktopWorkbenchButtonLabel}
            aria-controls="desktop-workbench-panel"
            aria-expanded={!isDesktopWorkbenchCollapsed}
            title={desktopWorkbenchButtonLabel}
            onClick={() =>
              onDesktopWorkbenchCollapsedChange(!isDesktopWorkbenchCollapsed)
            }
            className={desktopRailButtonClass}
          >
            <SlidersHorizontal />
          </Button>
          <Button
            type="button"
            size="icon-lg"
            variant="outline"
            aria-label="Library"
            onClick={openLibrary}
            className={desktopRailButtonClass}
          >
            <FolderOpen />
          </Button>
          <Button
            type="button"
            size="icon-lg"
            variant="outline"
            aria-label={accountButtonLabel}
            title={accountButtonTitle}
            onClick={openAccount}
            className={desktopRailButtonClass}
          >
            <UserCircle />
          </Button>
        </nav>

        {isDesktopWorkbenchCollapsed ? (
          <div id="desktop-workbench-panel" hidden />
        ) : (
          <div
            id="desktop-workbench-panel"
            className="min-h-0 overflow-y-auto rounded-2xl border border-border/60 bg-surface/72 p-3 shadow-[0_24px_70px_rgba(18,10,10,0.42)] backdrop-blur"
          >
            <WorkbenchPanelContent
              mode="desktop"
              workspaceName={workspaceName}
              layoutMode={layoutMode}
              layoutModeLocked={layoutModeLocked}
              fixedGrid={fixedGrid}
              globalSeconds={globalSeconds}
              hasRunningSessionTimer={hasRunningSessionTimer}
              selected={selected}
              canCloneOrFillSelectedSource={canCloneOrFillSelectedSource}
              showAllInfo={showAllInfo}
              isClearDisabled={isClearDisabled}
              layers={layers}
              layerStats={layerStats}
              activeLayerId={activeLayerId}
              onLayoutModeChange={onLayoutModeChange}
              onFixedGridChange={onFixedGridChange}
              onGlobalTimerSecondsChange={onGlobalTimerSecondsChange}
              onGlobalTimerAction={onGlobalTimerAction}
              onCloneSelectedSource={onCloneSelectedSource}
              onFillSelectedSourceSpace={onFillSelectedSourceSpace}
              onRemoveSelectedSource={onRemoveSelectedSource}
              onSelectedTimerModeChange={onSelectedTimerModeChange}
              onSelectedTimerSecondsChange={onSelectedTimerSecondsChange}
              onSelectedMove={onSelectedMove}
              onSelectedTogglePaused={onSelectedTogglePaused}
              onSelectedRestart={onSelectedRestart}
              onEditSelectedSource={onEditSelectedSource}
              onOpenSatellite={onOpenSatellite}
              onToggleShowAllInfo={onToggleShowAllInfo}
              onHideUi={onHideUi}
              onAddSource={openAddSource}
              onOpenSaveDialog={openSaveDialog}
              onImportJson={onImportJson}
              onExportCurrentJson={onExportCurrentJson}
              onOpenClearDialog={openClearDialog}
              onSelectLayer={onSelectLayer}
              onFreeRectChange={onFreeRectChange}
            />
          </div>
        )}
      </aside>

      {showPlaybackPill && selected ? (
        <PlaybackControls
          selected={selected}
          onSelectedMove={onSelectedMove}
          onSelectedTogglePaused={onSelectedTogglePaused}
          onSelectedRestart={onSelectedRestart}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 md:hidden"
        />
      ) : null}

      {!controlsHidden ? (
        <div className="pointer-events-auto fixed right-3 bottom-[8.5rem] z-40 grid gap-2 md:hidden">
          {selected ? (
            <>
              <RailButton
                ariaLabel="Edit local timer"
                onClick={() =>
                  onSelectedTimerModeChange(
                    selected.timerMode === "local" ? "global" : "local",
                  )
                }
              >
                <Clock3 />
              </RailButton>
              <RailButton
                ariaLabel="Edit source"
                onClick={onEditSelectedSource}
              >
                <Pencil />
              </RailButton>
              <RailButton
                ariaLabel="Open in satellite"
                onClick={onOpenSatellite}
                active
              >
                <Maximize2 />
              </RailButton>
              <RailButton
                ariaLabel="More source actions"
                onClick={() => setIsMoreOpen((current) => !current)}
              >
                <MoreHorizontal />
              </RailButton>
              {isMoreOpen ? (
                <div className="absolute right-12 bottom-0 grid w-36 gap-1 rounded-xl border border-border bg-popover/95 p-2 shadow-[0_18px_48px_rgba(18,10,10,0.5)] backdrop-blur">
                  {canCloneOrFillSelectedSource ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => {
                          setIsMoreOpen(false);
                          onCloneSelectedSource();
                        }}
                      >
                        <Copy />
                        Clone
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => {
                          setIsMoreOpen(false);
                          onFillSelectedSourceSpace();
                        }}
                      >
                        <Grid2X2 />
                        Fill
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    className="justify-start"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onRemoveSelectedSource();
                    }}
                  >
                    <Trash2 />
                    Remove
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <RailButton ariaLabel="Add source" onClick={openAddSource} active>
                <Plus />
              </RailButton>
              <RailButton ariaLabel="Hide UI" onClick={onHideUi}>
                <EyeOff />
              </RailButton>
              <RailButton
                ariaLabel="Global timer controls"
                onClick={openMobileWorkbench}
              >
                <Clock3 />
              </RailButton>
              <RailButton
                ariaLabel="Open workbench"
                onClick={openMobileWorkbench}
              >
                <SlidersHorizontal />
              </RailButton>
            </>
          )}
        </div>
      ) : null}

      <nav
        aria-label="Mobile bottom navigation"
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 items-center border-t border-border/60 bg-background/95 px-1 pt-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-18px_50px_rgba(18,10,10,0.58)] backdrop-blur md:hidden"
      >
        <Button
          type="button"
          variant="ghost"
          aria-label="Workbench"
          onClick={openMobileWorkbench}
          className={cn(
            mobileBottomButtonClass,
            isWorkbenchSheetOpen && "text-primary",
          )}
        >
          <SlidersHorizontal />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Library"
          onClick={openLibrary}
          className={mobileBottomButtonClass}
        >
          <FolderOpen />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label={accountButtonLabel}
          title={accountButtonTitle}
          onClick={openAccount}
          className={mobileBottomButtonClass}
        >
          <UserCircle />
        </Button>
      </nav>

      <Sheet open={isWorkbenchSheetOpen} onOpenChange={setIsWorkbenchSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[82dvh] overflow-y-auto rounded-t-3xl border-border/70 bg-surface px-3 pb-4 shadow-[0_-22px_74px_rgba(18,10,10,0.62)] md:hidden"
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-border" />
          <SheetHeader className="px-0 pt-0">
            <SheetTitle>Workbench</SheetTitle>
            <SheetDescription className="sr-only">
              Workspace controls
            </SheetDescription>
          </SheetHeader>
          <WorkbenchPanelContent
            mode="mobile"
            workspaceName={workspaceName}
            layoutMode={layoutMode}
            layoutModeLocked={layoutModeLocked}
            fixedGrid={fixedGrid}
            globalSeconds={globalSeconds}
            hasRunningSessionTimer={hasRunningSessionTimer}
            selected={selected}
            canCloneOrFillSelectedSource={canCloneOrFillSelectedSource}
            showAllInfo={showAllInfo}
            isClearDisabled={isClearDisabled}
            layers={layers}
            layerStats={layerStats}
            activeLayerId={activeLayerId}
            onLayoutModeChange={onLayoutModeChange}
            onFixedGridChange={onFixedGridChange}
            onGlobalTimerSecondsChange={onGlobalTimerSecondsChange}
            onGlobalTimerAction={onGlobalTimerAction}
            onCloneSelectedSource={onCloneSelectedSource}
            onFillSelectedSourceSpace={onFillSelectedSourceSpace}
            onRemoveSelectedSource={onRemoveSelectedSource}
            onSelectedTimerModeChange={onSelectedTimerModeChange}
            onSelectedTimerSecondsChange={onSelectedTimerSecondsChange}
            onSelectedMove={onSelectedMove}
            onSelectedTogglePaused={onSelectedTogglePaused}
            onSelectedRestart={onSelectedRestart}
            onEditSelectedSource={onEditSelectedSource}
            onOpenSatellite={onOpenSatellite}
            onToggleShowAllInfo={onToggleShowAllInfo}
            onHideUi={onHideUi}
            onAddSource={openAddSource}
            onOpenSaveDialog={openSaveDialog}
            onImportJson={onImportJson}
            onExportCurrentJson={onExportCurrentJson}
            onOpenClearDialog={openClearDialog}
            onSelectLayer={onSelectLayer}
            onFreeRectChange={onFreeRectChange}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function WorkbenchPanelContent({
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
  onSelectLayer,
  onFreeRectChange,
}: {
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
  onSelectLayer: (id: string) => void;
  onFreeRectChange: (id: string, patch: Partial<FreeRect>) => void;
}) {
  return (
    <div className="grid gap-4">
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
              >
                <Clock3 />
                Local timer
              </Button>
              <NumberField
                label="Local timer seconds"
                hideLabel
                value={selected.timer.durationSeconds}
                min={1}
                max={120}
                onChange={onSelectedTimerSecondsChange}
              />
              <Button
                type="button"
                variant="outline"
                aria-label="Edit selected source"
                onClick={onEditSelectedSource}
              >
                <Pencil />
                Edit
              </Button>
              <Button type="button" variant="outline" onClick={onOpenSatellite}>
                <Maximize2 />
                Focus
              </Button>
              {canCloneOrFillSelectedSource ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Clone selected source"
                    onClick={onCloneSelectedSource}
                  >
                    <Copy />
                    Clone
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Fill empty spaces with selected source"
                    onClick={onFillSelectedSourceSpace}
                  >
                    <Grid2X2 />
                    Fill
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                onClick={onRemoveSelectedSource}
                className="col-span-2"
              >
                <Trash2 />
                Remove
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
    </div>
  );
}

function PlaybackControls({
  selected,
  variant = "pill",
  className,
  onSelectedMove,
  onSelectedTogglePaused,
  onSelectedRestart,
}: {
  selected: FeedSession;
  variant?: "pill" | "panel";
  className?: string;
  onSelectedMove: (direction: 1 | -1) => void;
  onSelectedTogglePaused: () => void;
  onSelectedRestart: () => void;
}) {
  const buttonClassName = variant === "panel" ? "h-8 w-full" : undefined;
  const buttonSize = variant === "panel" ? "icon" : "icon-sm";

  return (
    <div
      aria-label="Selected source playback controls"
      className={cn(
        variant === "panel"
          ? "pointer-events-auto grid w-full grid-cols-4 gap-2"
          : "pointer-events-auto flex gap-1",
        className,
      )}
    >
      <Button
        type="button"
        size={buttonSize}
        variant="outline"
        aria-label="Back"
        onClick={() => onSelectedMove(-1)}
        className={buttonClassName}
      >
        <SkipBack />
      </Button>
      <Button
        type="button"
        size={buttonSize}
        variant="default"
        aria-label={selected.timer.isPaused ? "Play" : "Pause"}
        onClick={onSelectedTogglePaused}
        className={buttonClassName}
      >
        {selected.timer.isPaused ? <Play /> : <Pause />}
      </Button>
      <Button
        type="button"
        size={buttonSize}
        variant="outline"
        aria-label="Next"
        onClick={() => onSelectedMove(1)}
        className={buttonClassName}
      >
        <SkipForward />
      </Button>
      <Button
        type="button"
        size={buttonSize}
        variant="outline"
        aria-label="Restart"
        onClick={onSelectedRestart}
        className={buttonClassName}
      >
        <RotateCcw />
      </Button>
    </div>
  );
}

function RailButton({
  ariaLabel,
  active,
  onClick,
  children,
}: {
  ariaLabel: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "default" : "outline"}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "rounded-full shadow-[0_12px_34px_rgba(18,10,10,0.48)] backdrop-blur",
        !active && "border-border/70 bg-surface/86",
      )}
    >
      {children}
    </Button>
  );
}
