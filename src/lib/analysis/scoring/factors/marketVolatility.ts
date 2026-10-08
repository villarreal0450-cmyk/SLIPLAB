import { MARKETS } from "@/lib/types";
import { impactFor, type ScoringFactor } from "../types";

/**
 * Some markets are inherently coin-flippy regardless of the player. Anytime TD
 * is the classic example: usage can be great and the ball still goes elsewhere.
 */
export const marketVolatility: ScoringFactor = {
  key: "market_volatility",
  label: "Market volatility",
  weight: 0.5,
  evaluate(ctx) {
    const def = MARKETS[ctx.pick.market];
    const score = 1 - def.volatility;
    const explanation =
      def.volatility >= 0.7
        ? `${def.label} is a high-variance market — outcomes swing on a single play.`
        : def.volatility >= 0.45
          ? `${def.label} has moderate game-to-game variance.`
          : `${def.label} is a relatively stable market driven by volume.`;
    return {
      key: this.key,
      label: this.label,
      score,
      weight: this.weight,
      impact: impactFor(score),
      explanation,
      evidence: { volatility: def.volatility },
    };
  },
};
