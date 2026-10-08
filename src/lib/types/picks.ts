import type { Direction, MarketKey, SportKey } from "./sports";

/**
 * A single selection the user is considering. This is the unit of analysis.
 * IDs are client-generated for drafts and persisted as bet_legs when saved.
 */
export type Pick = {
  id: string;
  sport: SportKey;
  gameId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  opponentTeamId: string;
  market: MarketKey;
  direction: Direction;
  /** The user's line, e.g. 244 for "244+" (null for yes/no markets). */
  line: number | null;
  /** American odds if known, e.g. -115 or +140. */
  odds?: number;
  /** True when the user chose an alternate (non-main) line. */
  isAlternate?: boolean;
};

/** A draft parlay — the thing being analyzed. */
export type Parlay = {
  id: string;
  picks: Pick[];
  /** Optional stake in the user's currency units. */
  stake?: number;
  sportsbook?: string;
};

export type RiskProfile = "safer" | "balanced" | "aggressive";
