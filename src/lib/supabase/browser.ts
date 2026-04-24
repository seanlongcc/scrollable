"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

export function createSupabaseBrowserClient() {
  const env = requireSupabaseEnv();
  return createBrowserClient<Database>(env.url, env.anonKey);
}
