import type { MarketKey, PickContext, StatKey } from "@/lib/types";

/** The volume stat behind each market: how much of a role the player had that game. */
export const USAGE_STAT: Partial<Record<MarketKey, { key: StatKey; noun: string }>> = {
  passing_yards: { key: "passAttempts", noun: "pass attempts" },
  passing_tds: { key: "passAttempts", noun: "pass attempts" },
  completions: { key: "passAttempts", noun: "pass attempts" },
  receiving_yards: { key: "targets", noun: "targets" },
  receptions: { key: "targets", noun: "targets" },
  rushing_yards: { key: "rushingAttempts", noun: "carries" },
  rushing_attempts: { key: "rushingAttempts", noun: "carries" },
  ...Object.fromEntries(
    (["points", "rebounds", "assists", "threes", "pra", "points_rebounds", "points_assists", "rebounds_assists", "steals", "blocks"] as const).map((m) => [
      m,
      { key: "minutes" as StatKey, noun: "minutes" },
    ]),
  ),
  ...Object.fromEntries((["nhl_points", "nhl_assists", "goals", "shots_on_goal"] as const).map((m) => [m, { key: "timeOnIce" as StatKey, noun: "minutes on ice" }])),
  saves: { key: "shotsAgainst", noun: "shots faced" },
  ...Object.fromEntries((["hits", "total_bases", "home_runs", "rbis", "runs", "hits_runs_rbis"] as const).map((m) => [m, { key: "atBats" as StatKey, noun: "at-bats" }])),
  ...Object.fromEntries(
    (["pitcher_strikeouts", "hits_allowed", "earned_runs", "outs_recorded"] as const).map((m) => [m, { key: "battersFaced" as StatKey, noun: "batters faced" }]),
  ),
};

/** Below this share of a player's typical volume, a game counts as a limited role. */
const LIMITED_SHARE = 0.6;

export type UsageRead = {
  /** One weight per recent game (0.35..1): limited-role games count less. */
  weights: number[];
  /** Recent games where the role was clearly smaller than usual, with the numbers. */
  limited: { index: number; usage: number; typical: number }[];
  typical: number | null;
  noun: string | null;
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Weigh each recent game by the role the player had in it. A game cut short
 * by injury, a first game back on a snap count, or a blowout benching tells
 * us little about a normal game, so it counts less instead of dragging the
 * projection down at full weight.
 */
export function readUsage(ctx: PickContext): UsageRead {
  const spec = USAGE_STAT[ctx.pick.market];
  const n = ctx.recentGames.length;
  const flat: UsageRead = { weights: Array(n).fill(1), limited: [], typical: null, noun: spec?.noun ?? null };
  if (!spec) return flat;
  const values = ctx.recentGames.map((g) => g.stats[spec.key]);
  const known = values.filter((v): v is number => typeof v === "number");
  if (known.length < 3) return flat;
  const typical = median(known);
  if (typical <= 0) return flat;
  const limited: UsageRead["limited"] = [];
  const weights = values.map((v, index) => {
    if (typeof v !== "number") return 1;
    const share = v / typical;
    if (share < LIMITED_SHARE) limited.push({ index, usage: v, typical });
    return Math.min(1, Math.max(0.35, share));
  });
  return { weights, limited, typical, noun: spec.noun };
}
