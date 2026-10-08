import { z } from "zod";

/**
 * Supabase environment. Public values are safe for the browser; the service
 * role key is read only in `admin.ts` on the server.
 *
 * Supabase currently issues two key formats. Both are accepted:
 *   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new, `sb_publishable_...`)
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy JWT)
 */
const publicSchema = z.object({
  url: z.string().url(),
  key: z.string().min(10),
});

export type SupabasePublicEnv = z.infer<typeof publicSchema>;

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const parsed = publicSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return parsed.success ? parsed.data : null;
}

/** True when the app can talk to Supabase. Features degrade to demo mode otherwise. */
export function isSupabaseConfigured(): boolean {
  return getSupabasePublicEnv() !== null;
}

export function requireSupabasePublicEnv(): SupabasePublicEnv {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
  return env;
}
