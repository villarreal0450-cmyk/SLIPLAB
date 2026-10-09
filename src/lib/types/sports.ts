/**
 * Sports domain types. These are provider-agnostic: every SportsDataProvider
 * (mock, future real APIs) must map its payloads into these shapes.
 */

export type SportKey = "nfl" | "nba" | "mlb" | "nhl" | "ncaaf";

export const SPORTS: Record<SportKey, { label: string; league: string }> = {
  nfl: { label: "NFL", league: "National Football League" },
  nba: { label: "NBA", league: "National Basketball Association" },
  mlb: { label: "MLB", league: "Major League Baseball" },
  nhl: { label: "NHL", league: "National Hockey League" },
  ncaaf: { label: "NCAAF", league: "NCAA Football" },
};

export type Team = {
  id: string;
  sport: SportKey;
  abbreviation: string; // "DAL"
  city: string; // "Dallas"
  name: string; // "Cowboys"
  /** Primary brand color for subtle UI accents (hex). */
  color: string;
  logoUrl?: string;
};

export type Position =
  | "QB"
  | "RB"
  | "WR"
  | "TE"
  | "K"
  | "DEF"
  | "OL"
  | "DL"
  | "LB"
  | "CB"
  | "DB"
  | "S"
  | "PG"
  | "SG"
  | "SF"
  | "PF"
  | "C"
  | "SP"
  | "RP"
  | "DH"
  | "IF"
  | "OF"
  | "G"
  | "D"
  | "LW"
  | "RW"
  | "F";

export type Player = {
  id: string;
  sport: SportKey;
  teamId: string;
  name: string;
  position: Position;
  jerseyNumber?: number;
  headshotUrl?: string;
};

export type GameStatus = "scheduled" | "live" | "final" | "postponed";

export type Game = {
  id: string;
  sport: SportKey;
  homeTeamId: string;
  awayTeamId: string;
  /** ISO 8601 kickoff / tip-off. */
  startsAt: string;
  status: GameStatus;
  venue?: string;
  week?: number;
  homeScore?: number;
  awayScore?: number;
  weather?: GameWeather;
};

export type GameWeather = {
  tempF: number;
  /** Null when the source doesn't report it (ESPN gives temperature and conditions only). */
  windMph: number | null;
  precipitationChance: number | null; // 0..1
  conditions?: string;
  isDome: boolean;
};

export type InjuryStatus = "out" | "doubtful" | "questionable" | "probable" | "ir";

export type Injury = {
  playerId: string;
  playerName: string;
  teamId: string;
  position: Position;
  status: InjuryStatus;
  description: string;
  updatedAt: string;
};

/**
 * Stat keys are intentionally a flat string union so new markets can be added
 * without touching every consumer. Each PlayerGameLog carries a partial map.
 */
export type StatKey =
  | "passingYards"
  | "passingTds"
  | "passAttempts"
  | "completions"
  | "interceptions"
  | "rushingYards"
  | "rushingAttempts"
  | "rushingTds"
  | "receivingYards"
  | "receptions"
  | "targets"
  | "receivingTds"
  | "anytimeTd"
  | "redZoneTouches"
  | "snapShare"
  | "targetShare"
  | "points"
  | "rebounds"
  | "assists"
  | "threes"
  | "minutes";

export type StatLine = Partial<Record<StatKey, number>>;

export type PlayerGameLog = {
  playerId: string;
  gameId: string;
  opponentTeamId: string;
  date: string;
  isHome: boolean;
  stats: StatLine;
};

export type PlayerSeasonStats = {
  playerId: string;
  season: number;
  gamesPlayed: number;
  /** Per-game averages. */
  averages: StatLine;
};

export type TeamStats = {
  teamId: string;
  season: number;
  gamesPlayed: number;
  /** Offensive tendencies. */
  offense: {
    pointsPerGame: number;
    passRate: number; // 0..1 neutral-situation pass rate
    playsPerGame: number;
    passYardsPerGame: number;
    rushYardsPerGame: number;
  };
  /** What the defense allows, with league rank (1 = best defense). */
  defense: {
    pointsAllowedPerGame: number;
    passYardsAllowedPerGame: number;
    passYardsAllowedRank: number;
    rushYardsAllowedPerGame: number;
    rushYardsAllowedRank: number;
    /** Receiving yards allowed per game, all receivers. */
    receivingYardsAllowedPerGame: number;
    rushTdsAllowedPerGame: number;
    /** Defensive sacks per game; null when unavailable. */
    sacksPerGame: number | null;
  };
};

/**
 * Market keys describe what is being bet. Metadata lives in
 * `MARKETS` so UI and engine never hardcode labels or volatility.
 */
export type MarketKey =
  | "passing_yards"
  | "passing_tds"
  | "completions"
  | "rushing_yards"
  | "rushing_attempts"
  | "receiving_yards"
  | "receptions"
  | "anytime_td"
  | "points"
  | "rebounds"
  | "assists"
  | "threes";

export type MarketKind = "over_under" | "yes_no";

export type MarketDefinition = {
  key: MarketKey;
  sport: SportKey[];
  label: string; // "Passing Yards"
  shortLabel: string; // "Pass Yds"
  unit: string; // "yds"
  kind: MarketKind;
  /** Which stat in a game log settles this market. */
  statKey: StatKey;
  /** Inherent game-to-game variance of the market, 0 (stable) .. 1 (coin flip). */
  volatility: number;
  /** Positions this market applies to (used by the pick builder). */
  positions: Position[];
};

