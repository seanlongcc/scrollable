import {
  Clock3,
  Copy,
  EyeOff,
  FolderOpenDot,
  Grid2X2,
  Library,
  Maximize2,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  UserCircle,
} from "lucide-react";
import {
  Suspense,
  lazy,
  type ComponentType,
  type ReactNode,
  useState,
  useSyncExternalStore,
} from "react";

import { Button } from "@/components/ui/button";
import type { FixedGrid, FreeRect } from "@/lib/viewer/layout";
import type { TimerMode } from "@/lib/viewer/timer";
import { cn } from "@/lib/utils";
import type { LayerStats } from "./selection-state";
import type { FeedSession, LayoutMode, WorkspaceLayer } from "./types";
import type {
  WorkbenchPanelContentProps,
  WorkbenchPanelSheetProps,
} from "./workbench-panel";
import { PlaybackControls } from "./workbench-playback-controls";
import type { GlobalTimerAction } from "./workbench-toolbar";

const LazyWorkbenchPanelContent = lazy(() =>
  import("./workbench-panel").then((module) => ({
    default: module.WorkbenchPanelContent,
  })),
);
const LazyWorkbenchPanelSheet = lazy(() =>
  import("./workbench-panel").then((module) => ({
    default: module.WorkbenchPanelSheet,
  })),
);
const DESKTOP_WORKBENCH_QUERY = "(min-width: 768px)";

export type WorkbenchChromeProps = {
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
  onOpenWorkspace: () => void;
  onOpenSaveDialog: () => void;
  onImportJson: () => void;
  onExportCurrentJson: () => void;
  onOpenClearDialog: () => void;
  onOpenAccount: () => void;
  onPreloadOverlays?: () => void;
  workbenchPanelComponents?: WorkbenchPanelComponents;
  onDesktopWorkbenchCollapsedChange: (collapsed: boolean) => void;
  onSelectLayer: (id: string) => void;
  onFreeRectChange: (id: string, patch: Partial<FreeRect>) => void;
};

