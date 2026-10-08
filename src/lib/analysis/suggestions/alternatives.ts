import { lastName } from "@/lib/format/names";
import { formatOdds } from "@/lib/odds";
import { describePick, selectionKey } from "@/lib/parlay/format";
import { MARKETS, type LegAlternative, type ParlayAnalysis, type Pick, type PickContext } from "@/lib/types";
import type { Candidate } from "./candidates";
import { easierRungs, pickAnalysis, toProjected, withLine, Workspace } from "./workspace";

export type AlternativesMode = "safer" | "replace";

type Input = {
  pickId: string;
  mode: AlternativesMode;
  picks: Pick[];
  contexts: PickContext[];
  current: ParlayAnalysis;
  candidates: Candidate[];
};

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

/**
 * Options for one leg, from the weakest-leg card.
 *   safer:   the same pick on an easier line, or (for yes/no markets) the same
 *            player in a steadier market
 *   replace: the best other selections from the same game
 * Every option is scored inside the full slip so the user sees its effect.
 */
export function buildLegAlternatives({ pickId, mode, picks, contexts, current, candidates }: Input): LegAlternative[] {
  const target = picks.find((p) => p.id === pickId);
  if (!target) return [];
  const ws = new Workspace(contexts);
  for (const c of candidates) ws.add(c.ctx);
  const targetA = pickAnalysis(current, pickId);
  const targetScore = targetA?.score ?? 0;
  const taken = new Set(picks.filter((p) => p.id !== pickId).map(selectionKey));

  const trial = (next: Pick) => {
    const after = ws.evaluate(picks.map((p) => (p.id === pickId ? next : p)));
    const na = pickAnalysis(after, next.id)!;
    return { after, na };
  };

  const options: LegAlternative[] = [];

  if (mode === "safer") {
    const ctx = ws.contextFor(target);
    for (const rung of easierRungs(ctx, target).slice(0, 3)) {
      const next = withLine(target, ctx, rung);
      const { after, na } = trial(next);
      options.push({
        pick: next,
        kind: "easier_line",
        score: na.score,
        tier: na.tier,
        reason: `Same read with ${fmt(Math.abs(rung.line - target.line!))} ${MARKETS[target.market].unit} of cushion${na.projection ? ` — projection ${na.projection.value}` : ""}. Price ${formatOdds(rung.odds)}.`,
        parlayAfter: toProjected(after),
      });
    }

    if (options.length === 0) {
      // No ladder (e.g. anytime TD): look at the same player's steadier markets.
      for (const c of candidates) {
        if (c.pick.playerId !== target.playerId || c.pick.market === target.market || taken.has(selectionKey(c.pick))) continue;
        if (MARKETS[c.pick.market].volatility >= MARKETS[target.market].volatility) continue;
        const { after, na } = trial(c.pick);
        if (na.score <= targetScore) continue;
        options.push({
          pick: c.pick,
          kind: "other_market",
          score: na.score,
          tier: na.tier,
          reason: `Keeps ${lastName(target.playerName)} in the slip through a steadier market: ${describePick(c.pick)} grades ${na.score.toFixed(1)}/10 versus ${targetScore.toFixed(1)}.`,
          parlayAfter: toProjected(after),
        });
      }
    }
  } else {
    const busyPlayers = new Set(picks.filter((p) => p.id !== pickId).map((p) => p.playerId));
    for (const c of candidates) {
      if (c.pick.gameId !== target.gameId || taken.has(selectionKey(c.pick)) || selectionKey(c.pick) === selectionKey(target)) continue;
      if (busyPlayers.has(c.pick.playerId)) continue;
      const { after, na } = trial(c.pick);
      if (na.score <= targetScore) continue;
      const link = after.cohesion.findings.find((f) => f.pickIds.includes(c.pick.id) && f.strength > 0);
      options.push({
        pick: c.pick,
        kind: "replacement",
        score: na.score,
        tier: na.tier,
        reason: `Grades ${na.score.toFixed(1)}/10 versus ${targetScore.toFixed(1)} for ${lastName(target.playerName)}. ${na.bullCase[0] ?? ""}${link ? ` ${link.explanation}` : ""}`.trim(),
        parlayAfter: toProjected(after),
      });
    }
  }

  return options.sort((x, y) => y.parlayAfter.score - x.parlayAfter.score || y.score - x.score).slice(0, 3);
}
