"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseFeedConfigInput } from "@/lib/config/feed-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return { supabase, user };
}

export async function createFeedConfig(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseFeedConfigInput({
    name: String(formData.get("name") ?? ""),
    subreddit: String(formData.get("subreddit") ?? ""),
    sort: String(formData.get("sort") || "top") as "top" | "hot" | "new",
    timeRange: String(formData.get("timeRange") || "day") as
      | "hour"
      | "day"
      | "week"
      | "month"
      | "year"
      | "all",
    limit: String(formData.get("limit") || "20"),
    skip: String(formData.get("skip") || "0"),
    timerSeconds: String(formData.get("timerSeconds") || "12"),
    isNsfw: formData.get("isNsfw") === "on",
  });

  await supabase.from("feed_configs").insert({
    owner_id: user.id,
    name: parsed.name ?? `r/${parsed.subreddit}`,
    subreddit: parsed.subreddit,
    sort: parsed.sort,
    time_range: parsed.timeRange,
    limit_count: parsed.limit,
    skip_count: parsed.skip,
    timer_seconds: parsed.timerSeconds,
    is_nsfw: parsed.isNsfw,
    display_options: { displayMode: parsed.displayMode },
  });

  revalidatePath("/library");
}

export async function deleteFeedConfig(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");

  if (id) {
    await supabase.from("feed_configs").delete().eq("id", id);
  }

  revalidatePath("/library");
}

export async function updateFeedConfig(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const parsed = parseFeedConfigInput({
    name: String(formData.get("name") ?? ""),
    subreddit: String(formData.get("subreddit") ?? ""),
    sort: String(formData.get("sort") || "top") as "top" | "hot" | "new",
    timeRange: String(formData.get("timeRange") || "day") as
      | "hour"
      | "day"
      | "week"
      | "month"
      | "year"
      | "all",
    limit: String(formData.get("limit") || "20"),
    skip: String(formData.get("skip") || "0"),
    timerSeconds: String(formData.get("timerSeconds") || "12"),
    isNsfw: formData.get("isNsfw") === "on",
  });

  await supabase
    .from("feed_configs")
    .update({
      name: parsed.name ?? `r/${parsed.subreddit}`,
      subreddit: parsed.subreddit,
      sort: parsed.sort,
      time_range: parsed.timeRange,
      limit_count: parsed.limit,
      skip_count: parsed.skip,
      timer_seconds: parsed.timerSeconds,
      is_nsfw: parsed.isNsfw,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/library");
}

export async function createCollection(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return;

  await supabase.from("collections").insert({
    owner_id: user.id,
    name,
    description: description || null,
    is_nsfw: formData.get("isNsfw") === "on",
  });

  revalidatePath("/library");
}

export async function addConfigToCollection(formData: FormData) {
  const { supabase, user } = await requireUser();
  const collectionId = String(formData.get("collectionId") ?? "");
  const feedConfigId = String(formData.get("feedConfigId") ?? "");

  if (!collectionId || !feedConfigId) return;

  const { data: feedConfig } = await supabase
    .from("feed_configs")
    .select("id")
    .eq("id", feedConfigId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!feedConfig) return;

  const { count } = await supabase
    .from("collection_items")
    .select("id", { count: "exact", head: true })
    .eq("collection_id", collectionId);

  await supabase.from("collection_items").insert({
    collection_id: collectionId,
    feed_config_id: feedConfigId,
    position: count ?? 0,
  });

  revalidatePath("/library");
}

export async function createTag(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return;

  await supabase.from("tags").insert({ owner_id: user.id, name });
  revalidatePath("/library");
}

export async function addTagToCollection(formData: FormData) {
  const { supabase } = await requireUser();
  const collectionId = String(formData.get("collectionId") ?? "");
  const tagId = String(formData.get("tagId") ?? "");

  if (!collectionId || !tagId) return;

  await supabase
    .from("collection_tags")
    .insert({ collection_id: collectionId, tag_id: tagId });

  revalidatePath("/library");
}

export async function createShareLink(formData: FormData) {
  const { supabase, user } = await requireUser();
  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");

  if (!targetId || (targetType !== "config" && targetType !== "collection")) {
    return;
  }

  if (targetType === "config") {
    const { data } = await supabase
      .from("feed_configs")
      .select("id")
      .eq("id", targetId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!data) return;
  }

  if (targetType === "collection") {
    const { data } = await supabase
      .from("collections")
      .select("id")
      .eq("id", targetId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!data) return;
  }

  await supabase.from("share_links").insert({
    owner_id: user.id,
    slug: crypto.randomUUID().replaceAll("-", "").slice(0, 16),
    feed_config_id: targetType === "config" ? targetId : null,
    collection_id: targetType === "collection" ? targetId : null,
  });

  revalidatePath("/library");
}
