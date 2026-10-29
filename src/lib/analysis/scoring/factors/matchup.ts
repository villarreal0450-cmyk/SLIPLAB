import { MARKET_SIGNALS, SIGNALS, type MatchupSignal, type PickContext } from "@/lib/types";
import { clamp, directionSign } from "../math";
import { impactFor, type ScoringFactor } from "../types";

/**
 * How favorable the opponent is for this pick, 0 (toughest) .. 1 (softest),
 * from the one opponent tendency that moves the market. Null when the
 * opponent's numbers aren't available.
 */
export function matchupEdge(ctx: PickContext): { softness: number; signal: MatchupSignal; key: keyof typeof SIGNALS } | null {
  const spec = MARKET_SIGNALS[ctx.pick.market];
  const signal = ctx.opponentStats?.signals[spec.signal];
  if (!signal || signal.leagueSize < 2) return null;
  // Rank 1 = lowest value in the league.
  const high = (signal.rank - 1) / (signal.leagueSize - 1);
  return { softness: spec.higherHelpsOver ? high : 1 - high, signal, key: spec.signal };
}

export const matchup: ScoringFactor = {
  key: "matchup",
  label: "Matchup",
  weight: 1.0,
  evaluate(ctx) {
    const edge = matchupEdge(ctx);
    if (!edge) return null;
    const { softness, signal, key } = edge;
    const sign = directionSign(ctx.pick.direction);
    const score = clamp(0.5 + (softness - 0.5) * sign * 0.9);
    // Tone from the pick's side: a stingy defense is good news for an under.
    const tone = score >= 0.6 ? "Favorable" : score <= 0.4 ? "Tough" : "Neutral";
    return {
      key: this.key,
      label: this.label,
      score,
      weight: this.weight,
      impact: impactFor(score),
      explanation: `${tone} matchup: ${ctx.opponent.city} ${verbFor(key)} ${signal.perGame} ${SIGNALS[key].phrase}, ${standing(signal)}.`,
      evidence: { opponentRank: signal.rank, leagueSize: signal.leagueSize, perGame: signal.perGame, signal: key },
    };
  },
};

function verbFor(key: keyof typeof SIGNALS): string {
  if (key === "shotsFor" || key.startsWith("batting")) return "averages";
  if (key === "sacks") return "records";
  return "allows";
}

/** "the 3rd-most of 32" or "the 5th-fewest of 30". */
export function standing(s: MatchupSignal): string {
  const fromTop = s.leagueSize - s.rank + 1;
  return s.rank > s.leagueSize / 2 ? `the ${ordinal(fromTop)}-most of ${s.leagueSize}` : `the ${ordinal(s.rank)}-fewest of ${s.leagueSize}`;
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
