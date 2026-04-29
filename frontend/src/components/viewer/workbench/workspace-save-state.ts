import type { Json } from "@/lib/supabase/database.types";
import {
  hasDuplicateLayoutName,
  hasDuplicateTemplateName,
  limitLayoutName,
} from "./helpers";
import { serializedMetadataBytes } from "./cloud-save-state";
import type {
  LayoutMode,
  SaveKind,
  SerializedWorkspace,
  SerializedWorkspaceTemplate,
  WorkspaceTab,
} from "./types";
import { MAX_LAYOUT_NAME_LENGTH } from "./types";

type SaveValidationResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

export function openSaveDialogState(workspaceName: string): {
  saveName: string;
  saveKind: SaveKind;
  saveError: null;
  isSaveOpen: true;
} {
  return {
    saveName: limitLayoutName(workspaceName),
    saveKind: "layout",
    saveError: null,
    isSaveOpen: true,
  };
}

export function validateLayoutSaveName({
  name,
  activeWorkspaceId,
  workspaceTabs,
  savedWorkspaces,
}: {
  name: string;
  activeWorkspaceId: string;
  workspaceTabs: WorkspaceTab[];
  savedWorkspaces: Record<string, SerializedWorkspace>;
}): SaveValidationResult {
  const nextName = name.trim();

  if (!nextName) {
    return { ok: false, error: "Layout name is required" };
  }

  if (nextName.length > MAX_LAYOUT_NAME_LENGTH) {
    return {
      ok: false,
      error: `Layout name must be ${MAX_LAYOUT_NAME_LENGTH} characters or fewer`,
    };
  }

  if (
    hasDuplicateLayoutName(
      nextName,
      activeWorkspaceId,
      workspaceTabs,
      savedWorkspaces,
    )
  ) {
    return { ok: false, error: "Layout names must be unique" };
  }

  return { ok: true, name: nextName };
}

export function validateTemplateSaveName({
  name,
  activeWorkspaceId,
  layoutMode,
  savedTemplates,
}: {
  name: string;
  activeWorkspaceId: string;
  layoutMode: LayoutMode;
  savedTemplates: Record<string, SerializedWorkspaceTemplate>;
}): SaveValidationResult {
  const nextName = name.trim();

  if (layoutMode !== "free") {
    return {
      ok: false,
      error: "Templates are only available for free layouts",
    };
  }

  if (!nextName) {
    return { ok: false, error: "Template name is required" };
  }

  if (nextName.length > MAX_LAYOUT_NAME_LENGTH) {
    return {
      ok: false,
      error: `Template name must be ${MAX_LAYOUT_NAME_LENGTH} characters or fewer`,
    };
  }

  if (hasDuplicateTemplateName(nextName, activeWorkspaceId, savedTemplates)) {
    return { ok: false, error: "Template names must be unique" };
  }

  return { ok: true, name: nextName };
}

export function renameActiveWorkspaceTab({
  workspaceTabs,
  activeWorkspaceId,
  name,
}: {
  workspaceTabs: WorkspaceTab[];
  activeWorkspaceId: string;
  name: string;
}) {
  return workspaceTabs.map((tab) =>
    tab.id === activeWorkspaceId ? { ...tab, name } : tab,
  );
}

export function buildViewerSessionUpsertRows({
  workspaces,
  userId,
  updatedAt,
}: {
  workspaces: SerializedWorkspace[];
  userId: string;
  updatedAt?: string;
}) {
  return workspaces.map((workspace) => ({
    id: workspace.id,
    owner_id: userId,
    name: workspace.name,
    layers: workspace.layers as unknown as Json,
    active_layer_id: workspace.activeLayerId,
    layout_mode: workspace.layoutMode,
    fixed_columns: workspace.fixedGrid.columns,
    fixed_rows: workspace.fixedGrid.rows,
    global_timer_seconds: workspace.globalTimerSeconds,
    sessions: workspace.sessions as unknown as Json,
    template_slots: (workspace.templateSlots ?? []) as unknown as Json,
    metadata_bytes: serializedMetadataBytes(workspace),
    updated_at: updatedAt ?? new Date().toISOString(),
  }));
}

export function buildViewerTemplateUpsertRows({
  templates,
  userId,
  updatedAt,
}: {
  templates: SerializedWorkspaceTemplate[];
  userId: string;
  updatedAt?: string;
}) {
  return templates.map((template) => ({
    id: template.id,
    owner_id: userId,
    name: template.name,
    layers: template.layers as unknown as Json,
    active_layer_id: template.activeLayerId,
    global_timer_seconds: template.globalTimerSeconds,
    slots: template.slots as unknown as Json,
    metadata_bytes: serializedMetadataBytes(template),
    updated_at: updatedAt ?? new Date().toISOString(),
  }));
}
