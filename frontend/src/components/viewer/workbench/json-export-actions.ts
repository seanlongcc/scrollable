import { safeFileName } from "./cloud-save-helpers";
import type { SerializedWorkspace, SerializedWorkspaceTemplate } from "./types";

export type ScrollableJsonKind = "layout" | "template";

export function downloadScrollableJson({
  kind,
  name,
  item,
}: {
  kind: ScrollableJsonKind;
  name: string;
  item: SerializedWorkspace | SerializedWorkspaceTemplate;
}) {
  const payload = {
    type: kind === "layout" ? "scrollable.layout.v1" : "scrollable.template.v1",
    item,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(name)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function localFilesOmittedDescription() {
  return "Local uploads stay in this browser and become empty boxes.";
}
