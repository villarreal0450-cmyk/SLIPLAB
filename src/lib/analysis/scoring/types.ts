import type { FactorResult, PickContext } from "@/lib/types";

/**
 * A scoring factor looks at one dimension of a pick (recent form, matchup,
 * line value...) and returns a normalized 0..1 score with an explanation.
 *
 * Return `null` when the factor cannot be evaluated (missing data). The engine
 * then renormalizes weights over the factors that did run and records the gap
 * in `missingData`, so the explanation layer can disclose it.
 */
export interface ScoringFactor {
  key: string;
  label: string;
  /** Default weight; the engine may override per market later. */
  weight: number;
  evaluate(ctx: PickContext): FactorResult | null;
}

export function impactFor(score: number): FactorResult["impact"] {
  if (score >= 0.6) return "positive";
  if (score <= 0.4) return "negative";
  return "neutral";
}
