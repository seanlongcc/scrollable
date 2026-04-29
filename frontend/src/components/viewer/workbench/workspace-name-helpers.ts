import type {
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";
import { MAX_LAYOUT_NAME_LENGTH } from "./types";

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2)}`;
}

export function nextLayoutName(
  tabs: WorkspaceTab[],
  savedWorkspaces: Record<string, SerializedWorkspace>,
) {
  const usedNames = new Set([
    ...tabs.map((tab) => normalizeLayoutName(tab.name)),
    ...Object.values(savedWorkspaces).map((workspace) =>
      normalizeLayoutName(workspace.name),
    ),
  ]);
  let index = 1;

  while (usedNames.has(normalizeLayoutName(`Layout ${index}`))) {
    index += 1;
  }

  return `Layout ${index}`;
}

export function uniqueWorkspaceName(
  baseName: string,
  tabs: WorkspaceTab[],
  savedWorkspaces: Record<string, SerializedWorkspace>,
) {
  const trimmedBase = limitLayoutName(baseName.trim() || "Layout");
  const usedNames = new Set([
    ...tabs.map((tab) => normalizeLayoutName(tab.name)),
    ...Object.values(savedWorkspaces).map((workspace) =>
      normalizeLayoutName(workspace.name),
    ),
  ]);

  if (!usedNames.has(normalizeLayoutName(trimmedBase))) return trimmedBase;

  let index = 2;
  while (
    usedNames.has(
      normalizeLayoutName(limitLayoutName(`${trimmedBase} ${index}`)),
    )
  ) {
    index += 1;
  }

  return limitLayoutName(`${trimmedBase} ${index}`);
}

export function hasDuplicateLayoutName(
  name: string,
  currentId: string,
  tabs: WorkspaceTab[],
  savedWorkspaces: Record<string, SerializedWorkspace>,
) {
  const normalized = normalizeLayoutName(name);

  return (
    tabs.some(
      (tab) =>
        tab.id !== currentId && normalizeLayoutName(tab.name) === normalized,
    ) ||
    Object.values(savedWorkspaces).some(
      (workspace) =>
        workspace.id !== currentId &&
        normalizeLayoutName(workspace.name) === normalized,
    )
  );
}

export function hasDuplicateTemplateName(
  name: string,
  currentId: string,
  savedTemplates: Record<string, SerializedWorkspaceTemplate>,
) {
  const normalized = normalizeLayoutName(name);

  return Object.values(savedTemplates).some(
    (template) =>
      template.id !== currentId &&
      normalizeLayoutName(template.name) === normalized,
  );
}

export function normalizeLayoutName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function limitLayoutName(name: string) {
  return name.slice(0, MAX_LAYOUT_NAME_LENGTH);
}

export function normalizeLegacyLayoutName(name: string) {
  return name.replace(/^Session(\s+\d+)$/i, "Layout$1");
}

export function normalizeStoredLayoutNames(
  workspaces: SerializedWorkspace[],
  startIndex = 1,
) {
  const allDefaultNames = workspaces.every((workspace) =>
    /^Layout\s+\d+$/i.test(workspace.name.trim()),
  );

  if (!allDefaultNames) return workspaces;

  return workspaces.map((workspace, index) => ({
    ...workspace,
    name: `Layout ${index + startIndex}`,
  }));
}