export type WorkbenchPanelComponents = {
  Content?: ComponentType<WorkbenchPanelContentProps>;
  Sheet?: ComponentType<WorkbenchPanelSheetProps>;
};

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
  onOpenWorkspace,
  onOpenSaveDialog,
  onImportJson,
  onExportCurrentJson,
  onOpenClearDialog,
  onOpenAccount,
  onPreloadOverlays,
  workbenchPanelComponents,
  onDesktopWorkbenchCollapsedChange,
  onSelectLayer,
  onFreeRectChange,
}: WorkbenchChromeProps) {
  const [isWorkbenchSheetOpen, setIsWorkbenchSheetOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isDesktopWorkbenchViewport = useDesktopWorkbenchViewport();
  const WorkbenchPanelContentComponent =
    workbenchPanelComponents?.Content ?? LazyWorkbenchPanelContent;
  const WorkbenchPanelSheetComponent =
    workbenchPanelComponents?.Sheet ?? LazyWorkbenchPanelSheet;
  const controlsHidden = isAnySheetOpen || isWorkbenchSheetOpen;
  const showPlaybackPill = Boolean(selected) && !controlsHidden;
  const desktopWorkbenchButtonLabel = isDesktopWorkbenchCollapsed
    ? "Open workbench"
    : "Collapse workbench";
  const mobileBottomButtonClass =
    "h-12 w-full rounded-none border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-transparent hover:text-primary focus-visible:ring-2 [&_svg:not([class*='size-'])]:size-5";
  const desktopRailButtonClass =
    "h-10 w-full rounded-xl shadow-[0_10px_26px_rgba(18,10,10,0.34)]";
  const panelProps = {
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
    onAddSource: openAddSource,
    onOpenSaveDialog: openSaveDialog,
    onImportJson,
    onExportCurrentJson,
    onOpenClearDialog: openClearDialog,
    onPreloadOverlays,
    onSelectLayer,
    onFreeRectChange,
  } satisfies Omit<WorkbenchPanelContentProps, "mode">;

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

  function openWorkspace() {
    closeMobileChrome();
    onOpenWorkspace();
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
            isDesktopWorkbenchCollapsed ? "grid-cols-1" : "grid-cols-4",
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
            onMouseEnter={onPreloadOverlays}
            onFocus={onPreloadOverlays}
            onClick={openLibrary}
            className={desktopRailButtonClass}
          >
            <Library />
          </Button>
          <Button
            type="button"
            size="icon-lg"
            variant="outline"
            aria-label="Workspace"
            onMouseEnter={onPreloadOverlays}
            onFocus={onPreloadOverlays}
            onClick={openWorkspace}
            className={desktopRailButtonClass}
          >
            <FolderOpenDot />
          </Button>
          <Button
            type="button"
            size="icon-lg"
            variant="outline"
            aria-label={accountButtonLabel}
            title={accountButtonTitle}
            onMouseEnter={onPreloadOverlays}
            onFocus={onPreloadOverlays}
            onClick={openAccount}
            className={desktopRailButtonClass}
          >
            <UserCircle />
          </Button>
        </nav>

        {isDesktopWorkbenchCollapsed || !isDesktopWorkbenchViewport ? (
          <div id="desktop-workbench-panel" hidden />
        ) : (
          <div
            id="desktop-workbench-panel"
            className="min-h-0 overflow-y-auto rounded-xl border border-border/70 bg-surface/90 p-3 shadow-[0_18px_54px_rgba(18,10,10,0.42)] backdrop-blur-sm"
          >
            <Suspense fallback={null}>
              <WorkbenchPanelContentComponent mode="desktop" {...panelProps} />
            </Suspense>
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
                <div className="absolute right-12 bottom-0 grid w-[min(12rem,calc(100vw-5rem))] gap-1 rounded-xl border border-border/80 bg-popover/96 p-2 shadow-[0_16px_44px_rgba(18,10,10,0.48)] backdrop-blur-sm">
                  {canCloneOrFillSelectedSource ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-w-0 justify-start"
                        onClick={() => {
                          setIsMoreOpen(false);
                          onCloneSelectedSource();
                        }}
                      >
                        <Copy />
                        <span className="min-w-0 truncate">Clone</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-w-0 justify-start"
                        onClick={() => {
                          setIsMoreOpen(false);
                          onFillSelectedSourceSpace();
                        }}
                      >
                        <Grid2X2 />
                        <span className="min-w-0 truncate">Fill</span>
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-w-0 justify-start"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onRemoveSelectedSource();
                    }}
                  >
                    <Trash2 />
                    <span className="min-w-0 truncate">Remove</span>
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <RailButton
                ariaLabel="Add source"
                onClick={openAddSource}
                onPreload={onPreloadOverlays}
                active
              >
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
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 items-center border-t border-border/70 bg-background/97 px-1 pt-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-14px_42px_rgba(18,10,10,0.54)] backdrop-blur-sm md:hidden"
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
          onMouseEnter={onPreloadOverlays}
          onFocus={onPreloadOverlays}
          onClick={openLibrary}
          className={mobileBottomButtonClass}
        >
          <Library />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Workspace"
          onMouseEnter={onPreloadOverlays}
          onFocus={onPreloadOverlays}
          onClick={openWorkspace}
          className={mobileBottomButtonClass}
        >
          <FolderOpenDot />
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label={accountButtonLabel}
          title={accountButtonTitle}
          onMouseEnter={onPreloadOverlays}
          onFocus={onPreloadOverlays}
          onClick={openAccount}
          className={mobileBottomButtonClass}
        >
          <UserCircle />
        </Button>
      </nav>

      {isWorkbenchSheetOpen ? (
        <Suspense fallback={null}>
          <WorkbenchPanelSheetComponent
            open={isWorkbenchSheetOpen}
            onOpenChange={setIsWorkbenchSheetOpen}
            {...panelProps}
          />
        </Suspense>
      ) : null}
    </>
  );
}

function useDesktopWorkbenchViewport() {
  return useSyncExternalStore(
    subscribeDesktopWorkbenchViewport,
    getDesktopWorkbenchViewportSnapshot,
    getServerDesktopWorkbenchViewportSnapshot,
  );
}

function subscribeDesktopWorkbenchViewport(onStoreChange: () => void) {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {};
  }

  const query = window.matchMedia(DESKTOP_WORKBENCH_QUERY);

  query.addEventListener("change", onStoreChange);

  return () => query.removeEventListener("change", onStoreChange);
}

function getDesktopWorkbenchViewportSnapshot() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return true;

  return window.matchMedia(DESKTOP_WORKBENCH_QUERY).matches;
}

function getServerDesktopWorkbenchViewportSnapshot() {
  return false;
}

function RailButton({
  ariaLabel,
  active,
  onClick,
  onPreload,
  children,
}: {
  ariaLabel: string;
  active?: boolean;
  onClick: () => void;
  onPreload?: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "default" : "outline"}
      aria-label={ariaLabel}
      onMouseEnter={onPreload}
      onPointerDown={onPreload}
      onFocus={onPreload}
      onClick={onClick}
      className={cn(
        "rounded-full shadow-[0_10px_30px_rgba(18,10,10,0.44)] backdrop-blur-sm",
        !active && "border-border/70 bg-surface/92",
      )}
    >
      {children}
    </Button>
  );
}
