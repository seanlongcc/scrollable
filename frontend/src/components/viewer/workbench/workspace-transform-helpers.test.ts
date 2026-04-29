import { describe, expect, it } from "vitest";

import type { SerializedWorkspace, WorkspaceTemplateSlot } from "./types";
import { toRuntimeWorkspace } from "./workspace-transform-helpers";

describe("workspace transform helpers", () => {
  it("restores serialized free-layout empty boxes into runtime workspace state", () => {
    const templateSlots: WorkspaceTemplateSlot[] = [
      {
        id: "slot-1",
        layerId: "layer-1",
        freeRect: { column: 5, row: 5, columnSpan: 4, rowSpan: 4 },
      },
    ];
    const workspace = {
      id: "workspace-1",
      name: "Free layout",
      layers: [{ id: "layer-1", name: "Layer 1" }],
      activeLayerId: "layer-1",
      layoutMode: "free",
      fixedGrid: { columns: 2, rows: 1 },
      globalTimerSeconds: 10,
      sessions: [],
      templateSlots,
      updatedAt: "2026-04-28T00:00:00.000Z",
    } as SerializedWorkspace & { templateSlots: WorkspaceTemplateSlot[] };

    expect(toRuntimeWorkspace(workspace).templateSlots).toEqual(templateSlots);
  });
});
