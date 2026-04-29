import {
  ChevronDown,
  Clock3,
  Download,
  EyeOff,
  Grid2X2,
  Info,
  LayoutGrid,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  SkipForward,
  Trash2,
  UnfoldHorizontal,
  UnfoldVertical,
  Upload,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import type { FixedGrid } from "@/lib/viewer/layout";
import { cn } from "@/lib/utils";
import { NumberField } from "./fields";
import type { LayerStats } from "./selection-state";
import type { LayoutMode, WorkspaceLayer } from "./types";
import type { GlobalTimerAction } from "./workbench-toolbar";

const sectionHeadingClass =
  "font-mono text-[10px] font-semibold tracking-normal text-muted-foreground uppercase";

export function WorkbenchPanelDisclosure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="grid gap-2 border-t border-border/70 pt-3">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        className="h-12 w-full justify-between rounded-2xl px-3 md:h-8"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </Button>
      {open ? <div className="grid gap-4 pt-1">{children}</div> : null}
    </section>
  );
}

export function LayoutModeSection({
  layoutMode,
  layoutModeLocked,
  onLayoutModeChange,
}: {
  layoutMode: LayoutMode;
  layoutModeLocked: boolean;
  onLayoutModeChange: (mode: LayoutMode) => void;
}) {
  return (
    <section className="grid gap-2">
      <h2 className={sectionHeadingClass}>Layout mode</h2>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant={layoutMode === "fixed" ? "default" : "outline"}
          aria-label="Fixed layout mode"
          disabled={layoutModeLocked}
          onClick={() => onLayoutModeChange("fixed")}
        >
          <Grid2X2 />
          Fixed
        </Button>
        <Button
          type="button"
          size="sm"
          variant={layoutMode === "free" ? "default" : "outline"}
          aria-label="Free layout mode"
          disabled={layoutModeLocked}
          onClick={() => onLayoutModeChange("free")}
        >
          <LayoutGrid />
          Free
        </Button>
      </div>
    </section>
  );
}

