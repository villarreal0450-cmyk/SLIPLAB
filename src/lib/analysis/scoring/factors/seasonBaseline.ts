import { MARKETS } from "@/lib/types";
import { clamp, directionSign } from "../math";
import { impactFor, type ScoringFactor } from "../types";

export const seasonBaseline: ScoringFactor = {
  key: "season_baseline",
  label: "Season baseline",
  weight: 0.8,
  evaluate(ctx) {
    const def = MARKETS[ctx.pick.market];
    const avg = ctx.seasonStats?.averages[def.statKey];
    if (typeof avg !== "number") return null;

    if (def.kind === "yes_no") {
      // avg here is the per-game rate of the event (e.g. 0.4 TDs per game).
      const score = clamp(0.5 + (avg - 0.45) * 0.9);
      return {
        key: this.key,
        label: this.label,
        score,
        weight: this.weight,
        impact: impactFor(score),
        explanation: `Finding the end zone in roughly ${Math.round(avg * 100)}% of games this season.`,
        evidence: { ratePerGame: avg },
      };
    }

    const line = ctx.pick.line ?? 0;
    if (line <= 0) return null;
    const marginRatio = ((avg - line) / line) * directionSign(ctx.pick.direction);
    const score = clamp(0.5 + clamp(marginRatio, -0.35, 0.35) * 1.3);
    const relation = avg > line ? "above" : avg < line ? "below" : "right at";
    return {
      key: this.key,
      label: this.label,
      score,
      weight: this.weight,
      impact: impactFor(score),
      explanation: `Season average of ${Math.round(avg * 10) / 10} ${def.unit} sits ${relation} the ${line} line.`,
      evidence: { seasonAverage: avg, line, gamesPlayed: ctx.seasonStats?.gamesPlayed ?? null },
    };
  },
};
