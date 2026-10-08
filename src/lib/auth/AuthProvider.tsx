"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthUser = { id: string; email: string | null };

type AuthState = {
  /** False when Supabase env vars are missing: the app runs in device-only mode. */
  configured: boolean;
  loading: boolean;
  user: AuthUser | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => (configured ? createClient() : null), [configured]);
  const [session, setSession] = useState<{ loaded: boolean; user: AuthUser | null }>({ loaded: !configured, user: null });

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setSession({ loaded: true, user: data.user ? { id: data.user.id, email: data.user.email ?? null } : null });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession({ loaded: true, user: s?.user ? { id: s.user.id, email: s.user.email ?? null } : null });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthState>(
    () => ({
      configured,
      loading: !session.loaded,
      user: session.user,
      signOut: async () => {
        await supabase?.auth.signOut();
      },
    }),
    [configured, session, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
