import { combineOdds } from "@/lib/odds";
import type { SportsDataProvider } from "@/lib/sports/provider";
import { MARKETS, tierForScore, type Parlay, type ParlayAnalysis, type PickAnalysis, type PickContext, type RiskLevel, type WeakestLeg } from "@/lib/types";
import { buildPickContext } from "../context/buildPickContext";
import { computeCohesion } from "../correlation/engine";
import { buildGameScript } from "../gameScript/engine";
import { scorePick } from "../scoring/engine";
import { clamp, mean, round1 } from "../scoring/math";

/**
 * Orchestrates a full parlay analysis:
 *   data collection -> per-pick scoring -> correlation -> game script -> aggregate.
 * The LLM explanation layer (later phase) consumes this output; it never
 * recomputes numbers.
 */
export async function analyzeParlay(parlay: Parlay, provider: SportsDataProvider): Promise<ParlayAnalysis> {
  const contexts = await Promise.all(parlay.picks.map((p) => buildPickContext(p, provider)));
  return analyzeParlayFromContexts(parlay, contexts);
}

export function analyzeParlayFromContexts(parlay: Parlay, contexts: PickContext[]): ParlayAnalysis {
  const picks = contexts.map((ctx) => scorePick(ctx));
  const cohesion = computeCohesion(contexts);

  const byGame = new Map<string, PickContext[]>();
  for (const ctx of contexts) {
    byGame.set(ctx.game.id, [...(byGame.get(ctx.game.id) ?? []), ctx]);
  }
  const gameScripts = [...byGame.values()]
    .map((group) => buildGameScript(group))
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const legCount = picks.length;
  const avg = mean(picks.map((p) => p.score));
  const min = picks.length ? Math.min(...picks.map((p) => p.score)) : 0;
  const legPenalty = Math.max(0, legCount - 4) * 0.3;
  const score = legCount
    ? round1(clamp(avg * 0.6 + min * 0.2 + (cohesion.score / 10) * 0.2 - legPenalty, 0, 10))
    : 0;
  const tier = tierForScore(score);

  const riskLevel = computeRisk(contexts);
  const weakestLeg = findWeakestLeg(picks, contexts);
  const combinedOdds = combineOdds(parlay.picks.map((p) => p.odds));

  return {
    parlayId: parlay.id,
    score,
    tier,
    label: structureLabel(score),
    summary: buildSummary(picks, contexts, cohesion.score, weakestLeg),
    riskLevel,
    cohesion,
    gameScripts,
    picks,
    weakestLeg,
    combinedOdds,
    legCount,
    dataSource: contexts[0]?.dataSource ?? { provider: "none", isMock: true, asOf: new Date().toISOString() },
    analyzedAt: new Date().toISOString(),
  };
}

export function structureLabel(score: number): string {
  if (score >= 8.5) return "Excellent structure";
  if (score >= 7.5) return "Strong structure";
  if (score >= 6) return "Shaky structure";
  return "Weak structure";
}

function computeRisk(contexts: PickContext[]): RiskLevel {
  if (!contexts.length) return "low";
  const avgVol = mean(contexts.map((c) => MARKETS[c.pick.market].volatility));
  const legs = contexts.length;
  const index = avgVol * 0.6 + (Math.min(legs, 9) - 1) / 8 * 0.4;
  if (index < 0.35) return "low";
  if (index < 0.55) return "medium";
  return "high";
}

function findWeakestLeg(picks: PickAnalysis[], contexts: PickContext[]): WeakestLeg | null {
  if (picks.length < 2) return null;
  const weakest = [...picks].sort((a, b) => a.score - b.score)[0];
  const ctx = contexts.find((c) => c.pick.id === weakest.pickId);
  const worstFactor = [...weakest.factors].sort((a, b) => a.score - b.score)[0];
  const def = ctx ? MARKETS[ctx.pick.market] : null;
  const reason =
    def && def.volatility >= 0.7
      ? `${def.label} legs are inherently volatile${worstFactor ? ` — ${lower(worstFactor.explanation)}` : "."}`
      : worstFactor?.explanation ?? "Lowest-scoring leg in the parlay.";
  return { pickId: weakest.pickId, reason, actions: ["why", "replace", "make_safer"] };
}

function buildSummary(picks: PickAnalysis[], contexts: PickContext[], cohesion: number, weakest: WeakestLeg | null): string {
  if (!picks.length) return "Add a pick to get started.";
  const strong = picks.filter((p) => p.score >= 7.5).length;
  const teams = new Set(contexts.map((c) => c.team.city));
  const teamText = teams.size === 1 ? `Your ${[...teams][0]} legs` : "Your legs";
  const cohesionText = cohesion >= 75 ? "work well together" : cohesion >= 60 ? "mostly fit together" : "don't tell one clear story";
  const weakCtx = weakest ? contexts.find((c) => c.pick.id === weakest.pickId) : null;
  const weakText = weakCtx
    ? ` One ${MARKETS[weakCtx.pick.market].label.toLowerCase()} leg adds ${picks.find((p) => p.pickId === weakest?.pickId)!.score < 6 ? "significant" : "some"} variance.`
    : "";
  return `${teamText} ${cohesionText}. ${strong} of ${picks.length} legs grade out as good or better.${weakText}`;
}

const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
