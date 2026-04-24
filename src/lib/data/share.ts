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

export async function getSharedCollectionMetadata(slug: string) {
  if (!getSupabaseEnv()) return { status: "unconfigured" as const };

  const supabase = await createSupabaseServerClient();
  const { data: shareLink } = await supabase
    .from("share_links")
    .select("*")
    .eq("slug", slug)
    .eq("is_enabled", true)
    .not("collection_id", "is", null)
    .maybeSingle();

  if (!shareLink?.collection_id) return { status: "sign-in-required" as const };

  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("id", shareLink.collection_id)
    .maybeSingle();

  if (!collection) return { status: "sign-in-required" as const };

  const { data: items } = await supabase
    .from("collection_items")
    .select("*")
    .eq("collection_id", collection.id)
    .order("position", { ascending: true });

  const configIds = (items ?? []).map((item) => item.feed_config_id);
  const { data: configs } = configIds.length
    ? await supabase.from("feed_configs").select("*").in("id", configIds)
    : { data: [] };

  return {
    status: "ok" as const,
    slug: shareLink.slug,
    collection,
    items: (items ?? []).map((item) => ({
      ...item,
      config: (configs ?? []).find(
        (config) => config.id === item.feed_config_id,
      ),
    })),
  };
}
