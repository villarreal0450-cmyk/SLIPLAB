import { MARKETS, type PickContext, type Projection } from "@/lib/types";
import { clamp, mean, normalCdf, stdev } from "./math";

/** The raw model behind the projection: center, spread and chance the pick clears. */
export type PickModel = { value: number; sd: number; pHit: number | null };

/**
 * Blend recent form, season baseline and a matchup adjustment, then model the
 * outcome as roughly normal. The spread floor (25% of the projection) is wide
 * on purpose: real stat lines have fatter tails than a tidy bell curve.
 * `pHit` is unclamped so the engine can tell "very likely" from "near certain".
 */
export function modelPick(ctx: PickContext): PickModel | null {
  const def = MARKETS[ctx.pick.market];
  if (def.kind === "yes_no") return null;

  const recent = ctx.recentGames.map((g) => g.stats[def.statKey]).filter((v): v is number => typeof v === "number");
  const season = ctx.seasonStats?.averages[def.statKey];
  if (recent.length < 3 && typeof season !== "number") return null;

  const recentAvg = recent.length ? mean(recent) : (season as number);
  const baseline = typeof season === "number" ? season : recentAvg;

  // Matchup multiplier: opponent allows X vs a rough league average.
  let matchupMult = 1;
  const d = ctx.opponentStats?.defense;
  if (d) {
    const isPass = ["passing_yards", "completions", "passing_tds", "receiving_yards", "receptions"].includes(ctx.pick.market);
    const rank = isPass ? d.passYardsAllowedRank : d.rushYardsAllowedRank;
    matchupMult = 1 + ((rank - 16.5) / 31) * 0.16; // ±8%
  }

  const value = recentAvg * 0.5 + baseline * 0.3 + baseline * matchupMult * 0.2;
  const sd = Math.max(stdev(recent), value * 0.25, 0.5);
  const line = ctx.pick.line;
  if (line === null) return { value, sd, pHit: null };

  // Whole-number lines ("250+") hit on >= line, so the threshold sits half a unit lower.
  const threshold = Number.isInteger(line) ? line - 0.5 : line;
  const pOver = 1 - normalCdf((threshold - value) / sd);
  return { value, sd, pHit: ctx.pick.direction === "over" ? pOver : 1 - pOver };
}

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

  return { value: Math.round(value), line: ctx.pick.line, distribution, hitRate: clamp(model.pHit ?? 0.5, 0.02, 0.98) };
}
