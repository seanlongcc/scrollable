import type {
  RuntimeWorkspace,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";
import {
  validateLayoutRenameName,
  validateTemplateRenameName,
} from "./workspace-save-state";

type RenameResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function prepareSavedWorkspaceRename({
  id,
  name,
  workspaceTabs,
  workspaceStates,
  savedWorkspaces,
}: {
  id: string;
  name: string;
  workspaceTabs: WorkspaceTab[];
  workspaceStates: Record<string, RuntimeWorkspace>;
  savedWorkspaces: Record<string, SerializedWorkspace>;
}): RenameResult<{
  renamed: SerializedWorkspace;
  nextTabs: WorkspaceTab[];
  nextStates: Record<string, RuntimeWorkspace>;
}> {
  const workspace = savedWorkspaces[id];
  if (!workspace) return { ok: false, error: "Layout unavailable" };

  const validation = validateLayoutRenameName({
    name,
    id,
    workspaceTabs,
    savedWorkspaces,
  });
  if (!validation.ok) return validation;

  const renamed = {
    ...workspace,
    name: validation.name,
    updatedAt: new Date().toISOString(),
  };
  const nextTabs = workspaceTabs.map((tab) =>
    tab.id === id ? { ...tab, name: validation.name } : tab,
  );
  const nextStates = renameWorkspaceState({
    id,
    name: validation.name,
    workspaceStates,
  });

  return { ok: true, value: { renamed, nextTabs, nextStates } };
}

export function prepareSavedTemplateRename({
  id,
  name,
  savedTemplates,
}: {
  id: string;
  name: string;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
}): RenameResult<{ renamed: SerializedWorkspaceTemplate }> {
  const template = savedTemplates[id];
  if (!template) return { ok: false, error: "Template unavailable" };

  const validation = validateTemplateRenameName({
    name,
    id,
    savedTemplates,
  });
  if (!validation.ok) return validation;

  return {
    ok: true,
    value: {
      renamed: {
        ...template,
        name: validation.name,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

function renameWorkspaceState({
  id,
  name,
  workspaceStates,
}: {
  id: string;
  name: string;
  workspaceStates: Record<string, RuntimeWorkspace>;
}) {
  const workspace = workspaceStates[id];
  if (!workspace) return workspaceStates;

  return {
    ...workspaceStates,
    [id]: { ...workspace, name },
  };
}
