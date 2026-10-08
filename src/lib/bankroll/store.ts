"use client";

import { useCallback, useSyncExternalStore } from "react";
import { parseBankroll, type BankrollSettings } from "./model";

/**
 * Bankroll settings on this device. (The `bankroll_settings` table is ready
 * for account sync once Supabase is connected.)
 */
const KEY = "sliplab.bankroll.v1";
let state: BankrollSettings | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    state = parseBankroll(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    state = null;
  }
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    try {
      state = parseBankroll(JSON.parse(e.newValue ?? "null"));
    } catch {
      state = null;
    }
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function set(next: BankrollSettings | null) {
  state = next;
  try {
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Keep it in memory for this session.
  }
  for (const l of listeners) l();
}

export function useBankroll() {
  const settings = useSyncExternalStore(
    subscribe,
    () => {
      hydrate();
      return state;
    },
    () => null,
  );
  const save = useCallback((next: BankrollSettings) => set(next), []);
  const clear = useCallback(() => set(null), []);
  return { settings, save, clear };
}
