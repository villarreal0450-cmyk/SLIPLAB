import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * OAuth / magic-link landing. Exchanges the one-time code for a session
 * cookie, then sends the user on. `next` must be a same-site path so this
 * can't be used as an open redirect.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/bets";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/bets";

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=exchange_failed", url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