export const MARKETS: Record<MarketKey, MarketDefinition> = {
  passing_yards: {
    key: "passing_yards",
    sport: ["nfl", "ncaaf"],
    label: "Passing Yards",
    shortLabel: "Pass Yds",
    unit: "yds",
    kind: "over_under",
    statKey: "passingYards",
    volatility: 0.35,
    positions: ["QB"],
  },
  passing_tds: {
    key: "passing_tds",
    sport: ["nfl", "ncaaf"],
    label: "Passing Touchdowns",
    shortLabel: "Pass TDs",
    unit: "TDs",
    kind: "over_under",
    statKey: "passingTds",
    volatility: 0.6,
    positions: ["QB"],
  },
  completions: {
    key: "completions",
    sport: ["nfl", "ncaaf"],
    label: "Completions",
    shortLabel: "Comp",
    unit: "comp",
    kind: "over_under",
    statKey: "completions",
    volatility: 0.3,
    positions: ["QB"],
  },
  rushing_yards: {
    key: "rushing_yards",
    sport: ["nfl", "ncaaf"],
    label: "Rushing Yards",
    shortLabel: "Rush Yds",
    unit: "yds",
    kind: "over_under",
    statKey: "rushingYards",
    volatility: 0.45,
    positions: ["RB", "QB", "WR"],
  },
  rushing_attempts: {
    key: "rushing_attempts",
    sport: ["nfl", "ncaaf"],
    label: "Rushing Attempts",
    shortLabel: "Rush Att",
    unit: "att",
    kind: "over_under",
    statKey: "rushingAttempts",
    volatility: 0.3,
    positions: ["RB", "QB"],
  },
  receiving_yards: {
    key: "receiving_yards",
    sport: ["nfl", "ncaaf"],
    label: "Receiving Yards",
    shortLabel: "Rec Yds",
    unit: "yds",
    kind: "over_under",
    statKey: "receivingYards",
    volatility: 0.5,
    positions: ["WR", "TE", "RB"],
  },
  receptions: {
    key: "receptions",
    sport: ["nfl", "ncaaf"],
    label: "Receptions",
    shortLabel: "Rec",
    unit: "rec",
    kind: "over_under",
    statKey: "receptions",
    volatility: 0.35,
    positions: ["WR", "TE", "RB"],
  },
  anytime_td: {
    key: "anytime_td",
    sport: ["nfl", "ncaaf"],
    label: "Anytime Touchdown",
    shortLabel: "Anytime TD",
    unit: "",
    kind: "yes_no",
    statKey: "anytimeTd",
    volatility: 0.8,
    positions: ["RB", "WR", "TE", "QB"],
  },
  points: {
    key: "points",
    sport: ["nba"],
    label: "Points",
    shortLabel: "Pts",
    unit: "pts",
    kind: "over_under",
    statKey: "points",
    volatility: 0.35,
    positions: ["PG", "SG", "SF", "PF", "C"],
  },
  rebounds: {
    key: "rebounds",
    sport: ["nba"],
    label: "Rebounds",
    shortLabel: "Reb",
    unit: "reb",
    kind: "over_under",
    statKey: "rebounds",
    volatility: 0.45,
    positions: ["PG", "SG", "SF", "PF", "C"],
  },
  assists: {
    key: "assists",
    sport: ["nba"],
    label: "Assists",
    shortLabel: "Ast",
    unit: "ast",
    kind: "over_under",
    statKey: "assists",
    volatility: 0.45,
    positions: ["PG", "SG", "SF", "PF", "C"],
  },
  threes: {
    key: "threes",
    sport: ["nba"],
    label: "3-Pointers Made",
    shortLabel: "3PM",
    unit: "3PM",
    kind: "over_under",
    statKey: "threes",
    volatility: 0.6,
    positions: ["PG", "SG", "SF", "PF", "C"],
  },
};

export type Direction = "over" | "under" | "yes" | "no";

/** A line currently offered by the market for a player/market pair. */
export type MarketLine = {
  playerId: string;
  gameId: string;
  market: MarketKey;
  /** Consensus line (e.g. 265.5). Null for yes/no markets. */
  line: number | null;
  /** American odds. NaN when the source posts the line without a price (ESPN's free sportsbook feed). */
  overOdds: number;
  underOdds: number;
  /** Alternate lines the book offers, ascending. */
  alternates?: { line: number; overOdds: number; underOdds: number }[];
  updatedAt: string;
  /**
   * False for a market we offer without a sportsbook quote (no odds source
   * connected, or the book hasn't posted it). Line and odds are then unknown:
   * `line` is null and prices are NaN. Defaults to true.
   */
  priced?: boolean;
};

/** Markets offered for each position when no sportsbook quote exists, most stable first. */
export const DEFAULT_MARKETS_BY_POSITION: Partial<Record<Position, MarketKey[]>> = {
  QB: ["passing_yards", "completions", "passing_tds", "rushing_yards", "anytime_td"],
  RB: ["rushing_yards", "rushing_attempts", "receptions", "receiving_yards", "anytime_td"],
  WR: ["receiving_yards", "receptions", "anytime_td"],
  TE: ["receiving_yards", "receptions", "anytime_td"],
};

export function unpricedMarket(playerId: string, gameId: string, market: MarketKey): MarketLine {
  return { playerId, gameId, market, line: null, overOdds: Number.NaN, underOdds: Number.NaN, updatedAt: "", priced: false };
}

export type GameOdds = {
  gameId: string;
  /** Spread from the home team's perspective (negative = home favored). */
  homeSpread: number;
  total: number;
  homeMoneyline: number | null;
  awayMoneyline: number | null;
  /** Which book the line came from, when known. */
  source?: string;
  updatedAt: string;
};
