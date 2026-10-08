import type { Pick } from "./picks";
import type { Injury, MarketLine, PlayerGameLog, PlayerSeasonStats, TeamStats, Game, GameOdds, Player, Team } from "./sports";

/* ---------- Scores ---------- */

export type ScoreTier = "strong" | "good" | "risky" | "avoid";

export const SCORE_TIERS: { tier: ScoreTier; min: number; label: string }[] = [
  { tier: "strong", min: 8.5, label: "Strong" },
  { tier: "good", min: 7.5, label: "Good" },
  { tier: "risky", min: 6.0, label: "Risky" },
  { tier: "avoid", min: 0, label: "Avoid" },
];

export function tierForScore(score: number): ScoreTier {
  return SCORE_TIERS.find((t) => score >= t.min)?.tier ?? "avoid";
}

export type RiskLevel = "low" | "medium" | "high";

/* ---------- Scoring factors ---------- */

export type FactorImpact = "positive" | "neutral" | "negative";

/** Output of one scoring factor, normalized so the engine can combine them. */
export type FactorResult = {
  key: string;
  label: string;
  /** 0..1, where 0.5 is neutral. */
  score: number;
  /** Relative weight the engine should give this factor. */
  weight: number;
  impact: FactorImpact;
  /** Short, human sentence. The LLM may rewrite it, but never invent numbers. */
  explanation: string;
  /** Raw evidence for explainability / UI. */
  evidence?: Record<string, number | string | boolean | null | undefined>;
};

/* ---------- Pick context (what the engine & LLM see) ---------- */

export type PickContext = {
  pick: Pick;
  player: Player;
  team: Team;
  opponent: Team;
  game: Game;
  gameOdds: GameOdds | null;
  recentGames: PlayerGameLog[];
  seasonStats: PlayerSeasonStats | null;
  teamStats: TeamStats | null;
  opponentStats: TeamStats | null;
  injuries: { own: Injury[]; opponent: Injury[] };
  marketLine: MarketLine | null;
  /** Describes where the data came from, so UI can label mock data honestly. */
  dataSource: DataSourceInfo;
};

export type DataSourceInfo = {
  provider: string;
  isMock: boolean;
  asOf: string;
};

/* ---------- Pick analysis ---------- */

export type Projection = {
  /** Model projection for the stat (e.g. 272 passing yards). */
  value: number;
  /** The line being evaluated. */
  line: number | null;
  /** Rough distribution for charts: buckets with relative weight. */
  distribution: { bucketStart: number; bucketEnd: number; weight: number }[];
  /** Estimated hit rate for the line, 0..1. Presented as analyst confidence, never as a guarantee. */
  hitRate: number;
};

export type PickAnalysis = {
  pickId: string;
  score: number; // 0..10
  tier: ScoreTier;
  verdict: string; // "Strong pick", "Line is aggressive", ...
  summary: string;
  bullCase: string[];
  bearCase: string[];
  factors: FactorResult[];
  riskFactors: string[];
  projection: Projection | null;
  /** True if any required data was unavailable. The explanation layer must disclose this. */
  missingData: string[];
  /**
   * Set when the line sits far from the projection: "cushion" (very likely to
   * clear, pays little) or "stretch" (needs a ceiling game).
   */
  lineShift?: "cushion" | "stretch";
};

/* ---------- Correlation ---------- */

export type CorrelationType = "positive" | "negative" | "competition";

export type CorrelationFinding = {
  pickIds: [string, string];
  type: CorrelationType;
  /** -1..1 signed strength. */
  strength: number;
  explanation: string;
  ruleKey: string;
};

export type CohesionResult = {
  score: number; // 0..100
  label: string;
  findings: CorrelationFinding[];
  summary: string;
};

/* ---------- Game script ---------- */

export type GameScript = {
  gameId: string;
  beats: string[];
  helpedPickIds: string[];
  hurtPickIds: string[];
  /** 0..1 how confident the engine is in this narrative. */
  confidence: number;
  summary: string;
  /** The plausible alternative script that would sink the helped legs. */
  breaker: string | null;
};

/* ---------- Parlay analysis ---------- */

export type WeakestLeg = {
  pickId: string;
  reason: string;
  actions: ("why" | "replace" | "make_safer")[];
};

export type ParlayAnalysis = {
  parlayId: string;
  score: number; // 0..10
  tier: ScoreTier;
  label: string; // "Strong structure"
  summary: string;
  riskLevel: RiskLevel;
  cohesion: CohesionResult;
  gameScripts: GameScript[];
  picks: PickAnalysis[];
  weakestLeg: WeakestLeg | null;
  combinedOdds: number | null;
  legCount: number;
  dataSource: DataSourceInfo;
  analyzedAt: string;
};

/* ---------- Suggestions (Improve my parlay) ---------- */

export type SuggestionChangeType = "keep" | "replace" | "adjust_line" | "remove" | "add";

export type SuggestionChange = {
  type: SuggestionChangeType;
  /** The leg in the current slip this change refers to (absent for "add"). */
  before?: Pick;
  /** The resulting leg (absent for "remove"). */
  after?: Pick;
  reason: string;
  /** The leg stays in the slip but is a known weak spot. */
  warning?: boolean;
};

/** Headline numbers for a slip, used to compare a suggestion with the current parlay. */
export type ProjectedOutcome = {
  score: number;
  tier: ScoreTier;
  label: string;
  cohesion: number;
  riskLevel: RiskLevel;
  odds: number | null;
  legCount: number;
};

export type ParlaySuggestion = {
  profile: "safer" | "balanced" | "aggressive";
  title: string;
  tagline: string;
  picks: Pick[];
  changes: SuggestionChange[];
  projected: ProjectedOutcome;
  rationale: string;
  /** Shown with aggressive suggestions: what the user is trading for the payout. */
  caution: string | null;
  /** True when the current slip already fits this profile. */
  unchanged: boolean;
  recommended: boolean;
};

export type LegAlternativeKind = "easier_line" | "other_market" | "replacement";

export type LegAlternative = {
  pick: Pick;
  kind: LegAlternativeKind;
  score: number;
  tier: ScoreTier;
  reason: string;
  parlayAfter: ProjectedOutcome;
};
