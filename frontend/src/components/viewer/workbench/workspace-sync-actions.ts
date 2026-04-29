import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { SerializedWorkspace, SerializedWorkspaceTemplate } from "./types";
import {
  buildViewerSessionUpsertRows,
  buildViewerTemplateUpsertRows,
} from "./workspace-save-state";

type WorkspaceSyncResult =
  | { status: "synced" }
  | { status: "skipped" }
  | { status: "error"; error: string };

export async function syncViewerSessionsToAccount({
  workspaces,
}: {
  workspaces: SerializedWorkspace[];
}): Promise<WorkspaceSyncResult> {
  if (!getSupabaseEnv()) return { status: "skipped" };

  try {
    const supabase = createSupabaseBrowserClient();
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

export async function syncViewerTemplatesToAccount({
  templates,
}: {
  templates: SerializedWorkspaceTemplate[];
}): Promise<WorkspaceSyncResult> {
  if (!getSupabaseEnv()) return { status: "skipped" };

  try {
    const supabase = createSupabaseBrowserClient();
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
