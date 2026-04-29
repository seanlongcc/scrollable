import { NextResponse } from "next/server";

import { getSharedLayoutMetadata } from "@/lib/data/share";
import type { SerializedWorkspace } from "@/components/viewer/workbench/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const shared = await getSharedLayoutMetadata(slug);

  if (shared.status !== "ok") {
    return NextResponse.json(shared, {
      status: shared.status === "unconfigured" ? 503 : 404,
    });
  }

  const workspace: SerializedWorkspace = {
    id: shared.layout.id,
    name: shared.layout.name,
    layers: Array.isArray(shared.layout.layers)
      ? (shared.layout.layers as SerializedWorkspace["layers"])
      : [{ id: "layer-1", name: "Layer 1" }],
    activeLayerId: shared.layout.active_layer_id,
    layoutMode: shared.layout.layout_mode,
    fixedGrid: {
      columns: shared.layout.fixed_columns,
      rows: shared.layout.fixed_rows,
    },
    globalTimerSeconds: shared.layout.global_timer_seconds,
    sessions: Array.isArray(shared.layout.sessions)
      ? (shared.layout.sessions as unknown as SerializedWorkspace["sessions"])
      : [],
    templateSlots: Array.isArray(shared.layout.template_slots)
      ? (shared.layout
          .template_slots as unknown as SerializedWorkspace["templateSlots"])
      : [],
    updatedAt: shared.layout.updated_at,
  };

  return NextResponse.json({ status: "ok", workspace });
}
