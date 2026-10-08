import { MARKETS, type MarketKey, type TeamStats } from "@/lib/types";
import { clamp, directionSign } from "../math";
import { impactFor, type ScoringFactor } from "../types";

const LEAGUE_TEAMS = 32;

/** Which defensive stat matters for each market. */
function defenseSignal(market: MarketKey, d: TeamStats["defense"]): { rank: number; perGame: number; label: string } | null {
  switch (market) {
    case "passing_yards":
    case "passing_tds":
    case "completions":
      return { rank: d.passYardsAllowedRank, perGame: d.passYardsAllowedPerGame, label: "pass yds/g" };
    case "receiving_yards":
    case "receptions":
      return { rank: d.passYardsAllowedRank, perGame: d.receivingYardsAllowedToWrPerGame, label: "receiving yds/g to WRs" };
    case "rushing_yards":
    case "rushing_attempts":
      return { rank: d.rushYardsAllowedRank, perGame: d.rushYardsAllowedPerGame, label: "rush yds/g" };
    case "anytime_td":
      return { rank: d.rushYardsAllowedRank, perGame: d.rushTdsAllowedPerGame, label: "rush TDs/g" };
    default:
      return null;
  }
}

export const matchup: ScoringFactor = {
  key: "matchup",
  label: "Matchup",
  weight: 1.0,
  evaluate(ctx) {
    if (!ctx.opponentStats) return null;
    const signal = defenseSignal(ctx.pick.market, ctx.opponentStats.defense);
    if (!signal) return null;

    // Rank 1 = best defense. A worse defense (higher rank) helps overs.
    const weakness = (signal.rank - 1) / (LEAGUE_TEAMS - 1);
    const sign = directionSign(ctx.pick.direction);
    const score = clamp(0.5 + (weakness - 0.5) * sign * 0.9);
    const def = MARKETS[ctx.pick.market];
    const tone = weakness >= 0.6 ? "Favorable" : weakness <= 0.35 ? "Tough" : "Neutral";
    return {
      key: this.key,
      label: this.label,
      score,
      weight: this.weight,
      impact: impactFor(score),
      explanation: `${tone} matchup: ${ctx.opponent.city} allows ${signal.perGame} ${signal.label} (${ordinal(signal.rank)} in the league) against ${def.shortLabel.toLowerCase()}.`,
      evidence: { opponentRank: signal.rank, allowedPerGame: signal.perGame },
    };
  },
};

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
