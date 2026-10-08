"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { SavedBet } from "@/lib/types";
import { createAccountBetRepository } from "./accountRepository";
import { DEVICE_BETS_KEY, deviceBetRepository } from "./deviceRepository";
import type { BetRepository } from "./repository";

type Loaded = { repo: BetRepository; bets: SavedBet[]; error: string | null };

type BetsState = {
  status: "loading" | "ready" | "error";
  bets: SavedBet[];
  error: string | null;
  storage: BetRepository["kind"];
  saveBet: (bet: SavedBet) => Promise<void>;
  removeBet: (id: string) => Promise<void>;
  reload: () => void;
};

const BetsContext = createContext<BetsState | null>(null);

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong saving your bet.");

/**
 * Saved bets for the current viewer: device storage for guests, Supabase for
 * signed-in users. Writes are optimistic and roll back on failure.
 */
export function BetsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const repo = useMemo<BetRepository>(() => (userId ? createAccountBetRepository(createClient()) : deviceBetRepository), [userId]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (auth.loading) return;
    let active = true;
    repo
      .load()
      .then((bets) => active && setLoaded({ repo, bets, error: null }))
      .catch((e) => active && setLoaded({ repo, bets: [], error: errorMessage(e) }));
    return () => {
      active = false;
    };
  }, [repo, auth.loading, nonce]);

  // Keep device bets in sync across tabs.
  useEffect(() => {
    if (repo.kind !== "device") return;
    const onStorage = (e: StorageEvent) => e.key === DEVICE_BETS_KEY && setNonce((n) => n + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [repo]);

  const current = loaded?.repo === repo ? loaded : null;

  const saveBet = useCallback(
    async (bet: SavedBet) => {
      const previous = current?.bets ?? [];
      const exists = previous.some((b) => b.id === bet.id);
      setLoaded({ repo, error: null, bets: exists ? previous.map((b) => (b.id === bet.id ? bet : b)) : [bet, ...previous] });
      try {
        await repo.save(bet);
      } catch (e) {
        setLoaded({ repo, bets: previous, error: errorMessage(e) });
        throw e;
      }
    },
    [current, repo],
  );

  const removeBet = useCallback(
    async (id: string) => {
      const previous = current?.bets ?? [];
      setLoaded({ repo, error: null, bets: previous.filter((b) => b.id !== id) });
      try {
        await repo.remove(id);
      } catch (e) {
        setLoaded({ repo, bets: previous, error: errorMessage(e) });
        throw e;
      }
    },
    [current, repo],
  );

  const value = useMemo<BetsState>(
    () => ({
      status: !current ? "loading" : current.error ? "error" : "ready",
      bets: current?.bets ?? [],
      error: current?.error ?? null,
      storage: repo.kind,
      saveBet,
      removeBet,
      reload: () => setNonce((n) => n + 1),
    }),
    [current, repo.kind, saveBet, removeBet],
  );

  return <BetsContext.Provider value={value}>{children}</BetsContext.Provider>;
}

export function useBets(): BetsState {
  const ctx = useContext(BetsContext);
  if (!ctx) throw new Error("useBets must be used inside <BetsProvider>");
  return ctx;
}
