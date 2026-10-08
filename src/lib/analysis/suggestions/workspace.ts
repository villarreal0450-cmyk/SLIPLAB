import { combineOdds } from "@/lib/odds";
import { selectionKey } from "@/lib/parlay/format";
import { marketOddsFor } from "@/lib/parlay/marketMath";
import { MARKETS, type Direction, type ParlayAnalysis, type Pick, type PickAnalysis, type PickContext, type ProjectedOutcome } from "@/lib/types";
import { analyzeParlayFromContexts } from "../parlay/analyzeParlay";

/**
 * Shared machinery for suggestions: a context index so any variant of a pick
 * (new line, new player) can be re-scored without refetching data, plus line
 * ladders built only from prices the market actually lists.
 */

/** Juice beyond this makes a "safer" line pointless; we never suggest it. */
export const MAX_FAVORITE_ODDS = -250;

export class Workspace {
  private readonly index = new Map<string, PickContext>();

  constructor(contexts: PickContext[]) {
    for (const c of contexts) this.add(c);
  }

  add(ctx: PickContext) {
    const key = selectionKey(ctx.pick);
    if (!this.index.has(key)) this.index.set(key, ctx);
  }

  contextFor(pick: Pick): PickContext {
    const base = this.index.get(selectionKey(pick));
    if (!base) throw new Error(`No context for ${selectionKey(pick)}`);
    return { ...base, pick };
  }

  evaluate(picks: Pick[]): ParlayAnalysis {
    return analyzeParlayFromContexts({ id: "suggestion", picks }, picks.map((p) => this.contextFor(p)));
  }
}

export function toProjected(a: ParlayAnalysis): ProjectedOutcome {
  return {
    score: a.score,
    tier: a.tier,
    label: a.label,
    cohesion: a.cohesion.score,
    riskLevel: a.riskLevel,
    odds: a.combinedOdds,
    legCount: a.legCount,
  };
}

export function pickAnalysis(a: ParlayAnalysis, pickId: string): PickAnalysis | undefined {
  return a.picks.find((p) => p.pickId === pickId);
}

export type Rung = { line: number; odds: number };

/** Every line the market prices for this pick's direction, ascending. */
export function ladder(ctx: PickContext, direction: Direction): Rung[] {
  const m = ctx.marketLine;
  if (!m || m.line === null || MARKETS[m.market].kind === "yes_no") return [];
  const lines = [m.line, ...(m.alternates ?? []).map((a) => a.line)];
  return [...new Set(lines)]
    .sort((a, b) => a - b)
    .flatMap((line) => {
      const odds = marketOddsFor(m, direction, line);
      return odds === undefined ? [] : [{ line, odds }];
    });
}

/** Easier rungs for the bettor (lower for overs, higher for unders), closest first. */
export function easierRungs(ctx: PickContext, pick: Pick): Rung[] {
  if (pick.line === null) return [];
  const rungs = ladder(ctx, pick.direction).filter((r) => r.odds >= MAX_FAVORITE_ODDS);
  return pick.direction === "under"
    ? rungs.filter((r) => r.line > pick.line!)
    : rungs.filter((r) => r.line < pick.line!).reverse();
}

/** Harder rungs (higher payout), closest first. */
export function harderRungs(ctx: PickContext, pick: Pick): Rung[] {
  if (pick.line === null) return [];
  const rungs = ladder(ctx, pick.direction);
  return pick.direction === "under"
    ? rungs.filter((r) => r.line < pick.line!).reverse()
    : rungs.filter((r) => r.line > pick.line!);
}

export function withLine(pick: Pick, ctx: PickContext, rung: Rung): Pick {
  return {
    ...pick,
    id: `sg-${pick.playerId}-${pick.market}-${pick.direction}-${rung.line}`,
    line: rung.line,
    odds: rung.odds,
    isAlternate: ctx.marketLine?.line !== rung.line,
  };
}

export const oddsOf = (picks: Pick[]) => combineOdds(picks.map((p) => p.odds));

export const samePicks = (a: Pick[], b: Pick[]) =>
  a.length === b.length && a.every((p, i) => selectionKey(p) === selectionKey(b[i]) && p.line === b[i].line && p.direction === b[i].direction);
