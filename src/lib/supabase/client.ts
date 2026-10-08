"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { requireSupabasePublicEnv } from "./env";

/** Browser Supabase client. Safe to call repeatedly; the SDK reuses the instance. */
export function createClient() {
  const { url, key } = requireSupabasePublicEnv();
  return createBrowserClient<Database>(url, key);
}
