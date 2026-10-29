import { MARKETS, type PickContext, type Projection } from "@/lib/types";
import { matchupEdge } from "./factors/matchup";
import { readUsage } from "./usage";
import { clamp, normalCdf, stdev } from "./math";

/** The raw model behind the projection: center, spread and chance the pick clears. */
export type PickModel = { value: number; sd: number; pHit: number | null; sources: NonNullable<Projection["sources"]> };

/** How much each source counts when it is available (renormalized over what exists). */
const SOURCE_WEIGHTS = { stats: 0.4, experts: 0.35, market: 0.25 };

/**
 * Our stats model blends recent form (weighted by the role the player had in
 * each game), the season baseline and the matchup. That number is then blended
 * with professional projections (where published) and the betting market's
 * line, because a box-score average alone misses context the market and
 * analysts already price in: a player just back from injury, a new role.
 * The spread floor (25% of the projection) is wide on purpose: real stat
 * lines have fatter tails than a tidy bell curve. `pHit` is unclamped so the
 * engine can tell "very likely" from "near certain".
 */
export function modelPick(ctx: PickContext): PickModel | null {
  const def = MARKETS[ctx.pick.market];
  if (def.kind === "yes_no") return null;

  const recent = ctx.recentGames.map((g) => g.stats[def.statKey]);
  const season = ctx.seasonStats?.averages[def.statKey];
  const known = recent.filter((v): v is number => typeof v === "number");
  if (known.length < 3 && typeof season !== "number") return null;

  const { weights } = readUsage(ctx);
  let wSum = 0;
  let vSum = 0;
  recent.forEach((v, i) => {
    if (typeof v !== "number") return;
    wSum += weights[i];
    vSum += v * weights[i];
  });
  const recentAvg = wSum > 0 ? vSum / wSum : (season as number);
  const baseline = typeof season === "number" ? season : recentAvg;

  // Matchup multiplier: up to ±8% for the softest / toughest opponent.
  const edge = matchupEdge(ctx);
  const matchupMult = edge ? 1 + (edge.softness - 0.5) * 0.16 : 1;
  const stats = recentAvg * 0.5 + baseline * 0.3 + baseline * matchupMult * 0.2;

  const experts = ctx.expertProjection?.stats[def.statKey];
  const market = ctx.marketLine && !ctx.marketLine.milestone && ctx.marketLine.line !== null ? ctx.marketLine.line : undefined;
  const parts: [number, number][] = [[stats, SOURCE_WEIGHTS.stats]];
  if (typeof experts === "number" && experts > 0) parts.push([experts, SOURCE_WEIGHTS.experts]);
  if (typeof market === "number") parts.push([market, SOURCE_WEIGHTS.market]);
  const totalWeight = parts.reduce((a, [, w]) => a + w, 0);
  const value = parts.reduce((a, [v, w]) => a + v * w, 0) / totalWeight;

  const sd = Math.max(stdev(known), value * 0.25, 0.5);
  const sources = { stats: round1(stats), ...(typeof experts === "number" && experts > 0 ? { experts: round1(experts) } : {}), ...(typeof market === "number" ? { market } : {}) };
  const line = ctx.pick.line;
  if (line === null) return { value, sd, pHit: null, sources };

  // Whole-number lines ("250+") hit on >= line, so the threshold sits half a unit lower.
  const threshold = Number.isInteger(line) ? line - 0.5 : line;
  const pOver = 1 - normalCdf((threshold - value) / sd);
  return { value, sd, pHit: ctx.pick.direction === "over" ? pOver : 1 - pOver, sources };
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * A deliberately simple projection for the UI: a center value and a sketched
 * distribution. NOT a probability guarantee. Replace the model later without
 * touching UI.
 */
export function projectPick(ctx: PickContext): Projection | null {
  const model = modelPick(ctx);
  if (!model) return null;
  const { value, sd } = model;

  const buckets = 11;
  // Stats can't go negative, so the sketched distribution starts at zero at the lowest.
  const lo = Math.max(0, value - 2.5 * sd);
  const width = (value + 2.5 * sd - lo) / buckets;
  const distribution = Array.from({ length: buckets }, (_, i) => {
    const start = lo + i * width;
    const end = start + width;
    const weight = normalCdf((end - value) / sd) - normalCdf((start - value) / sd);
    return { bucketStart: Math.round(start), bucketEnd: Math.round(end), weight: Math.round(weight * 1000) / 1000 };
  });

  return { value: Math.round(value), line: ctx.pick.line, distribution, hitRate: clamp(model.pHit ?? 0.5, 0.02, 0.98), sources: model.sources };
}
