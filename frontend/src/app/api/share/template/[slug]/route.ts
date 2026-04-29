import { NextResponse } from "next/server";

import { getSharedTemplateMetadata } from "@/lib/data/share";
import type { SerializedWorkspaceTemplate } from "@/components/viewer/workbench/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const shared = await getSharedTemplateMetadata(slug);

  if (shared.status !== "ok") {
    return NextResponse.json(shared, {
      status: shared.status === "unconfigured" ? 503 : 404,
    });
  }

  const template: SerializedWorkspaceTemplate = {
    id: shared.template.id,
    name: shared.template.name,
    layers: Array.isArray(shared.template.layers)
      ? (shared.template.layers as SerializedWorkspaceTemplate["layers"])
      : [{ id: "layer-1", name: "Layer 1" }],
    activeLayerId: shared.template.active_layer_id,
    globalTimerSeconds: shared.template.global_timer_seconds,
    slots: Array.isArray(shared.template.slots)
      ? (shared.template.slots as SerializedWorkspaceTemplate["slots"])
      : [],
    updatedAt: shared.template.updated_at,
  };

  return NextResponse.json({ status: "ok", template });
}
