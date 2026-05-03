import { createLazySupabaseBrowserClient } from "@/lib/supabase/browser-lazy";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  CLOUD_METADATA_QUOTA_BYTES,
  cloudLibraryUsage,
} from "./cloud-save-state";
import type { SerializedWorkspace, SerializedWorkspaceTemplate } from "./types";
import {
  buildViewerSessionUpsertRows,
  buildViewerTemplateUpsertRows,
} from "./workspace-save-state";

type WorkspaceSyncResult =
  | { status: "synced" }
  | { status: "skipped" }
  | { status: "error"; error: string };

export type CloudLibraryResult =
  | {
      status: "loaded";
      workspaces: Record<string, SerializedWorkspace>;
      templates: Record<string, SerializedWorkspaceTemplate>;
      usage: ReturnType<typeof cloudLibraryUsage>;
    }
  | { status: "skipped"; reason?: string }
  | { status: "error"; error: string };

export async function syncViewerSessionsToAccount({
  workspaces,
}: {
  workspaces: SerializedWorkspace[];
}): Promise<WorkspaceSyncResult> {
  if (!getSupabaseEnv()) return { status: "skipped" };

  try {
    const supabase = await createLazySupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { status: "skipped" };

    const { error } = await supabase.from("viewer_sessions").upsert(
      buildViewerSessionUpsertRows({
        workspaces,
        userId: user.id,
      }),
    );

    if (error) throw error;
    return { status: "synced" };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Account sync failed",
    };
  }
}

export async function loadViewerCloudLibraryFromAccount(): Promise<CloudLibraryResult> {
  if (!getSupabaseEnv()) return { status: "skipped", reason: "unconfigured" };

  try {
    const supabase = await createLazySupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { status: "skipped", reason: "signed-out" };

    const [
      { data: sessionRows, error: sessionError },
      { data: templateRows, error: templateError },
      { data: profile },
    ] = await Promise.all([
      supabase.from("viewer_sessions").select("*").order("updated_at", {
        ascending: false,
      }),
      supabase.from("viewer_templates").select("*").order("updated_at", {
        ascending: false,
      }),
      supabase
        .from("profiles")
        .select("is_admin, cloud_quota_bytes")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (sessionError) throw sessionError;
    if (templateError) throw templateError;

    const workspaces = (sessionRows ?? []).map(viewerSessionRowToWorkspace);
    const templates = (templateRows ?? []).map(viewerTemplateRowToTemplate);

    return {
      status: "loaded",
      workspaces: Object.fromEntries(
        workspaces.map((workspace) => [workspace.id, workspace]),
      ),
      templates: Object.fromEntries(
        templates.map((template) => [template.id, template]),
      ),
      usage: cloudLibraryUsage({
        workspaces,
        templates,
        quotaBytes: profile?.cloud_quota_bytes ?? CLOUD_METADATA_QUOTA_BYTES,
        isUnlimited: Boolean(profile?.is_admin),
      }),
    };
  } catch (error) {
    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Cloud library load failed",
    };
  }
}

export async function upsertViewerSessionToAccount({
  workspace,
}: {
  workspace: SerializedWorkspace;
}): Promise<WorkspaceSyncResult> {
  if (!getSupabaseEnv()) return { status: "skipped" };

  try {
    const supabase = await createLazySupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { status: "skipped" };

    const { error } = await supabase.from("viewer_sessions").upsert(
      buildViewerSessionUpsertRows({
        workspaces: [workspace],
        userId: user.id,
      }),
    );

    if (error) throw error;
    return { status: "synced" };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Cloud save failed",
    };
  }
}

export async function upsertViewerTemplateToAccount({
  template,
}: {
  template: SerializedWorkspaceTemplate;
}): Promise<WorkspaceSyncResult> {
  if (!getSupabaseEnv()) return { status: "skipped" };

  try {
    const supabase = await createLazySupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { status: "skipped" };

    const { error } = await supabase.from("viewer_templates").upsert(
      buildViewerTemplateUpsertRows({
        templates: [template],
        userId: user.id,
      }),
    );

    if (error) throw error;
    return { status: "synced" };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Cloud save failed",
    };
  }
}

export async function deleteViewerCloudItem({
  kind,
  id,
}: {
  kind: "layout" | "template";
  id: string;
}): Promise<WorkspaceSyncResult> {
  if (!getSupabaseEnv()) return { status: "skipped" };

  try {
    const supabase = await createLazySupabaseBrowserClient();
    const table = kind === "layout" ? "viewer_sessions" : "viewer_templates";
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) throw error;
    return { status: "synced" };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Cloud delete failed",
    };
  }
}

