import { MARKETS } from "@/lib/types";
import { clamp, directionSign, isHit } from "../math";
import { impactFor, type ScoringFactor } from "../types";
import { readUsage } from "../usage";

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
    // Limited-role games (cut short by injury, first game back) count less.
    const usage = readUsage(ctx);
    const graded = ctx.recentGames
      .map((g, i) => ({ v: g.stats[def.statKey], w: usage.weights[i], date: g.date }))
      .filter((x): x is { v: number; w: number; date: string } => typeof x.v === "number");
    const totalW = graded.reduce((a, x) => a + x.w, 0);
    const hits = graded.filter((x) => isHit(x.v, line, ctx.pick.direction)).length;
    const hitRate = graded.reduce((a, x) => a + (isHit(x.v, line, ctx.pick.direction) ? x.w : 0), 0) / totalW;
    const avg = graded.reduce((a, x) => a + x.v * x.w, 0) / totalW;
    const marginRatio = line > 0 ? ((avg - line) / line) * sign : 0;
    const score = clamp(0.5 + (hitRate - 0.5) * 0.7 + clamp(marginRatio, -0.3, 0.3));

    const sideWord = sign > 0 ? "cleared" : "stayed under";
    const fmtAvg = avg >= 10 ? Math.round(avg) : Math.round(avg * 10) / 10;
    const limitedNote = usage.limited.length
      ? ` ${usage.limited.length === 1 ? "One game" : `${usage.limited.length} games`} with a limited role (${usage.limited
          .slice(0, 2)
          .map((l) => `${Math.round(l.usage)} ${usage.noun} vs a typical ${Math.round(l.typical)}`)
          .join("; ")}) ${usage.limited.length === 1 ? "counts" : "count"} less.`
      : "";
    return {
      key: this.key,
      label: this.label,
      score,
      weight: this.weight,
      impact: impactFor(score),
      explanation: `${sideWord[0].toUpperCase() + sideWord.slice(1)} ${line} in ${hits} of the last ${graded.length} games, averaging ${fmtAvg} ${def.unit}${usage.limited.length ? " after weighting" : ""}.${limitedNote}`,
      evidence: { hits, games: graded.length, average: Math.round(avg * 10) / 10, line, limitedGames: usage.limited.length },
    };
  },
};
