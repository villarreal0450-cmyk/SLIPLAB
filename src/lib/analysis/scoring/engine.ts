import { MARKETS, tierForScore, type FactorResult, type PickAnalysis, type PickContext } from "@/lib/types";
import { defaultFactors } from "./factors";
import { clamp, round1 } from "./math";
import { projectPick } from "./projection";
import type { ScoringFactor } from "./types";

/**
 * Map the weighted 0..1 factor mean onto the 0..10 analyst scale.
 * Stretching around 0.5 keeps "everything neutral" at 5.0 while letting a pick
 * with mostly favorable evidence reach the 8s.
 */
export function calibrate(raw: number): number {
  return round1(clamp(0.5 + (raw - 0.5) * 1.5) * 10);
}

export type ScoreOptions = {
  factors?: readonly ScoringFactor[];
};

export function scorePick(ctx: PickContext, options: ScoreOptions = {}): PickAnalysis {
  const factors = options.factors ?? defaultFactors;
  const results: FactorResult[] = [];
  const missingData: string[] = [];

  for (const factor of factors) {
    const r = factor.evaluate(ctx);
    if (r) results.push(r);
    else missingData.push(factor.label);
  }

  const totalWeight = results.reduce((acc, r) => acc + r.weight, 0);
  const raw = totalWeight > 0 ? results.reduce((acc, r) => acc + r.score * r.weight, 0) / totalWeight : 0.5;
  const score = calibrate(raw);
  const tier = tierForScore(score);

  const sorted = [...results].sort((a, b) => b.score - a.score);
  const bullCase = sorted.filter((r) => r.impact === "positive").map((r) => r.explanation);
  const bearCase = sorted
    .filter((r) => r.impact === "negative")
    .reverse()
    .map((r) => r.explanation);
  const riskFactors = results
    .filter((r) => r.impact === "negative" && r.key !== "market_volatility")
    .map((r) => r.label.toLowerCase());

  const projection = projectPick(ctx);
  const def = MARKETS[ctx.pick.market];
  const lineFactor = results.find((r) => r.key === "line_value");

  let verdict: string;
  if (tier === "strong") verdict = "Strong pick";
  else if (tier === "good") verdict = lineFactor && lineFactor.score < 0.4 ? "Good, but the line is aggressive" : "Good pick";
  else if (tier === "risky") verdict = def.volatility >= 0.7 ? "High-variance leg" : "Risky — watch this one";
  else verdict = "I'd cut this leg";

  const summary = buildSummary(ctx, score, results, projection?.value ?? null);

  return {
    pickId: ctx.pick.id,
    score,
    tier,
    verdict,
    summary,
    bullCase,
    bearCase,
    factors: results,
    riskFactors,
    projection,
    missingData,
  };
}

function buildSummary(ctx: PickContext, score: number, results: FactorResult[], projected: number | null): string {
  const def = MARKETS[ctx.pick.market];
  const last = ctx.player.name.split(" ").slice(-1)[0];
  const top = [...results].sort((a, b) => b.score - a.score)[0];
  const worst = [...results].sort((a, b) => a.score - b.score)[0];
  const lineText = ctx.pick.line !== null ? `${ctx.pick.line}+ ${def.shortLabel.toLowerCase()}` : def.label.toLowerCase();

  if (score >= 8.5) {
    return `${last} ${lineText} is one of the stronger legs here. ${top?.explanation ?? ""}${projected ? ` Projection: ${projected} ${def.unit}.` : ""}`.trim();
  }
  if (score >= 7.5) {
    const caveat = worst && worst.score < 0.5 ? ` One caveat: ${lower(worst.explanation)}` : " Nothing in the data pushes back hard.";
    return `I like ${last} ${lineText}.${caveat}`;
  }
  if (score >= 6) {
    return `${last} ${lineText} is playable but not clean. ${worst?.explanation ?? ""}`.trim();
  }
  return `This is the leg I'd cut first. ${worst?.explanation ?? ""}`.trim();
}

const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
