import { MARKETS, tierForScore, type FactorResult, type Injury, type PickAnalysis, type PickContext } from "@/lib/types";
import { defaultFactors } from "./factors";
import { clamp, round1 } from "./math";
import { modelPick, projectPick } from "./projection";
import type { ScoringFactor } from "./types";
import { lastName } from "@/lib/format/names";

/**
 * Map the weighted 0..1 factor mean onto the 0..10 analyst scale.
 * Stretching around 0.5 keeps "everything neutral" at 5.0 while letting a pick
 * with mostly favorable evidence reach the 8s.
 */
export function calibrate(raw: number): number {
  return round1(clamp(0.5 + (raw - 0.5) * 1.5) * 10);
}

/** How likely a player is to suit up and play a full game, by injury status. */
const AVAILABILITY: Record<Injury["status"], number> = {
  out: 0,
  ir: 0,
  doubtful: 0.4,
  questionable: 0.85,
  probable: 0.97,
};

export type LineShift = "cushion" | "stretch" | null;

/**
 * The factor read (matchup, form, usage...) is built for lines near the
 * market, where those details decide a close call. When the line sits far from
 * the projection, the chance of clearing dominates instead: 0.5 passing yards
 * for a healthy starter should grade near 10 whatever the matchup, and 400
 * passing yards should grade low however good the matchup looks.
 *
 * A big cushion can only lift the factor score and a big stretch can only
 * lower it, so picks near the market keep their factor-based grade. `shift`
 * flags lines far enough from the projection to call out in the copy.
 */
export function applyLineCushion(factorScore: number, pHit: number | null, availability = 1): { score: number; shift: LineShift } {
  if (pHit === null) return { score: factorScore, shift: null };
  if (pHit >= 0.5) {
    const p = pHit * availability;
    const weight = clamp((p - 0.7) / 0.28);
    const score = round1(Math.max(factorScore, factorScore * (1 - weight) + p * 10 * weight));
    return { score, shift: weight >= 0.75 ? "cushion" : null };
  }
  const weight = clamp((0.3 - pHit) / 0.28);
  const score = round1(Math.min(factorScore, factorScore * (1 - weight) + pHit * 10 * weight));
  return { score, shift: weight >= 0.75 ? "stretch" : null };
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
  const model = modelPick(ctx);
  const ownInjury = ctx.injuries.own.find((i) => i.playerId === ctx.pick.playerId);
  const { score, shift } = applyLineCushion(calibrate(raw), model?.pHit ?? null, ownInjury ? AVAILABILITY[ownInjury.status] : 1);
  const tier = tierForScore(score);

  const sorted = [...results].sort((a, b) => b.score - a.score);
  const bullCase = sorted.filter((r) => r.impact === "positive").map((r) => r.explanation);
  const bearCase = sorted
    .filter((r) => r.impact === "negative")
    .reverse()
    .map((r) => r.explanation);
  // A skeptical analyst always has a counterpoint. If no factor is negative,
  // surface the weakest one and the sample-size caveat rather than an empty list.
  if (bearCase.length === 0) {
    const weakest = sorted[sorted.length - 1];
    if (weakest && weakest.score < 0.5 && weakest.key !== "market_volatility") bearCase.push(weakest.explanation);
    const games = ctx.recentGames.length;
    if (games > 0 && games < 8) {
      bearCase.push(`Only ${games} games of data this season — a small sample that can overstate a hot start.`);
    }
    const def = MARKETS[ctx.pick.market];
    if (def.volatility >= 0.45) bearCase.push(`${def.label} swings a lot game to game, so even a good read misses often.`);
  }

  if (shift && model && ctx.pick.line !== null) {
    const def = MARKETS[ctx.pick.market];
    const last = lastName(ctx.player.name);
    const proj = Math.round(model.value);
    const rawGap = Math.abs(ctx.pick.line - model.value);
    const gap = rawGap >= 10 ? Math.round(rawGap) : Math.round(rawGap * 10) / 10;
    const over = ctx.pick.direction === "over";
    if (shift === "cushion") {
      bullCase.unshift(
        `The ${ctx.pick.line} line sits ${gap} ${def.unit} ${over ? "below" : "above"} ${last}'s projection of ${proj}, so it takes a very unusual game to miss.`,
      );
      bearCase.unshift(
        `A line with this much cushion pays very little, so it adds almost nothing to a parlay's payout. The real risk is ${last} ${over ? "barely playing or leaving early" : "having a surprise big game"}.`,
      );
    } else {
      bearCase.unshift(
        `The ${ctx.pick.line} line sits ${gap} ${def.unit} ${over ? "above" : "below"} ${last}'s projection of ${proj}, so it needs one of ${last}'s ${over ? "best" : "quietest"} games.`,
      );
    }
  }

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

  const summary = buildSummary(ctx, score, results, projection?.value ?? null, shift);

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
    ...(shift ? { lineShift: shift } : {}),
  };
}

function buildSummary(ctx: PickContext, score: number, results: FactorResult[], projected: number | null, shift: LineShift): string {
  const def = MARKETS[ctx.pick.market];
  const last = lastName(ctx.player.name);
  const top = [...results].sort((a, b) => b.score - a.score)[0];
  const worst = [...results].sort((a, b) => a.score - b.score)[0];
  const unit = def.shortLabel.toLowerCase();
  const lineText =
    ctx.pick.line === null ? def.label.toLowerCase() : ctx.pick.direction === "under" ? `under ${ctx.pick.line} ${unit}` : `${ctx.pick.line}+ ${unit}`;

  if (shift === "cushion" && projected !== null) {
    return `${last} ${lineText} has a huge cushion: the projection is ${projected} ${def.unit}. It should clear unless something unusual happens, but a line this easy pays very little.`;
  }
  if (shift === "stretch" && projected !== null) {
    return `${last} ${lineText} asks for a lot: the projection is only ${projected} ${def.unit}. This needs a ceiling game to hit.`;
  }

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
