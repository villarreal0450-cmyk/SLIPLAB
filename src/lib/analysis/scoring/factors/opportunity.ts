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
    const r = overRead(this, ctx);
    if (!r || ctx.pick.direction !== "under") return r;
    // Heavy usage is good news for an over and bad news for an under.
    const score = 1 - r.score;
    return { ...r, score, impact: impactFor(score) };
  },
};

/** Usage read from the over's point of view. */
function overRead(
  factor: ScoringFactor,
  ctx: Parameters<ScoringFactor["evaluate"]>[0],
) {
  const { market } = ctx.pick;
  const logs = ctx.recentGames;
  if (logs.length < 3) return null;

  const series = (key: Parameters<typeof pick>[1]) => pick(logs, key);

  if (
    market === "passing_yards" ||
    market === "passing_tds" ||
    market === "completions"
  ) {
    const attempts = series("passAttempts");
    if (!attempts.length) return null;
    const avg = mean(attempts);
    const score = clamp((avg - 24) / 16); // 24 att -> 0, 40 att -> 1
    return result(
      factor,
      score,
      `Averaging ${avg.toFixed(1)} pass attempts over the last ${attempts.length} games.`,
      { passAttempts: avg },
    );
  }

  if (market === "receiving_yards" || market === "receptions") {
    const targets = series("targets");
    const share = series("targetShare");
    if (!targets.length) return null;
    const avgTargets = mean(targets);
    const avgShare = share.length ? mean(share) : null;
    const trend =
      targets.length >= 4
        ? mean(targets.slice(0, 2)) - mean(targets.slice(2))
        : 0;
    // Backs see fewer targets than receivers, so they're judged on their own scale.
      const rb = ctx.player.position === "RB";
      const score = clamp((rb ? (avgTargets - 1) / 5 : (avgTargets - 3) / 8) + trend * 0.03); // WR: ~7 targets = neutral-plus; RB: ~3.5
    const shareText = avgShare
      ? ` (${Math.round(avgShare * 100)}% target share)`
      : "";
    return result(
      factor,
      score,
      `Seeing ${avgTargets.toFixed(1)} targets per game${shareText}.`,
      {
        targets: avgTargets,
        targetShare: avgShare,
        trend,
      },
    );
  }

  if (market === "rushing_yards" || market === "rushing_attempts") {
    const carries = series("rushingAttempts");
    if (!carries.length) return null;
    const avg = mean(carries);
    const score = clamp((avg - 8) / 14);
    return result(
      factor,
      score,
      `Handling ${avg.toFixed(1)} carries per game.`,
      { rushingAttempts: avg },
    );
  }

  const sport = ctx.player.sport;
  if (sport === "nba") {
    const mins = series("minutes");
    if (!mins.length) return null;
    const avg = mean(mins);
    const score = clamp((avg - 16) / 20); // 16 min -> 0, 36 min -> 1
    return result(
      factor,
      score,
      `Playing ${avg.toFixed(1)} minutes a game over the last ${mins.length}.`,
      { minutes: avg },
    );
  }

  if (sport === "nhl") {
    if (market === "saves") {
      const faced = series("shotsAgainst");
      if (!faced.length) return null;
      const avg = mean(faced);
      const score = clamp((avg - 22) / 12); // 22 shots -> 0, 34 -> 1
      return result(
        factor,
        score,
        `Facing ${avg.toFixed(1)} shots a game in recent starts.`,
        { shotsAgainst: avg },
      );
    }
    const toi = series("timeOnIce");
    if (!toi.length) return null;
    const avg = mean(toi);
    const score = clamp((avg - 10) / 12); // 10 min -> 0, 22 min -> 1
    return result(
      factor,
      score,
      `Logging ${avg.toFixed(1)} minutes of ice time a game.`,
      { timeOnIce: avg },
    );
  }

  if (sport === "mlb") {
    if (
      market === "pitcher_strikeouts" ||
      market === "hits_allowed" ||
      market === "earned_runs" ||
      market === "outs_recorded"
    ) {
      const bf = series("battersFaced");
      if (!bf.length) return null;
      const avg = mean(bf);
      const score = clamp((avg - 15) / 12); // 15 batters -> 0, 27 -> 1
      return result(
        factor,
        score,
        `Facing ${avg.toFixed(1)} batters a start, a measure of how long the leash is.`,
        { battersFaced: avg },
      );
    }
    const ab = series("atBats");
    if (!ab.length) return null;
    const avg = mean(ab);
    const score = clamp((avg - 2.5) / 2); // 2.5 AB -> 0, 4.5 -> 1
    return result(
      factor,
      score,
      `Getting ${avg.toFixed(1)} at-bats a game${avg >= 4 ? ", a sign of a high spot in the order" : ""}.`,
      { atBats: avg },
    );
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
    return result(factor, score, text, {
      redZoneTouches: rz.length ? avg : null,
      targets: tgt.length ? mean(tgt) : null,
    });
  }

  return null;
}

function pick(
  logs: { stats: Record<string, number | undefined> }[],
  key:
    | "passAttempts"
    | "targets"
    | "targetShare"
    | "rushingAttempts"
    | "redZoneTouches"
    | "minutes"
    | "timeOnIce"
    | "shotsAgainst"
    | "battersFaced"
    | "atBats",
) {
  return logs
    .map((l) => l.stats[key])
    .filter((v): v is number => typeof v === "number");
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
