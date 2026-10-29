import { MARKETS } from "@/lib/types";
import { clamp, directionSign } from "../math";
import { impactFor, type ScoringFactor } from "../types";

/**
 * What professional analysts project for this game (NFL: ESPN's fantasy
 * analysts), against the pick's line. Their projection already accounts for
 * things a box score can't see, like a player easing back from injury or a
 * new role, so it gets real weight. Null when no projection is published.
 */
export const expertProjection: ScoringFactor = {
  key: "expert_projection",
  label: "Analyst projections",
  weight: 1.1,
  // Only the NFL has a published analyst projection feed.
  appliesTo: (ctx) => ctx.player.sport === "nfl" && MARKETS[ctx.pick.market].kind === "over_under",
  evaluate(ctx) {
    const def = MARKETS[ctx.pick.market];
    const proj = ctx.expertProjection?.stats[def.statKey];
    const line = ctx.pick.line;
    if (typeof proj !== "number" || !ctx.expertProjection || def.kind !== "over_under" || line === null || line <= 0) return null;

    const marginRatio = ((proj - line) / line) * directionSign(ctx.pick.direction);
    const score = clamp(0.5 + clamp(marginRatio, -0.35, 0.35) * 1.3);
    const gap = Math.abs(proj - line);
    const relation = gap < Math.max(0.5, line * 0.02) ? "right at" : proj > line ? "above" : "below";
    return {
      key: this.key,
      label: this.label,
      score,
      weight: this.weight,
      impact: impactFor(score),
      explanation: `${ctx.expertProjection.source} project ${proj} ${def.unit} this game, ${relation} the ${line} line.`,
      evidence: { projected: proj, line, source: ctx.expertProjection.source },
    };
  },
};
