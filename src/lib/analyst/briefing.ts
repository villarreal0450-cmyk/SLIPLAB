import { analyzeParlayFromContexts, buildPickContext } from "@/lib/analysis";
import { buildLegAlternatives, buildSuggestions, loadCandidates } from "@/lib/analysis/suggestions";
import type { SportsDataProvider } from "@/lib/sports/provider";
import type { Pick } from "@/lib/types";
import type { AnalystBriefing } from "./types";

/** Run the engine once and collect everything the analyst may talk about. */
export async function buildBriefing(picks: Pick[], provider: SportsDataProvider): Promise<AnalystBriefing> {
  const contexts = await Promise.all(picks.map((p) => buildPickContext(p, provider)));
  const analysis = analyzeParlayFromContexts({ id: "draft", picks }, contexts);
  const candidates = await loadCandidates(picks.map((p) => p.gameId), provider);
  const suggestions = buildSuggestions({ picks, contexts, current: analysis, candidates });
  const replaceOptions = analysis.weakestLeg
    ? buildLegAlternatives({ pickId: analysis.weakestLeg.pickId, mode: "replace", picks, contexts, current: analysis, candidates })
    : [];

  let topThree: AnalystBriefing["topThree"] = null;
  if (picks.length >= 4) {
    const best = [...analysis.picks].sort((a, b) => b.score - a.score).slice(0, 3).map((a) => a.pickId);
    const kept = picks.filter((p) => best.includes(p.id));
    topThree = { picks: kept, analysis: analyzeParlayFromContexts({ id: "top3", picks: kept }, contexts.filter((c) => best.includes(c.pick.id))) };
  }

  return { picks, contexts, analysis, suggestions, replaceOptions, topThree };
}
