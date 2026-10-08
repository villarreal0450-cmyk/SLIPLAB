import { mean } from "../math";
import { clamp } from "../math";
import { impactFor, type ScoringFactor } from "../types";

/**
 * Volume is the most stable predictor of yardage props. This factor looks at
 * the opportunity feeding the market: attempts for QBs, targets for receivers,
 * carries + red-zone work for backs.
 */
export const opportunity: ScoringFactor = {
  key: "opportunity",
  label: "Usage & opportunity",
  weight: 0.9,
  evaluate(ctx) {
    const { market } = ctx.pick;
    const logs = ctx.recentGames;
    if (logs.length < 3) return null;

    const series = (key: Parameters<typeof pick>[1]) => pick(logs, key);

    if (market === "passing_yards" || market === "passing_tds" || market === "completions") {
      const attempts = series("passAttempts");
      if (!attempts.length) return null;
      const avg = mean(attempts);
      const score = clamp((avg - 24) / 16); // 24 att -> 0, 40 att -> 1
      return result(this, score, `Averaging ${avg.toFixed(1)} pass attempts over the last ${attempts.length} games.`, { passAttempts: avg });
    }

    if (market === "receiving_yards" || market === "receptions") {
      const targets = series("targets");
      const share = series("targetShare");
      if (!targets.length) return null;
      const avgTargets = mean(targets);
      const avgShare = share.length ? mean(share) : null;
      const trend = targets.length >= 4 ? mean(targets.slice(0, 2)) - mean(targets.slice(2)) : 0;
      const score = clamp((avgTargets - 3) / 8 + trend * 0.03); // ~7 targets/game = neutral-plus
      const shareText = avgShare ? ` (${Math.round(avgShare * 100)}% target share)` : "";
      return result(this, score, `Seeing ${avgTargets.toFixed(1)} targets per game${shareText}.`, {
        targets: avgTargets,
        targetShare: avgShare,
        trend,
      });
    }

    if (market === "rushing_yards" || market === "rushing_attempts") {
      const carries = series("rushingAttempts");
      if (!carries.length) return null;
      const avg = mean(carries);
      const score = clamp((avg - 8) / 14);
      return result(this, score, `Handling ${avg.toFixed(1)} carries per game.`, { rushingAttempts: avg });
    }

    if (market === "anytime_td") {
      const rz = series("redZoneTouches");
      const tgt = series("targets");
      const source = rz.length ? rz : tgt;
      if (!source.length) return null;
      const avg = mean(source);
      const score = rz.length ? clamp((avg - 1) / 4) : clamp((avg - 4) / 8); // 3 RZ touches/game = neutral
      const text = rz.length
        ? `${avg.toFixed(1)} red-zone touches per game — ${avg >= 3.5 ? "solid" : avg >= 2.5 ? "decent" : "thin"} scoring opportunity.`
        : `${avg.toFixed(1)} targets per game; scoring chances depend on red-zone looks.`;
      return result(this, score, text, { redZoneTouches: rz.length ? avg : null, targets: tgt.length ? mean(tgt) : null });
    }

    return null;
  },
};

function pick(logs: { stats: Record<string, number | undefined> }[], key: "passAttempts" | "targets" | "targetShare" | "rushingAttempts" | "redZoneTouches") {
  return logs.map((l) => l.stats[key]).filter((v): v is number => typeof v === "number");
}

function result(
  factor: ScoringFactor,
  score: number,
  explanation: string,
  evidence: Record<string, number | null>,
) {
  return {
    key: factor.key,
    label: factor.label,
    score,
    weight: factor.weight,
    impact: impactFor(score),
    explanation,
    evidence,
  };
}
