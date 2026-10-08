import { MARKETS } from "@/lib/types";
import { clamp, directionSign, isHit, mean } from "../math";
import { impactFor, type ScoringFactor } from "../types";

export const recentForm: ScoringFactor = {
  key: "recent_form",
  label: "Recent form",
  weight: 1.2,
  evaluate(ctx) {
    const def = MARKETS[ctx.pick.market];
    const values = ctx.recentGames
      .map((g) => g.stats[def.statKey])
      .filter((v): v is number => typeof v === "number");
    if (values.length < 3) return null;

    const sign = directionSign(ctx.pick.direction);

    if (def.kind === "yes_no") {
      const hits = values.filter((v) => v >= 1).length;
      const rate = hits / values.length;
      const score = clamp(0.5 + (rate - 0.45) * 0.9);
      return {
        key: this.key,
        label: this.label,
        score,
        weight: this.weight,
        impact: impactFor(score),
        explanation: `Scored in ${hits} of the last ${values.length} games.`,
        evidence: { hits, games: values.length },
      };
    }

    const line = ctx.pick.line ?? 0;
    const hits = values.filter((v) => isHit(v, line, ctx.pick.direction)).length;
    const hitRate = hits / values.length;
    const avg = mean(values);
    const marginRatio = line > 0 ? ((avg - line) / line) * sign : 0;
    const score = clamp(0.5 + (hitRate - 0.5) * 0.7 + clamp(marginRatio, -0.3, 0.3));

    const sideWord = sign > 0 ? "cleared" : "stayed under";
    return {
      key: this.key,
      label: this.label,
      score,
      weight: this.weight,
      impact: impactFor(score),
      explanation: `${sideWord[0].toUpperCase() + sideWord.slice(1)} ${line} in ${hits} of the last ${values.length} games, averaging ${Math.round(avg)} ${def.unit}.`,
      evidence: { hits, games: values.length, average: Math.round(avg * 10) / 10, line },
    };
  },
};
