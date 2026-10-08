import { MARKETS, type PickContext, type Projection } from "@/lib/types";
import { clamp, mean, normalCdf, stdev } from "./math";

/**
 * A deliberately simple projection: blend recent form, season baseline and a
 * matchup adjustment, then model the outcome as roughly normal. This is NOT a
 * probability guarantee; it exists to give the UI a "model projection" and a
 * distribution to draw. Replace with a real model later without touching UI.
 */
export function projectPick(ctx: PickContext): Projection | null {
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

  const value = (recentAvg * 0.5 + baseline * 0.3 + baseline * matchupMult * 0.2);
  const sd = Math.max(stdev(recent), value * 0.18);
  const line = ctx.pick.line;

  let hitRate = 0.5;
  if (line !== null) {
    const z = (line - value) / sd;
    const pOver = 1 - normalCdf(z);
    hitRate = ctx.pick.direction === "over" ? pOver : 1 - pOver;
  }

  const buckets = 11;
  const lo = value - 2.5 * sd;
  const width = (5 * sd) / buckets;
  const distribution = Array.from({ length: buckets }, (_, i) => {
    const start = lo + i * width;
    const end = start + width;
    const weight = normalCdf((end - value) / sd) - normalCdf((start - value) / sd);
    return { bucketStart: Math.round(start), bucketEnd: Math.round(end), weight: Math.round(weight * 1000) / 1000 };
  });

  return { value: Math.round(value), line, distribution, hitRate: clamp(hitRate, 0.02, 0.98) };
}