export function LayerSection({
  layers,
  layerStats,
  activeLayerId,
  onSelectLayer,
}: {
  layers: WorkspaceLayer[];
  layerStats: LayerStats[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
}) {
  return (
    <section className="grid gap-2">
      <h2 className={sectionHeadingClass}>Layer</h2>
      <div
        role="group"
        aria-label="Layout layers"
        className="grid grid-cols-3 gap-1 border-b border-border/70 pb-2"
      >
        {layers.map((layer) => (
          <Button
            key={layer.id}
            type="button"
            size="sm"
            variant={layer.id === activeLayerId ? "default" : "ghost"}
            aria-label={`Select ${layer.name}`}
            aria-pressed={layer.id === activeLayerId}
            onClick={() => onSelectLayer(layer.id)}
          >
            {layer.name}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {layerStats.map((layer) => (
          <div
            key={layer.id}
            className={cn(
              "min-w-0 px-1.5 py-0.5 font-mono text-[10px] leading-4 text-muted-foreground",
              layer.id === activeLayerId && "text-foreground",
            )}
          >
            <div className="truncate">
              {layer.sourceCount} source{layer.sourceCount === 1 ? "" : "s"}
            </div>
            <div className="truncate">
              {layer.fileCount} file{layer.fileCount === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function GridSection({
  fixedGrid,
  onFixedGridChange,
}: {
  fixedGrid: FixedGrid;
  onFixedGridChange: (patch: Partial<FixedGrid>) => void;
}) {
  return (
    <section className="grid gap-2">
      <h2 className={sectionHeadingClass}>Grid</h2>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Columns"
          icon={<UnfoldHorizontal className="size-3.5" />}
          value={fixedGrid.columns}
          min={1}
          max={16}
          commitOnBlur
          className="min-w-0"
          inputClassName="w-full min-w-0 flex-1"
          onChange={(value) => onFixedGridChange({ columns: value })}
        />
        <NumberField
          label="Rows"
          icon={<UnfoldVertical className="size-3.5" />}
          value={fixedGrid.rows}
          min={1}
          max={16}
          commitOnBlur
          className="min-w-0"
          inputClassName="w-full min-w-0 flex-1"
          onChange={(value) => onFixedGridChange({ rows: value })}
        />
      </div>
    </section>
  );
}

export function GlobalTimerSection({
  mode,
  globalSeconds,
  hasRunningSessionTimer,
  onGlobalTimerSecondsChange,
  onGlobalTimerAction,
}: {
  mode: "mobile" | "desktop";
  globalSeconds: number;
  hasRunningSessionTimer: boolean;
  onGlobalTimerSecondsChange: (seconds: number) => void;
  onGlobalTimerAction: (action: GlobalTimerAction) => void;
}) {
  return (
    <section className="grid gap-2">
      <h2 className={sectionHeadingClass}>Global timer</h2>
      <div
        className={cn(
          mode === "desktop"
            ? "grid grid-cols-[3fr_repeat(3,minmax(0,1fr))] items-center gap-2"
            : "grid grid-cols-[minmax(0,3fr)_repeat(3,minmax(0,1fr))] items-center gap-2",
        )}
      >
        <NumberField
          label="Global timer seconds"
          icon={<Clock3 className="size-3.5" />}
          value={globalSeconds}
          min={1}
          max={120}
          className="min-w-0"
          inputClassName="w-full min-w-0 flex-1"
          onChange={onGlobalTimerSecondsChange}
        />
        <Button
          type="button"
          size={mode === "desktop" ? "icon" : "icon-sm"}
          variant="outline"
          aria-label="Global pause"
          onClick={() => onGlobalTimerAction("pause")}
          className="h-11 min-h-0 min-w-0 w-full md:h-8"
        >
          {hasRunningSessionTimer ? <Pause /> : <Play />}
        </Button>
        <Button
          type="button"
          size={mode === "desktop" ? "icon" : "icon-sm"}
          variant="outline"
          aria-label="Global next"
          onClick={() => onGlobalTimerAction("next")}
          className="h-11 min-h-0 min-w-0 w-full md:h-8"
        >
          <SkipForward />
        </Button>
        <Button
          type="button"
          size={mode === "desktop" ? "icon" : "icon-sm"}
          variant="outline"
          aria-label="Global restart"
          onClick={() => onGlobalTimerAction("restart")}
          className="h-11 min-h-0 min-w-0 w-full md:h-8"
        >
          <RotateCcw />
        </Button>
      </div>
    </section>
  );
}

export function ActionsSection({
  showAllInfo,
  isClearDisabled,
  onAddSource,
  onHideUi,
  onToggleShowAllInfo,
  onOpenSaveDialog,
  onImportJson,
  onExportCurrentJson,
  onOpenClearDialog,
}: {
  showAllInfo: boolean;
  isClearDisabled: boolean;
  onAddSource: () => void;
  onHideUi: () => void;
  onToggleShowAllInfo: () => void;
  onOpenSaveDialog: () => void;
  onImportJson: () => void;
  onExportCurrentJson: () => void;
  onOpenClearDialog: () => void;
}) {
  const infoLabel = showAllInfo ? "Hide info" : "Show info";
  const actionButtonClass =
    "h-10 min-h-10 text-[0.78rem] font-normal md:h-8 md:min-h-0 md:text-xs md:font-medium";

  return (
    <section className="grid gap-2">
      <h2 className={sectionHeadingClass}>Actions</h2>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onAddSource}
          className={actionButtonClass}
        >
          <Plus />
          Add source
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onHideUi}
          className={actionButtonClass}
        >
          <EyeOff />
          Hide UI
        </Button>
        <Button
          type="button"
          variant={showAllInfo ? "default" : "outline"}
          onClick={onToggleShowAllInfo}
          className={actionButtonClass}
        >
          <Info />
          {infoLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onOpenSaveDialog}
          className={actionButtonClass}
        >
          <Save />
          Save layout
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label="Import JSON"
          onClick={onImportJson}
          className={actionButtonClass}
        >
          <Upload />
          Import JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label="Export JSON"
          onClick={onExportCurrentJson}
          className={actionButtonClass}
        >
          <Download />
          Export JSON
        </Button>
        {!isClearDisabled ? (
          <Button
            type="button"
            variant="destructive"
            aria-label="Clear layout"
            onClick={onOpenClearDialog}
            className={cn("col-span-2", actionButtonClass)}
          >
            <Trash2 />
            Clear
          </Button>
        ) : null}
      </div>
    </section>
  );
}
