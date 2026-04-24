import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getLibraryMetadata() {
  if (!getSupabaseEnv()) {
    return {
      user: null,
      configs: [],
      collections: [],
      tags: [],
      collectionTags: [],
      shareLinks: [],
      isConfigured: false,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      configs: [],
      collections: [],
      tags: [],
      collectionTags: [],
      shareLinks: [],
      isConfigured: true,
    };
  }

  const [configs, collections, tags, collectionTags, shareLinks] = await Promise.all([
    supabase
      .from("feed_configs")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("collections")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tags")
      .select("*")
      .eq("owner_id", user.id)
      .order("name", { ascending: true }),
    supabase.from("collection_tags").select("*"),
    supabase
      .from("share_links")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    user,
    configs: configs.data ?? [],
    collections: collections.data ?? [],
    tags: tags.data ?? [],
    collectionTags: collectionTags.data ?? [],
    shareLinks: shareLinks.data ?? [],
    isConfigured: true,
  };
}
