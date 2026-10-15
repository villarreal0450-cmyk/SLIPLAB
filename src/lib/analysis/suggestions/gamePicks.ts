import { describePick } from "@/lib/parlay/format";
import { marketOddsFor } from "@/lib/parlay/marketMath";
import { MARKETS, type Pick, type PickAnalysis, type ProjectedOutcome, type ScoreTier } from "@/lib/types";
import { scorePick } from "../scoring/engine";
import type { Candidate } from "./candidates";
import { toProjected, Workspace } from "./workspace";

/**
 * The analyst's own parlay for one game: what it would actually bet if it had
 * to pick from this game's lines. Built only from the engine's grades, so
 * every leg can be explained factor by factor.
 */

export type GamePickLeg = {
  pick: Pick;
  score: number;
  tier: ScoreTier;
  verdict: string;
  /** The single strongest reason for the leg, from the engine's bull case. */
  reason: string;
};

export type GamePicks =
  | {
      status: "ready";
      legs: GamePickLeg[];
      parlay: ProjectedOutcome & { summary: string };
      /** How the legs connect: correlations and the expected game script. */
      story: string[];
      /** The best leg on its own, for people who'd rather not parlay. */
      bestSingle: GamePickLeg;
      considered: number;
      /** True when some legs have a line but no price, so the payout is unknown. */
      pricesMissing: boolean;
    }
  | { status: "single_only"; bestSingle: GamePickLeg | null; reason: string; considered: number }
  | { status: "no_lines"; reason: string };

/** A leg must grade at least "good" to make the analyst's slip. */
const MIN_LEG_SCORE = 7.5;
/** Three legs is the sweet spot; a fourth only if it doesn't hurt the slip. */
const TARGET_LEGS = 3;
const MAX_LEGS = 4;
/** An extra leg may cost the slip this much grade, no more. */
const ADD_TOLERANCE = 0.4;
const UNAVAILABLE = new Set(["out", "ir", "doubtful"]);

type Graded = { pick: Pick; a: PickAnalysis };

export function buildGamePicks(candidates: Candidate[]): GamePicks {
  if (!candidates.length) {
    return { status: "no_lines", reason: "There are no sportsbook lines for this game yet, so there's nothing to grade. Lines usually post a few days before kickoff." };
  }

  const ws = new Workspace(candidates.map((c) => c.ctx));
  const graded: Graded[] = [];

  for (const { pick, ctx } of candidates) {
    const own = ctx.injuries.own.find((i) => i.playerId === pick.playerId);
    if (own && UNAVAILABLE.has(own.status)) continue;

    const sides: Pick[] = [pick];
    if (MARKETS[pick.market].kind === "over_under" && pick.line !== null) {
      sides.push({
        ...pick,
        id: pick.id.replace("-over-", "-under-"),
        direction: "under",
        odds: ctx.marketLine ? marketOddsFor(ctx.marketLine, "under", pick.line) : undefined,
      });
    }
    for (const side of sides) {
      const a = scorePick({ ...ctx, pick: side });
      // When the projection and the book's line are miles apart, the model is
      // the likelier one to be wrong (thin sample, role change). Skip it.
      if (a.lineShift) continue;
      graded.push({ pick: side, a });
    }
  }

  const ranked = graded.sort((x, y) => y.a.score - x.a.score);
  const considered = ranked.length;
  const best = ranked[0];
  if (!best) {
    return { status: "single_only", bestSingle: null, reason: "None of this game's lines could be graded with the data we have.", considered };
  }
  const bestSingle = toLeg(best);
  if (best.a.score < MIN_LEG_SCORE) {
    return {
      status: "single_only",
      bestSingle,
      reason: `Nothing in this game grades ${MIN_LEG_SCORE} or better, so I wouldn't build a parlay here. The best look is ${best.pick.playerName} ${describePick(best.pick)} at ${best.a.score.toFixed(1)}/10, and even that is a lean, not a strong play.`,
      considered,
    };
  }

  // Greedy build: add whichever good leg improves (or barely dents) the slip most.
  const pool = ranked.filter((g) => g.a.score >= MIN_LEG_SCORE).slice(0, 30);
  let legs: Graded[] = [best];
  let current = ws.evaluate(legs.map((l) => l.pick));

  while (legs.length < MAX_LEGS) {
    const usedPlayers = new Set(legs.map((l) => l.pick.playerId));
    let bestAdd: { g: Graded; after: ReturnType<Workspace["evaluate"]> } | null = null;
    for (const g of pool) {
      if (usedPlayers.has(g.pick.playerId)) continue;
      const after = ws.evaluate([...legs.map((l) => l.pick), g.pick]);
      // Never pair legs the correlation engine says pull against each other.
      const clashes = after.cohesion.findings.some((f) => f.pickIds.includes(g.pick.id) && f.strength < 0);
      if (clashes) continue;
      if (!bestAdd || after.score > bestAdd.after.score) bestAdd = { g, after };
    }
    if (!bestAdd) break;
    const tolerance = legs.length < TARGET_LEGS ? ADD_TOLERANCE : 0;
    if (bestAdd.after.score < current.score - tolerance) break;
    legs = [...legs, bestAdd.g];
    current = bestAdd.after;
  }

  if (legs.length < 2) {
    return {
      status: "single_only",
      bestSingle,
      reason: `Only one leg here grades well enough on its own terms, and stacking weaker legs on top would just add risk. If you play this game, I'd play ${best.pick.playerName} ${describePick(best.pick)} as a single.`,
      considered,
    };
  }

  const ids = new Set(legs.map((l) => l.pick.id));
  // Only script beats about a team the slip is betting on explain the slip.
  const teams = new Set(legs.flatMap((l) => {
    const team = ws.contextFor(l.pick).team;
    return [team.city, team.name];
  }));
  const beat = current.gameScripts[0]?.beats.find((b) => [...teams].some((t) => b.includes(t)));
  const story = [
    ...current.cohesion.findings.filter((f) => f.strength > 0 && f.pickIds.every((id) => ids.has(id))).map((f) => f.explanation),
    ...(beat ? [beat] : []),
  ];

  return {
    status: "ready",
    legs: legs.map(toLeg),
    parlay: { ...toProjected(current), summary: current.summary },
    story,
    bestSingle,
    considered,
    pricesMissing: legs.some((l) => l.pick.odds === undefined),
  };
}

function toLeg({ pick, a }: Graded): GamePickLeg {
  return { pick, score: a.score, tier: a.tier, verdict: a.verdict, reason: a.bullCase[0] ?? a.summary };
}
