import { Layers, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LayoutMode, WorkspaceLayer } from "./types";
import type { LayerStats } from "./selection-state";

export function LayerToolbar({
  sourceCount,
  layoutMode,
  layers,
  activeLayerId,
  layerStats,
  hiddenFixedSessionCount,
  isAddLayerDisabled,
  isDeleteLayerDisabled,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
}: {
  sourceCount: number;
  layoutMode: LayoutMode;
  layers: WorkspaceLayer[];
  activeLayerId: string;
  layerStats: LayerStats[];
  hiddenFixedSessionCount: number;
  isAddLayerDisabled: boolean;
  isDeleteLayerDisabled: boolean;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground md:justify-self-start">
      <span>
        {sourceCount} source{sourceCount === 1 ? "" : "s"} active ·{" "}
        {layoutMode === "fixed" ? "Fixed" : "Free"} layout
      </span>
      <div
        role="group"
        aria-label="Layout layers"
        className="flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-surface-elevated/70 p-1"
      >
        <Layers className="size-3.5 text-primary" />
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
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Add layer"
          onClick={onAddLayer}
          disabled={isAddLayerDisabled}
        >
          <Plus />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Delete active layer"
          onClick={onDeleteLayer}
          disabled={isDeleteLayerDisabled}
        >
          <Trash2 />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1 text-[11px]">
        {layerStats.map((layer) => (
          <span
            key={layer.id}
            className={cn(
              "rounded-full border border-border/70 bg-background/60 px-2 py-0.5",
              layer.id === activeLayerId && "border-primary/50 text-primary",
            )}
          >
            {layer.name}: {layer.sourceCount} source
            {layer.sourceCount === 1 ? "" : "s"} / {layer.fileCount} file
            {layer.fileCount === 1 ? "" : "s"}
          </span>
        ))}
      </div>
      {hiddenFixedSessionCount ? (
        <span className="rounded-full border border-primary/35 bg-surface-elevated px-2 py-0.5 text-xs text-primary">
          {hiddenFixedSessionCount} hidden source
          {hiddenFixedSessionCount === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}
