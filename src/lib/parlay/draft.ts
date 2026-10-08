import type { Pick } from "@/lib/types";
import { selectionKey } from "./format";

/**
 * Pure state + reducer for the draft parlay. No React, no storage — so it can
 * be unit-tested and reused by the server later (e.g. saving a draft).
 */

/** Hard cap. Long parlays are allowed but this keeps the UI sane. */
export const MAX_LEGS = 12;
/** Above this many legs the slip shows a calm, factual note about variance. */
export const LONG_PARLAY_THRESHOLD = 6;

export type ParlayDraft = {
  version: 1;
  picks: Pick[];
  updatedAt: string | null;
};

export const EMPTY_DRAFT: ParlayDraft = { version: 1, picks: [], updatedAt: null };

export type DraftAction =
  | { type: "upsert"; pick: Pick }
  | { type: "remove"; pickId: string }
  | { type: "clear" }
  | { type: "replace"; draft: ParlayDraft }
  /** Swap one leg for another in place (Replace / Make safer). */
  | { type: "swap"; pickId: string; pick: Pick }
  /** Replace the whole slip (Use this parlay). */
  | { type: "set"; picks: Pick[] };

export type DraftResult = { draft: ParlayDraft; error?: "max_legs" };

export function reduceDraft(state: ParlayDraft, action: DraftAction, now = new Date().toISOString()): DraftResult {
  switch (action.type) {
    case "upsert": {
      const key = selectionKey(action.pick);
      const existing = state.picks.findIndex((p) => p.id === action.pick.id || selectionKey(p) === key);
      if (existing >= 0) {
        const picks = [...state.picks];
        // Keep the original id so references (e.g. analysis) stay valid.
        picks[existing] = { ...action.pick, id: state.picks[existing].id };
        return { draft: { ...state, picks, updatedAt: now } };
      }
      if (state.picks.length >= MAX_LEGS) return { draft: state, error: "max_legs" };
      return { draft: { ...state, picks: [...state.picks, action.pick], updatedAt: now } };
    }
    case "remove":
      return { draft: { ...state, picks: state.picks.filter((p) => p.id !== action.pickId), updatedAt: now } };
    case "clear":
      return { draft: { ...EMPTY_DRAFT, updatedAt: now } };
    case "replace":
      return { draft: action.draft };
    case "swap": {
      const index = state.picks.findIndex((p) => p.id === action.pickId);
      if (index < 0) return { draft: state };
      const key = selectionKey(action.pick);
      // Drop any other leg that is the same selection, then put the new leg where the old one was.
      const picks = state.picks.filter((p, i) => i === index || selectionKey(p) !== key);
      picks[picks.findIndex((p) => p.id === action.pickId)] = action.pick;
      return { draft: { ...state, picks, updatedAt: now } };
    }
    case "set": {
      const seen = new Set<string>();
      const picks = action.picks.filter((p) => {
        const key = selectionKey(p);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { draft: { ...state, picks: picks.slice(0, MAX_LEGS), updatedAt: now } };
    }
  }
}

/** Defensive parse of persisted data. Anything unexpected yields an empty draft. */
export function parseDraft(raw: string | null): ParlayDraft {
  if (!raw) return EMPTY_DRAFT;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return EMPTY_DRAFT;
    const v = value as Partial<ParlayDraft>;
    if (v.version !== 1 || !Array.isArray(v.picks)) return EMPTY_DRAFT;
    const picks = v.picks.filter(isPick).slice(0, MAX_LEGS);
    return { version: 1, picks, updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : null };
  } catch {
    return EMPTY_DRAFT;
  }
}

function isPick(value: unknown): value is Pick {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.gameId === "string" &&
    typeof p.playerId === "string" &&
    typeof p.playerName === "string" &&
    typeof p.teamId === "string" &&
    typeof p.opponentTeamId === "string" &&
    typeof p.market === "string" &&
    typeof p.direction === "string" &&
    (p.line === null || typeof p.line === "number") &&
    (p.odds === undefined || typeof p.odds === "number")
  );
}
