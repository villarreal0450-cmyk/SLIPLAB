import { MARKETS } from "@/lib/types";
import { describePick } from "@/lib/parlay/format";
import type { AnalystBriefing } from "./types";

/**
 * Compact, structured view of the briefing for the language model. Only
 * fields the engine produced are included, and missing data is explicit, so
 * the model has nothing to invent and a clear signal when to say "unknown".
 */
export function toPromptContext(b: AnalystBriefing) {
  const a = b.analysis;
  const byId = new Map(b.picks.map((p) => [p.id, p]));
  const name = (id: string) => byId.get(id)?.playerName ?? id;

  return {
    data_source: a.dataSource.isMock ? "DEMO DATA — sample numbers, not live stats or lines" : a.dataSource.provider,
    parlay: {
      score_out_of_10: a.score,
      label: a.label,
      summary: a.summary,
      risk_level: a.riskLevel,
      combined_odds: a.combinedOdds,
      leg_count: a.legCount,
      cohesion: { score_out_of_100: a.cohesion.score, label: a.cohesion.label, summary: a.cohesion.summary },
      weakest_leg: a.weakestLeg ? { player: name(a.weakestLeg.pickId), reason: a.weakestLeg.reason } : null,
    },
    legs: b.picks.map((p) => {
      const pa = a.picks.find((x) => x.pickId === p.id);
      const ctx = b.contexts.find((c) => c.pick.id === p.id);
      const def = MARKETS[p.market];
      return {
        player: p.playerName,
        team: ctx?.team.abbreviation ?? p.meta?.teamAbbr ?? null,
        opponent: ctx?.opponent.abbreviation ?? p.meta?.opponentAbbr ?? null,
        pick: describePick(p),
        odds: p.odds ?? null,
        market_line: ctx?.marketLine?.line ?? null,
        score_out_of_10: pa?.score ?? null,
        verdict: pa?.verdict ?? null,
        projection: pa?.projection ? { value: pa.projection.value, unit: def.unit } : null,
        line_vs_projection:
          pa?.lineShift === "cushion"
            ? "huge cushion: the line is far easier than the projection"
            : pa?.lineShift === "stretch"
              ? "big stretch: the line is far harder than the projection"
              : "close to the projection",
        recent_games: ctx?.recentGames.map((g) => g.stats[def.statKey] ?? null) ?? [],
        season_average: ctx?.seasonStats?.averages[def.statKey] ?? null,
        factors: pa?.factors.map((f) => ({ factor: f.label, effect: f.impact, detail: f.explanation })) ?? [],
        bull_case: pa?.bullCase ?? [],
        bear_case: pa?.bearCase ?? [],
        missing_data: pa?.missingData ?? [],
      };
    }),
    correlations: a.cohesion.findings.map((f) => ({ legs: [name(f.pickIds[0]), name(f.pickIds[1])], type: f.type, detail: f.explanation })),
    game_scripts: a.gameScripts.map((s) => ({
      beats: s.beats,
      helped: s.helpedPickIds.map(name),
      hurt: s.hurtPickIds.map(name),
      what_breaks_it: s.breaker,
      confidence: s.confidence,
    })),
    rebuilds: b.suggestions.map((s) => ({
      profile: s.profile,
      unchanged: s.unchanged,
      projected_score: s.projected.score,
      projected_odds: s.projected.odds,
      changes: s.changes.filter((c) => c.type !== "keep").map((c) => ({ type: c.type, before: c.before ? `${c.before.playerName} ${describePick(c.before)}` : null, after: c.after ? `${c.after.playerName} ${describePick(c.after)}` : null, why: c.reason })),
    })),
    replacement_options_for_weakest: b.replaceOptions.map((o) => ({ pick: `${o.pick.playerName} ${describePick(o.pick)}`, odds: o.pick.odds ?? null, score: o.score, slip_score_after: o.parlayAfter.score, why: o.reason })),
    best_three: b.topThree ? { legs: b.topThree.picks.map((p) => `${p.playerName} ${describePick(p)}`), score: b.topThree.analysis.score, odds: b.topThree.analysis.combinedOdds } : null,
  };
}
