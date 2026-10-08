import type { MarketKey, TeamStats } from "@/lib/types";
import { clamp, directionSign } from "../math";
import { impactFor, type ScoringFactor } from "../types";

const LEAGUE_TEAMS = 32;

/** Which defensive stat matters for each market. */
function defenseSignal(market: MarketKey, d: TeamStats["defense"]): { rank: number; perGame: number; label: string; unit: "pass" | "run" } | null {
  switch (market) {
    case "passing_yards":
    case "passing_tds":
    case "completions":
      return { rank: d.passYardsAllowedRank, perGame: d.passYardsAllowedPerGame, label: "passing yards per game", unit: "pass" };
    case "receiving_yards":
    case "receptions":
      return { rank: d.passYardsAllowedRank, perGame: d.receivingYardsAllowedToWrPerGame, label: "receiving yards per game to wideouts", unit: "pass" };
    case "rushing_yards":
    case "rushing_attempts":
      return { rank: d.rushYardsAllowedRank, perGame: d.rushYardsAllowedPerGame, label: "rushing yards per game", unit: "run" };
    case "anytime_td":
      return { rank: d.rushYardsAllowedRank, perGame: d.rushTdsAllowedPerGame, label: "rushing TDs per game", unit: "run" };
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
    const tone = weakness >= 0.6 ? "Favorable" : weakness <= 0.35 ? "Tough" : "Neutral";
    return {
      key: this.key,
      label: this.label,
      score,
      weight: this.weight,
      impact: impactFor(score),
      explanation: `${tone} matchup: ${ctx.opponent.city} allows ${signal.perGame} ${signal.label}, the ${ordinal(signal.rank)}-ranked ${signal.unit} defense of ${LEAGUE_TEAMS}.`,
      evidence: { opponentRank: signal.rank, allowedPerGame: signal.perGame },
    };
  },
};

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
