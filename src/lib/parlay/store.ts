"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Pick } from "@/lib/types";
import { EMPTY_DRAFT, parseDraft, reduceDraft, type DraftAction, type DraftResult, type ParlayDraft } from "./draft";

/**
 * Client store for the draft parlay.
 *
 * Guests keep their slip in localStorage so it survives reloads; once auth
 * lands (Phase 6) drafts can sync to Supabase through the same actions.
 * Storage access is wrapped because it can throw (private mode, blocked
 * site data) — the slip still works in memory when it does.
 */

const STORAGE_KEY = "sliplab.parlay-draft.v1";

let state: ParlayDraft = EMPTY_DRAFT;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): ParlayDraft {
  try {
    return parseDraft(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_DRAFT;
  }
}

function writeStorage(draft: ParlayDraft) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Non-fatal: the draft lives in memory for this session.
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = readStorage();
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);

  // Keep multiple tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    state = parseDraft(e.newValue);
    emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  hydrate();
  return state;
}

function getServerSnapshot() {
  return EMPTY_DRAFT;
}

export function dispatchDraft(action: DraftAction): DraftResult {
  hydrate();
  const result = reduceDraft(state, action);
  if (result.draft !== state) {
    state = result.draft;
    writeStorage(state);
    emit();
  }
  return result;
}

/** Subscribe to the draft parlay. Renders an empty slip on the server. */
export function useParlayDraft() {
  const draft = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const upsertPick = useCallback((pick: Pick) => dispatchDraft({ type: "upsert", pick }), []);
  const removePick = useCallback((pickId: string) => dispatchDraft({ type: "remove", pickId }), []);
  const clear = useCallback(() => dispatchDraft({ type: "clear" }), []);

  return { draft, picks: draft.picks, upsertPick, removePick, clear };
}
