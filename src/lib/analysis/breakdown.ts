import { MARKETS, type CorrelationFinding, type GameScript, type Injury, type MarketKey, type ParlayAnalysis, type Pick, type PickAnalysis, type PickContext, type StatKey, type Team } from "@/lib/types";
import { isHit } from "./scoring/math";

/**
 * Everything the pick breakdown screen renders, as plain data.
 * Built on the server from the same contexts the scoring engine used, so the
 * screen never shows a number the engine didn't see.
 */
export type PickBreakdown = {
  pick: Pick;
  analysis: PickAnalysis;
  player: { name: string; position: string; jerseyNumber: number | null; headshotUrl: string | null };
  team: Team;
  opponent: Team;
  game: {
    id: string;
    startsAt: string;
    venue: string | null;
    isHome: boolean;
    weather: { tempF: number; windMph: number | null; isDome: boolean; conditions: string | null } | null;
    spread: number | null; // from this player's team perspective; negative = favored
    total: number | null;
  };
  market: { label: string; shortLabel: string; unit: string; kind: "over_under" | "yes_no" };
  recentGames: RecentGame[];
  usage: { label: string; shortLabel: string; values: (number | null)[] } | null;
  season: { average: number | null; gamesPlayed: number };
  hitRate: { hits: number; games: number } | null;
  marketLine: { line: number | null; overOdds: number; underOdds: number } | null;
  defense: DefenseProfile | null;
  injuries: { own: Injury[]; opponent: Injury[] };
  gameScript: { script: GameScript; effect: "helped" | "hurt" | null } | null;
  correlations: { finding: CorrelationFinding; otherPlayer: string }[];
  dataSource: ParlayAnalysis["dataSource"];
};

export type RecentGame = {
  date: string;
  opponentAbbr: string;
  isHome: boolean;
  value: number | null;
  hit: boolean | null;
};

export type DefenseProfile = {
  pointsAllowed: number;
  passYardsAllowed: number;
  passRank: number;
  rushYardsAllowed: number;
  rushRank: number;
  wrYardsAllowed: number;
  sacksPerGame: number | null;
  /** Which unit matters most for this market. */
  focus: "pass" | "run";
};

const USAGE: Partial<Record<MarketKey, { key: StatKey; label: string; shortLabel: string }>> = {
  passing_yards: { key: "passAttempts", label: "Pass attempts", shortLabel: "Att" },
  passing_tds: { key: "passAttempts", label: "Pass attempts", shortLabel: "Att" },
  completions: { key: "passAttempts", label: "Pass attempts", shortLabel: "Att" },
  receiving_yards: { key: "targets", label: "Targets", shortLabel: "Tgt" },
  receptions: { key: "targets", label: "Targets", shortLabel: "Tgt" },
  rushing_yards: { key: "rushingAttempts", label: "Carries", shortLabel: "Car" },
  rushing_attempts: { key: "rushingAttempts", label: "Carries", shortLabel: "Car" },
  anytime_td: { key: "redZoneTouches", label: "Red-zone touches", shortLabel: "RZ touches" },
};

const RUN_MARKETS = new Set<MarketKey>(["rushing_yards", "rushing_attempts", "anytime_td"]);

export function buildPickBreakdown(
  pickId: string,
  contexts: PickContext[],
  parlay: ParlayAnalysis,
  teamsById: Record<string, Team>,
): PickBreakdown | null {
  const ctx = contexts.find((c) => c.pick.id === pickId);
  const analysis = parlay.picks.find((p) => p.pickId === pickId);
  if (!ctx || !analysis) return null;

  const def = MARKETS[ctx.pick.market];
  const isHome = ctx.game.homeTeamId === ctx.team.id;

  // Oldest -> newest reads left to right like a timeline.
  const recentGames: RecentGame[] = [...ctx.recentGames].reverse().map((g) => {
    const value = g.stats[def.statKey];
    const v = typeof value === "number" ? value : null;
    let hit: boolean | null = null;
    if (v !== null) {
      if (def.kind === "yes_no") hit = ctx.pick.direction === "no" ? v < 1 : v >= 1;
      else if (ctx.pick.line !== null) hit = isHit(v, ctx.pick.line, ctx.pick.direction);
    }
    return { date: g.date, opponentAbbr: teamsById[g.opponentTeamId]?.abbreviation ?? "OPP", isHome: g.isHome, value: v, hit };
  });

  const usageDef = USAGE[ctx.pick.market];
  const usageValues = usageDef ? [...ctx.recentGames].reverse().map((g) => g.stats[usageDef.key] ?? null) : [];
  const usage = usageDef && usageValues.some((v) => v !== null) ? { label: usageDef.label, shortLabel: usageDef.shortLabel, values: usageValues } : null;

  const graded = recentGames.filter((g) => g.hit !== null);
  const d = ctx.opponentStats?.defense;
  const odds = ctx.gameOdds;
  const script = parlay.gameScripts.find((s) => s.gameId === ctx.game.id) ?? null;

  const correlations = parlay.cohesion.findings
    .filter((f) => f.pickIds.includes(pickId))
    .map((finding) => {
      const otherId = finding.pickIds[0] === pickId ? finding.pickIds[1] : finding.pickIds[0];
      const other = contexts.find((c) => c.pick.id === otherId);
      return { finding, otherPlayer: other?.player.name ?? "Another leg" };
    });

  return {
    pick: ctx.pick,
    analysis,
    player: { name: ctx.player.name, position: ctx.player.position, jerseyNumber: ctx.player.jerseyNumber ?? null, headshotUrl: ctx.player.headshotUrl ?? null },
    team: ctx.team,
    opponent: ctx.opponent,
    game: {
      id: ctx.game.id,
      startsAt: ctx.game.startsAt,
      venue: ctx.game.venue ?? null,
      isHome,
      weather: ctx.game.weather
        ? { tempF: ctx.game.weather.tempF, windMph: ctx.game.weather.windMph, isDome: ctx.game.weather.isDome, conditions: ctx.game.weather.conditions ?? null }
        : null,
      spread: odds ? (isHome ? odds.homeSpread : -odds.homeSpread) : null,
      total: odds?.total ?? null,
    },
    market: { label: def.label, shortLabel: def.shortLabel, unit: def.unit, kind: def.kind },
    recentGames,
    usage,
    season: {
      average: ctx.seasonStats?.averages[def.statKey] ?? null,
      gamesPlayed: ctx.seasonStats?.gamesPlayed ?? 0,
    },
    hitRate: graded.length ? { hits: graded.filter((g) => g.hit).length, games: graded.length } : null,
    marketLine: ctx.marketLine ? { line: ctx.marketLine.line, overOdds: ctx.marketLine.overOdds, underOdds: ctx.marketLine.underOdds } : null,
    defense: d
      ? {
          pointsAllowed: d.pointsAllowedPerGame,
          passYardsAllowed: d.passYardsAllowedPerGame,
          passRank: d.passYardsAllowedRank,
          rushYardsAllowed: d.rushYardsAllowedPerGame,
          rushRank: d.rushYardsAllowedRank,
          wrYardsAllowed: d.receivingYardsAllowedPerGame,
          sacksPerGame: d.sacksPerGame,
          focus: RUN_MARKETS.has(ctx.pick.market) ? "run" : "pass",
        }
      : null,
    injuries: ctx.injuries,
    gameScript: script
      ? { script, effect: script.helpedPickIds.includes(pickId) ? "helped" : script.hurtPickIds.includes(pickId) ? "hurt" : null }
      : null,
    correlations,
    dataSource: parlay.dataSource,
  };
}
