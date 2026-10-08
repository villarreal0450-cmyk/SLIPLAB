import { MARKETS } from "@/lib/types";
import { impliedProbability } from "@/lib/odds";
import { clamp, directionSign } from "../math";
import { impactFor, type ScoringFactor } from "../types";

/**
 * Compares the user's line to the market consensus. A line below market on an
 * over is easier to clear than what the book thinks is a coin flip; a line
 * above market is "aggressive" and the user should be asked to justify it.
 */
export const lineValue: ScoringFactor = {
  key: "line_value",
  label: "Line value",
  weight: 1.0,
  evaluate(ctx) {
    const def = MARKETS[ctx.pick.market];
    const market = ctx.marketLine;
    if (!market) return null;

    if (def.kind === "yes_no") {
      const price = ctx.pick.direction === "yes" ? market.overOdds : market.underOdds;
      const p = impliedProbability(price);
      const score = clamp(0.5 + (p - 0.5) * 0.6);
      return {
        key: this.key,
        label: this.label,
        score,
        weight: this.weight,
        impact: impactFor(score),
        explanation: `Market prices this at about ${Math.round(p * 100)}% (${price > 0 ? "+" : ""}${price}).`,
        evidence: { impliedProbability: p, odds: price },
      };
    }

    if (market.line === null || ctx.pick.line === null) return null;
    const sign = directionSign(ctx.pick.direction);
    const diffRatio = ((market.line - ctx.pick.line) / market.line) * sign;
    const score = clamp(0.5 + clamp(diffRatio * 4, -0.4, 0.4));
    const delta = Math.abs(market.line - ctx.pick.line);
    let explanation: string;
    if (Math.abs(diffRatio) < 0.015) {
      explanation = `Your ${ctx.pick.line} is right at the market line of ${market.line}.`;
    } else if (diffRatio > 0) {
      explanation = `Your ${ctx.pick.line} is ${delta} ${def.unit} easier than the market line of ${market.line}.`;
    } else {
      explanation = `Your ${ctx.pick.line} is ${delta} ${def.unit} more aggressive than the market line of ${market.line}.`;
    }
    return {
      key: this.key,
      label: this.label,
      score,
      weight: this.weight,
      impact: impactFor(score),
      explanation,
      evidence: { marketLine: market.line, userLine: ctx.pick.line, delta: market.line - ctx.pick.line },
    };
  },
};
