import {
  Copy,
  EyeOff,
  Globe,
  Grid2X2,
  Info,
  LayoutGrid,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  UnfoldHorizontal,
  UnfoldVertical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { FixedGrid } from "@/lib/viewer/layout";
import type { LayoutMode } from "./types";
import { NumberField } from "./fields";

export type GlobalTimerAction = "next" | "pause" | "restart";

export function WorkbenchToolbar({
  layoutMode,
  layoutModeLocked,
  fixedGrid,
  globalSeconds,
  hasRunningSessionTimer,
  showDuplicateButton,
  showAllInfo,
  onLayoutModeChange,
  onFixedGridChange,
  onGlobalTimerSecondsChange,
  onGlobalTimerAction,
  onDuplicateSelectedSource,
  onToggleShowAllInfo,
  onHideUi,
  onAddSource,
}: {
  layoutMode: LayoutMode;
  layoutModeLocked: boolean;
  fixedGrid: FixedGrid;
  globalSeconds: number;
  hasRunningSessionTimer: boolean;
  showDuplicateButton: boolean;
  showAllInfo: boolean;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onFixedGridChange: (patch: Partial<FixedGrid>) => void;
  onGlobalTimerSecondsChange: (seconds: number) => void;
  onGlobalTimerAction: (action: GlobalTimerAction) => void;
  onDuplicateSelectedSource: () => void;
  onToggleShowAllInfo: () => void;
  onHideUi: () => void;
  onAddSource: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        type="button"
        size="icon"
        variant={layoutMode === "fixed" ? "default" : "outline"}
        onClick={() => onLayoutModeChange("fixed")}
        aria-label="Fixed layout mode"
        disabled={layoutModeLocked}
      >
        <Grid2X2 />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={layoutMode === "free" ? "default" : "outline"}
        onClick={() => onLayoutModeChange("free")}
        aria-label="Free layout mode"
        disabled={layoutModeLocked}
      >
        <LayoutGrid />
      </Button>

      <NumberField
        label="Fixed columns"
        icon={<UnfoldHorizontal className="size-3.5" />}
        value={fixedGrid.columns}
        min={1}
        max={16}
        onChange={(value) => onFixedGridChange({ columns: value })}
      />
      <NumberField
        label="Fixed rows"
        icon={<UnfoldVertical className="size-3.5" />}
        value={fixedGrid.rows}
        min={1}
        max={16}
        onChange={(value) => onFixedGridChange({ rows: value })}
      />

      <div className="flex h-8 items-center gap-1 rounded-lg border border-border/70 bg-surface-elevated/70 px-1">
        <Globe className="size-3.5 text-primary" />
        <input
          type="number"
          value={globalSeconds}
          min={1}
          max={120}
          onChange={(event) =>
            onGlobalTimerSecondsChange(Number(event.target.value))
          }
          aria-label="Global timer seconds"
          className="h-6 w-11 rounded-md border border-border/70 bg-background/70 px-1 text-center font-mono text-[11px] text-foreground outline-none focus-visible:border-primary"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => onGlobalTimerAction("pause")}
          aria-label="Global pause"
        >
          {hasRunningSessionTimer ? <Pause /> : <Play />}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => onGlobalTimerAction("next")}
          aria-label="Global next"
        >
          <SkipForward />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => onGlobalTimerAction("restart")}
          aria-label="Global restart"
        >
          <RotateCcw />
        </Button>
      </div>

      {showDuplicateButton ? (
        <Button
          type="button"
          variant="outline"
          onClick={onDuplicateSelectedSource}
          aria-label="Duplicate selected source into empty cells"
        >
          <Copy />
          Duplicate
        </Button>
      ) : null}
      <Button
        type="button"
        size="icon"
        variant={showAllInfo ? "default" : "outline"}
        aria-label={showAllInfo ? "Hide source info" : "Show source info"}
        onClick={onToggleShowAllInfo}
      >
        <Info />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={onHideUi}
        aria-label="Hide UI"
      >
        <EyeOff />
      </Button>
      <Button type="button" aria-label="Add source" onClick={onAddSource}>
        <Plus />
        Add source
      </Button>
    </div>
  );
}
