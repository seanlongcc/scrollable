import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSharedConfigMetadata(slug: string) {
  if (!getSupabaseEnv()) return { status: "unconfigured" as const };

  const supabase = await createSupabaseServerClient();
  const { data: shareLink } = await supabase
    .from("share_links")
    .select("*")
    .eq("slug", slug)
    .eq("is_enabled", true)
    .not("feed_config_id", "is", null)
    .maybeSingle();

  if (!shareLink?.feed_config_id)
    return { status: "sign-in-required" as const };

  const { data: config } = await supabase
    .from("feed_configs")
    .select("*")
    .eq("id", shareLink.feed_config_id)
    .maybeSingle();

  if (!config) return { status: "sign-in-required" as const };

  return {
    status: "ok" as const,
    slug: shareLink.slug,
    config,
  };
}

export async function getSharedLayoutMetadata(slug: string) {
  if (!getSupabaseEnv()) return { status: "unconfigured" as const };

  const supabase = await createSupabaseServerClient();
  const { data: shareLink } = await supabase
    .from("share_links")
    .select("*")
    .eq("slug", slug)
    .eq("is_enabled", true)
    .not("viewer_session_id", "is", null)
    .maybeSingle();

  if (!shareLink?.viewer_session_id) return { status: "unavailable" as const };

  const { data: layout } = await supabase
    .from("viewer_sessions")
    .select("*")
    .eq("id", shareLink.viewer_session_id)
    .maybeSingle();

  if (!layout) return { status: "unavailable" as const };

  return {
    status: "ok" as const,
    slug: shareLink.slug,
    layout,
    summary: viewerLayoutSummary(layout.sessions, layout.template_slots),
  };
}

export async function getSharedTemplateMetadata(slug: string) {
  if (!getSupabaseEnv()) return { status: "unconfigured" as const };

  const supabase = await createSupabaseServerClient();
  const { data: shareLink } = await supabase
    .from("share_links")
    .select("*")
    .eq("slug", slug)
    .eq("is_enabled", true)
    .not("viewer_template_id", "is", null)
    .maybeSingle();

  if (!shareLink?.viewer_template_id) return { status: "unavailable" as const };

  const { data: template } = await supabase
    .from("viewer_templates")
    .select("*")
    .eq("id", shareLink.viewer_template_id)
    .maybeSingle();

  if (!template) return { status: "unavailable" as const };

  const slots = Array.isArray(template.slots) ? template.slots : [];

  return {
    status: "ok" as const,
    slug: shareLink.slug,
    template,
    summary: {
      boxCount: slots.length,
    },
  };
}

function viewerLayoutSummary(
  sessionsJson: unknown,
  templateSlotsJson: unknown,
) {
  const sessions = Array.isArray(sessionsJson) ? sessionsJson : [];
  const templateSlots = Array.isArray(templateSlotsJson)
    ? templateSlotsJson
    : [];
  const sourceCounts = sessions.reduce(
    (counts, session) => {
      if (!isRecord(session)) return counts;
      const sourceConfig = session.sourceConfig;
      if (!isRecord(sourceConfig)) return counts;
      const kind = sourceConfig.kind;
      if (kind === "reddit") counts.reddit += 1;
      if (kind === "url") counts.url += 1;
      if (kind === "local") counts.local += 1;
      return counts;
    },
    { reddit: 0, url: 0, local: 0 },
  );

  return {
    sourceCount: sessions.length,
    boxCount: sessions.length + templateSlots.length,
    sourceCounts,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
