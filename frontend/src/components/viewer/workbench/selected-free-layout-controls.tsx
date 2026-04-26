import {
  MoveHorizontal,
  MoveVertical,
  UnfoldHorizontal,
  UnfoldVertical,
} from "lucide-react";

import type { FreeRect } from "@/lib/viewer/layout";
import type { FeedSession } from "./types";
import { NumberField } from "./fields";

export function SelectedFreeLayoutControls({
  selected,
  onFreeRectChange,
}: {
  selected: FeedSession;
  onFreeRectChange: (id: string, patch: Partial<FreeRect>) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Selected free layout controls"
      className="flex flex-wrap justify-center gap-2 justify-self-center md:col-start-2"
    >
      <NumberField
        label="Free column"
        icon={<MoveVertical className="size-3.5" />}
        value={selected.freeRect.column}
        min={1}
        max={16}
        onChange={(value) => onFreeRectChange(selected.id, { column: value })}
      />
      <NumberField
        label="Free row"
        icon={<MoveHorizontal className="size-3.5" />}
        value={selected.freeRect.row}
        min={1}
        max={16}
        onChange={(value) => onFreeRectChange(selected.id, { row: value })}
      />
      <NumberField
        label="Column span"
        icon={<UnfoldHorizontal className="size-3.5" />}
        value={selected.freeRect.columnSpan}
        min={1}
        max={16}
        onChange={(value) =>
          onFreeRectChange(selected.id, { columnSpan: value })
        }
      />
      <NumberField
        label="Row span"
        icon={<UnfoldVertical className="size-3.5" />}
        value={selected.freeRect.rowSpan}
        min={1}
        max={16}
        onChange={(value) => onFreeRectChange(selected.id, { rowSpan: value })}
      />
    </div>
  );
}
