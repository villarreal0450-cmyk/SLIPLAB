import type { Pick } from "./picks";
import type { RiskLevel, ScoreTier } from "./analysis";

export type BetStatus = "draft" | "pending" | "won" | "lost" | "void";
export type LegStatus = "pending" | "won" | "lost" | "void";

export type ProcessReview =
  | "good_process_bad_result"
  | "bad_process"
  | "good_read"
  | "high_variance_result";

/** One leg of a saved bet: the original selection plus how it settled. */
export type SavedLeg = {
  id: string;
  pick: Pick;
  status: LegStatus;
  /** Final stat value (e.g. 73 receiving yards). Optional; entered by the user for now. */
  resultValue: number | null;
  /** Analyst score at the time the bet was saved. */
  analysisScore: number | null;
  processReview: ProcessReview | null;
};

/** What the analyst said when the bet was saved, so later reviews compare against it. */
export type AnalysisSnapshot = {
  score: number;
  tier: ScoreTier;
  label: string;
  cohesion: number;
  riskLevel: RiskLevel;
  summary: string;
  weakestLegId: string | null;
  analyzedAt: string;
  isMockData: boolean;
};

export type SavedBet = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: BetStatus;
  sport: string;
  sportsbook: string | null;
  stake: number | null;
  /** Combined American odds as placed. */
  odds: number | null;
  potentialPayout: number | null;
  notes: string | null;
  settledAt: string | null;
  legs: SavedLeg[];
  analysis: AnalysisSnapshot | null;
};
