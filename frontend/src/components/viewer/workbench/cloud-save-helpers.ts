import { limitLayoutName } from "./helpers";
import type { SerializedWorkspaceTemplate } from "./types";

export function uniqueTemplateCopyName(
  baseName: string,
  templates: Record<string, SerializedWorkspaceTemplate>,
) {
  const normalized = (name: string) =>
    name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  const base = limitLayoutName(baseName.trim() || "Template");
  const used = new Set(
    Object.values(templates).map((template) => normalized(template.name)),
  );

  if (!used.has(normalized(base))) return base;

  let index = 1;
  while (used.has(normalized(limitLayoutName(`${base} copy ${index}`)))) {
    index += 1;
  }

  return limitLayoutName(`${base} copy ${index}`);
}

export function safeFileName(name: string) {
  return (
    name
      .trim()
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "scrollable-save"
  );
}
