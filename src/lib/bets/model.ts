import { americanToDecimal } from "@/lib/odds";
import type { BetStatus, LegStatus, ParlayAnalysis, Pick, SavedBet, SavedLeg } from "@/lib/types";

export type BetDetailsPatch = {
  stake?: number | null;
  odds?: number | null;
  sportsbook?: string | null;
  notes?: string | null;
};

/** Pure bet logic: creation, payout math and status derivation. */

export const SPORTSBOOKS = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "ESPN BET", "Fanatics", "bet365", "Other"] as const;

/** Total return (stake included) for a winning bet. Null if stake or odds is missing. */
export function potentialPayout(stake: number | null, odds: number | null): number | null {
  if (stake === null || odds === null || stake <= 0 || odds === 0) return null;
  return Math.round(stake * americanToDecimal(odds) * 100) / 100;
}

/**
 * A parlay's status follows its legs: any lost leg loses it; every leg won
 * (voids drop out) wins it; all voids void it. Until then it is pending.
 * Drafts stay drafts until the user marks the bet as placed.
 */
export function deriveStatus(current: BetStatus, legs: { status: LegStatus }[]): BetStatus {
  if (current === "draft") return "draft";
  if (legs.some((l) => l.status === "lost")) return "lost";
  if (legs.every((l) => l.status === "void")) return "void";
  if (legs.every((l) => l.status === "won" || l.status === "void")) return "won";
  return "pending";
}

export const isSettled = (status: BetStatus) => status === "won" || status === "lost" || status === "void";

export type NewBetInput = {
  picks: Pick[];
  analysis: ParlayAnalysis | null;
  stake: number | null;
  odds: number | null;
  sportsbook: string | null;
  notes: string | null;
  placed: boolean;
  now?: string;
  newId?: () => string;
};

export function createSavedBet(input: NewBetInput): SavedBet {
  const now = input.now ?? new Date().toISOString();
  const newId = input.newId ?? (() => crypto.randomUUID());
  const legIdByPick = new Map<string, string>();
  const legs: SavedLeg[] = input.picks.map((pick) => {
    const id = newId();
    legIdByPick.set(pick.id, id);
    return {
      id,
      pick,
      status: "pending",
      resultValue: null,
      analysisScore: input.analysis?.picks.find((a) => a.pickId === pick.id)?.score ?? null,
      processReview: null,
    };
  });
  const a = input.analysis;
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    status: input.placed ? "pending" : "draft",
    sport: input.picks[0]?.sport ?? "nfl",
    sportsbook: input.sportsbook,
    stake: input.stake,
    odds: input.odds,
    potentialPayout: potentialPayout(input.stake, input.odds),
    notes: input.notes,
    settledAt: null,
    legs,
    analysis: a
      ? {
          score: a.score,
          tier: a.tier,
          label: a.label,
          cohesion: a.cohesion.score,
          riskLevel: a.riskLevel,
          summary: a.summary,
          weakestLegId: a.weakestLeg ? (legIdByPick.get(a.weakestLeg.pickId) ?? null) : null,
          analyzedAt: a.analyzedAt,
          isMockData: a.dataSource.isMock,
        }
      : null,
  };
}

/** Apply a leg result and re-derive the bet's status and settlement time. */
export function settleLeg(bet: SavedBet, legId: string, status: LegStatus, resultValue: number | null, now = new Date().toISOString()): SavedBet {
  const legs = bet.legs.map((l) => (l.id === legId ? { ...l, status, resultValue } : l));
  return withStatus({ ...bet, legs, updatedAt: now }, deriveStatus(bet.status, legs), now);
}

export function markPlaced(bet: SavedBet, now = new Date().toISOString()): SavedBet {
  if (bet.status !== "draft") return bet;
  return withStatus({ ...bet, updatedAt: now }, deriveStatus("pending", bet.legs), now);
}

export function updateDetails(
  bet: SavedBet,
  patch: BetDetailsPatch,
  now = new Date().toISOString(),
): SavedBet {
  const next = { ...bet, ...patch, updatedAt: now };
  return { ...next, potentialPayout: potentialPayout(next.stake, next.odds) };
}

function withStatus(bet: SavedBet, status: BetStatus, now: string): SavedBet {
  const settledAt = isSettled(status) ? (bet.settledAt ?? now) : null;
  return { ...bet, status, settledAt };
}

/** Defensive parse of a stored bet list. Drops anything malformed. */
export function parseBets(raw: unknown): SavedBet[] {
  if (!raw || typeof raw !== "object") return [];
  const v = raw as { version?: unknown; bets?: unknown };
  if (v.version !== 1 || !Array.isArray(v.bets)) return [];
  return v.bets.filter(isSavedBet);
}

function isSavedBet(value: unknown): value is SavedBet {
  if (!value || typeof value !== "object") return false;
  const b = value as Record<string, unknown>;
  return (
    typeof b.id === "string" &&
    typeof b.createdAt === "string" &&
    typeof b.status === "string" &&
    Array.isArray(b.legs) &&
    b.legs.every((l) => !!l && typeof l === "object" && typeof (l as SavedLeg).id === "string" && !!(l as SavedLeg).pick)
  );
}

/** What the bet paid back (settled) or would pay back (open). Null without a stake. */
export function returnFigure(bet: SavedBet): { label: "Returned" | "To return"; amount: number | null } {
  switch (bet.status) {
    case "won":
      return { label: "Returned", amount: bet.potentialPayout };
    case "void":
      return { label: "Returned", amount: bet.stake };
    case "lost":
      return { label: "Returned", amount: bet.stake === null ? null : 0 };
    default:
      return { label: "To return", amount: bet.potentialPayout };
  }
}