export async function renameViewerCloudItem({
  kind,
  id,
  name,
  metadataBytes,
}: {
  kind: "layout" | "template";
  id: string;
  name: string;
  metadataBytes?: number;
}): Promise<WorkspaceSyncResult> {
  if (!getSupabaseEnv()) return { status: "skipped" };

  try {
    const supabase = await createLazySupabaseBrowserClient();
    const table = kind === "layout" ? "viewer_sessions" : "viewer_templates";
    const { error } = await supabase
      .from(table)
      .update({
        name,
        ...(typeof metadataBytes === "number"
          ? { metadata_bytes: metadataBytes }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
    return { status: "synced" };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Cloud rename failed",
    };
  }
}

export async function ensureViewerShareLink({
  kind,
  id,
}: {
  kind: "layout" | "template";
  id: string;
}): Promise<
  | { status: "created"; slug: string }
  | { status: "skipped" }
  | { status: "error"; error: string }
> {
  if (!getSupabaseEnv()) return { status: "skipped" };

  try {
    const supabase = await createLazySupabaseBrowserClient();
    const column =
      kind === "layout" ? "viewer_session_id" : "viewer_template_id";
    const existingQuery = supabase
      .from("share_links")
      .select("*")
      .eq(column, id)
      .eq("is_enabled", true);
    const { data: existing, error: existingError } =
      await existingQuery.maybeSingle();

    if (existingError) throw existingError;
    if (existing?.slug) return { status: "created", slug: existing.slug };

    const slug = createShareSlug();
    const row =
      kind === "layout"
        ? { slug, viewer_session_id: id }
        : { slug, viewer_template_id: id };
    const { data, error } = await supabase
      .from("share_links")
      .insert(row)
      .select("slug")
      .single();

    if (error) throw error;
    return { status: "created", slug: data.slug };
  } catch (error) {
    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Share link creation failed",
    };
  }
}

export async function regenerateViewerShareLink({
  kind,
  id,
}: {
  kind: "layout" | "template";
  id: string;
}): Promise<
  | { status: "created"; slug: string }
  | { status: "skipped" }
  | { status: "error"; error: string }
> {
  if (!getSupabaseEnv()) return { status: "skipped" };

  try {
    const supabase = await createLazySupabaseBrowserClient();
    const column =
      kind === "layout" ? "viewer_session_id" : "viewer_template_id";
    const { error: disableError } = await supabase
      .from("share_links")
      .update({
        is_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq(column, id)
      .eq("is_enabled", true);

    if (disableError) throw disableError;

    const slug = createShareSlug();
    const row =
      kind === "layout"
        ? { slug, viewer_session_id: id }
        : { slug, viewer_template_id: id };
    const { data, error } = await supabase
      .from("share_links")
      .insert(row)
      .select("slug")
      .single();

    if (error) throw error;
    return { status: "created", slug: data.slug };
  } catch (error) {
    return {
      status: "error",
      error:
        error instanceof Error
          ? error.message
          : "Share link regeneration failed",
    };
  }
}

export async function disableViewerShareLinks({
  kind,
  id,
}: {
  kind: "layout" | "template";
  id: string;
}): Promise<WorkspaceSyncResult> {
  if (!getSupabaseEnv()) return { status: "skipped" };

  try {
    const supabase = await createLazySupabaseBrowserClient();
    const column =
      kind === "layout" ? "viewer_session_id" : "viewer_template_id";
    const { error } = await supabase
      .from("share_links")
      .update({
        is_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq(column, id)
      .eq("is_enabled", true);

    if (error) throw error;
    return { status: "synced" };
  } catch (error) {
    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Share link disable failed",
    };
  }
}

type ViewerSessionRow = {
  id: string;
  name: string;
  layers?: unknown;
  active_layer_id?: string | null;
  layout_mode: "fixed" | "free";
  fixed_columns: number;
  fixed_rows: number;
  global_timer_seconds: number;
  sessions: unknown;
  template_slots?: unknown;
  updated_at: string;
};

type ViewerTemplateRow = {
  id: string;
  name: string;
  layers: unknown;
  active_layer_id: string;
  global_timer_seconds: number;
  slots: unknown;
  updated_at: string;
};

function viewerSessionRowToWorkspace(
  row: ViewerSessionRow,
): SerializedWorkspace {
  return {
    id: row.id,
    name: row.name,
    layers: Array.isArray(row.layers)
      ? (row.layers as SerializedWorkspace["layers"])
      : [{ id: "layer-1", name: "Layer 1" }],
    activeLayerId: row.active_layer_id ?? "layer-1",
    layoutMode: row.layout_mode,
    fixedGrid: { columns: row.fixed_columns, rows: row.fixed_rows },
    globalTimerSeconds: row.global_timer_seconds,
    sessions: Array.isArray(row.sessions)
      ? (row.sessions as SerializedWorkspace["sessions"])
      : [],
    templateSlots: Array.isArray(row.template_slots)
      ? (row.template_slots as SerializedWorkspace["templateSlots"])
      : [],
    updatedAt: row.updated_at,
  };
}

function viewerTemplateRowToTemplate(
  row: ViewerTemplateRow,
): SerializedWorkspaceTemplate {
  return {
    id: row.id,
    name: row.name,
    layers: Array.isArray(row.layers)
      ? (row.layers as SerializedWorkspaceTemplate["layers"])
      : [{ id: "layer-1", name: "Layer 1" }],
    activeLayerId: row.active_layer_id,
    globalTimerSeconds: row.global_timer_seconds,
    slots: Array.isArray(row.slots)
      ? (row.slots as SerializedWorkspaceTemplate["slots"])
      : [],
    updatedAt: row.updated_at,
  };
}

function createShareSlug() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 18);
}

export async function syncViewerTemplatesToAccount({
  templates,
}: {
  templates: SerializedWorkspaceTemplate[];
}): Promise<WorkspaceSyncResult> {
  if (!getSupabaseEnv()) return { status: "skipped" };

  try {
    const supabase = await createLazySupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { status: "skipped" };

    const { error } = await supabase.from("viewer_templates").upsert(
      buildViewerTemplateUpsertRows({
        templates,
        userId: user.id,
      }),
    );

    if (error) throw error;
    return { status: "synced" };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Template sync failed",
    };
  }
}
