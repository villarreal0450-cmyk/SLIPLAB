import type { Direction, MarketKey, SportKey } from "./sports";

export type BetStatus = "draft" | "pending" | "won" | "lost" | "void";
export type LegStatus = "pending" | "won" | "lost" | "void";

export type ProcessReview =
  | "good_process_bad_result"
  | "bad_process"
  | "good_read"
  | "high_variance_result";

export type Bet = {
  id: string;
  userId: string;
  sport: SportKey;
  eventId: string | null;
  sportsbook: string | null;
  stake: number | null;
  odds: number | null;
  potentialPayout: number | null;
  status: BetStatus;
  analysisScore: number | null;
  cohesionScore: number | null;
  riskLevel: "low" | "medium" | "high" | null;
  notes: string | null;
  createdAt: string;
  settledAt: string | null;
  legs: BetLeg[];
};

export type BetLeg = {
  id: string;
  betId: string;
  playerId: string | null;
  playerName: string;
  team: string;
  opponent: string;
  market: MarketKey;
  direction: Direction;
  line: number | null;
  odds: number | null;
  status: LegStatus;
  resultValue: number | null;
  analysisScore: number | null;
  processReview: ProcessReview | null;
};
