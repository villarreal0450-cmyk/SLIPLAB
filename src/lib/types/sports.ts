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

/** True for positions that only exist in one sport, so callers can't confuse an NBA "C" with an MLB "C". */
export type SportPosition = { sport: SportKey; position: Position };

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
  | "minutes"
  | "steals"
  | "blocks"
  | "pointsReboundsAssists"
  | "pointsRebounds"
  | "pointsAssists"
  | "reboundsAssists"
  // Hockey (points and assists reuse the keys above; logs are per player, so sports never mix)
  | "goals"
  | "shotsOnGoal"
  | "saves"
  | "shotsAgainst"
  | "timeOnIce"
  | "goalieStarted"
  // Baseball: batters
  | "atBats"
  | "hits"
  | "doubles"
  | "triples"
  | "homeRuns"
  | "rbis"
  | "runs"
  | "totalBases"
  | "hitsRunsRbis"
  // Baseball: pitchers
  | "pitcherStrikeouts"
  | "hitsAllowed"
  | "earnedRuns"
  | "outsRecorded"
  | "battersFaced";

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
  /**
   * Set when the current season is too thin (a player back from injury, the
   * first weeks of a season) and last season's games were blended in.
   */
  lastSeasonGames?: number;
};

/**
 * One opponent tendency the matchup factor can read, ranked across the league.
 * Rank 1 is the LOWEST value (e.g. fewest points allowed); whether a high
 * value helps an over depends on the market (see MARKET_SIGNALS).
 */
export type MatchupSignal = { perGame: number; rank: number; leagueSize: number };

export type SignalKey =
  // football defense
  | "passYardsAllowed"
  | "receivingYardsAllowed"
  | "rushYardsAllowed"
  | "rushTdsAllowed"
  | "pointsAllowed"
  | "sacks"
  // hockey
  | "goalsAllowed"
  | "shotsAllowed"
  | "shotsFor"
  // baseball: the opponent's pitching staff…
  | "hitsAllowed"
  | "runsAllowed"
  | "homeRunsAllowed"
  // …and the opponent's lineup, for pitcher markets
  | "battingStrikeouts"
  | "battingHits"
  | "battingRuns";

export const SIGNALS: Record<SignalKey, { label: string; phrase: string }> = {
  passYardsAllowed: { label: "Pass yards allowed / game", phrase: "passing yards a game" },
  receivingYardsAllowed: { label: "Receiving yards allowed / game", phrase: "receiving yards a game" },
  rushYardsAllowed: { label: "Rush yards allowed / game", phrase: "rushing yards a game" },
  rushTdsAllowed: { label: "Rushing TDs allowed / game", phrase: "rushing TDs a game" },
  pointsAllowed: { label: "Points allowed / game", phrase: "points a game" },
  sacks: { label: "Sacks / game", phrase: "sacks a game" },
  goalsAllowed: { label: "Goals allowed / game", phrase: "goals a game" },
  shotsAllowed: { label: "Shots allowed / game", phrase: "shots on goal a game" },
  shotsFor: { label: "Shots taken / game", phrase: "shots on goal a game" },
  hitsAllowed: { label: "Hits allowed / game (pitching)", phrase: "hits a game" },
  runsAllowed: { label: "Earned runs allowed / game", phrase: "earned runs a game" },
  homeRunsAllowed: { label: "Home runs allowed / game", phrase: "home runs a game" },
  battingStrikeouts: { label: "Strikeouts / game (batting)", phrase: "strikeouts a game" },
  battingHits: { label: "Hits / game (batting)", phrase: "hits a game" },
  battingRuns: { label: "Runs / game (batting)", phrase: "runs a game" },
};

export type TeamStats = {
  teamId: string;
  season: number;
  gamesPlayed: number;
  /** Opponent-facing tendencies, ranked across the league. Every sport fills what it can. */
  signals: Partial<Record<SignalKey, MatchupSignal>>;
  /** Football only: offensive tendencies used by the game script. */
  offense?: {
    pointsPerGame: number;
    passRate: number; // 0..1 neutral-situation pass rate
    playsPerGame: number;
    passYardsPerGame: number;
    rushYardsPerGame: number;
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
  // basketball
  | "points"
  | "rebounds"
  | "assists"
  | "threes"
  | "pra"
  | "points_rebounds"
  | "points_assists"
  | "rebounds_assists"
  | "steals"
  | "blocks"
  // hockey
  | "nhl_points"
  | "nhl_assists"
  | "goals"
  | "shots_on_goal"
  | "saves"
  // baseball
  | "hits"
  | "total_bases"
  | "home_runs"
  | "rbis"
  | "runs"
  | "hits_runs_rbis"
  | "pitcher_strikeouts"
  | "hits_allowed"
  | "earned_runs"
  | "outs_recorded";

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
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
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
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
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
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
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
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
  },
  pra: {
    key: "pra",
    sport: ["nba"],
    label: "Points + Rebounds + Assists",
    shortLabel: "PRA",
    unit: "PRA",
    kind: "over_under",
    statKey: "pointsReboundsAssists",
    volatility: 0.3,
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
  },
  points_rebounds: {
    key: "points_rebounds",
    sport: ["nba"],
    label: "Points + Rebounds",
    shortLabel: "Pts+Reb",
    unit: "P+R",
    kind: "over_under",
    statKey: "pointsRebounds",
    volatility: 0.33,
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
  },
  points_assists: {
    key: "points_assists",
    sport: ["nba"],
    label: "Points + Assists",
    shortLabel: "Pts+Ast",
    unit: "P+A",
    kind: "over_under",
    statKey: "pointsAssists",
    volatility: 0.33,
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
  },
  rebounds_assists: {
    key: "rebounds_assists",
    sport: ["nba"],
    label: "Rebounds + Assists",
    shortLabel: "Reb+Ast",
    unit: "R+A",
    kind: "over_under",
    statKey: "reboundsAssists",
    volatility: 0.4,
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
  },
  steals: {
    key: "steals",
    sport: ["nba"],
    label: "Steals",
    shortLabel: "Stl",
    unit: "stl",
    kind: "over_under",
    statKey: "steals",
    volatility: 0.75,
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
  },
  blocks: {
    key: "blocks",
    sport: ["nba"],
    label: "Blocks",
    shortLabel: "Blk",
    unit: "blk",
    kind: "over_under",
    statKey: "blocks",
    volatility: 0.75,
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F"],
  },
  nhl_points: {
    key: "nhl_points",
    sport: ["nhl"],
    label: "Points",
    shortLabel: "Pts",
    unit: "pts",
    kind: "over_under",
    statKey: "points",
    volatility: 0.65,
    positions: ["C", "LW", "RW", "D", "F"],
  },
  nhl_assists: {
    key: "nhl_assists",
    sport: ["nhl"],
    label: "Assists",
    shortLabel: "Ast",
    unit: "ast",
    kind: "over_under",
    statKey: "assists",
    volatility: 0.7,
    positions: ["C", "LW", "RW", "D", "F"],
  },
  goals: {
    key: "goals",
    sport: ["nhl"],
    label: "Goals",
    shortLabel: "Goals",
    unit: "goals",
    kind: "over_under",
    statKey: "goals",
    volatility: 0.8,
    positions: ["C", "LW", "RW", "D", "F"],
  },
  shots_on_goal: {
    key: "shots_on_goal",
    sport: ["nhl"],
    label: "Shots on Goal",
    shortLabel: "SOG",
    unit: "shots",
    kind: "over_under",
    statKey: "shotsOnGoal",
    volatility: 0.45,
    positions: ["C", "LW", "RW", "D", "F"],
  },
  saves: {
    key: "saves",
    sport: ["nhl"],
    label: "Saves",
    shortLabel: "Saves",
    unit: "saves",
    kind: "over_under",
    statKey: "saves",
    volatility: 0.4,
    positions: ["G"],
  },
  hits: {
    key: "hits",
    sport: ["mlb"],
    label: "Hits",
    shortLabel: "Hits",
    unit: "hits",
    kind: "over_under",
    statKey: "hits",
    volatility: 0.6,
    positions: ["C", "IF", "OF", "DH"],
  },
  total_bases: {
    key: "total_bases",
    sport: ["mlb"],
    label: "Total Bases",
    shortLabel: "TB",
    unit: "bases",
    kind: "over_under",
    statKey: "totalBases",
    volatility: 0.65,
    positions: ["C", "IF", "OF", "DH"],
  },
  home_runs: {
    key: "home_runs",
    sport: ["mlb"],
    label: "Home Runs",
    shortLabel: "HR",
    unit: "HR",
    kind: "over_under",
    statKey: "homeRuns",
    volatility: 0.85,
    positions: ["C", "IF", "OF", "DH"],
  },
  rbis: {
    key: "rbis",
    sport: ["mlb"],
    label: "RBIs",
    shortLabel: "RBI",
    unit: "RBI",
    kind: "over_under",
    statKey: "rbis",
    volatility: 0.75,
    positions: ["C", "IF", "OF", "DH"],
  },
  runs: {
    key: "runs",
    sport: ["mlb"],
    label: "Runs",
    shortLabel: "Runs",
    unit: "runs",
    kind: "over_under",
    statKey: "runs",
    volatility: 0.7,
    positions: ["C", "IF", "OF", "DH"],
  },
  hits_runs_rbis: {
    key: "hits_runs_rbis",
    sport: ["mlb"],
    label: "Hits + Runs + RBIs",
    shortLabel: "H+R+RBI",
    unit: "H+R+RBI",
    kind: "over_under",
    statKey: "hitsRunsRbis",
    volatility: 0.55,
    positions: ["C", "IF", "OF", "DH"],
  },
  pitcher_strikeouts: {
    key: "pitcher_strikeouts",
    sport: ["mlb"],
    label: "Pitcher Strikeouts",
    shortLabel: "Ks",
    unit: "K",
    kind: "over_under",
    statKey: "pitcherStrikeouts",
    volatility: 0.4,
    positions: ["SP"],
  },
  hits_allowed: {
    key: "hits_allowed",
    sport: ["mlb"],
    label: "Hits Allowed",
    shortLabel: "H Allowed",
    unit: "hits",
    kind: "over_under",
    statKey: "hitsAllowed",
    volatility: 0.45,
    positions: ["SP"],
  },
  earned_runs: {
    key: "earned_runs",
    sport: ["mlb"],
    label: "Earned Runs Allowed",
    shortLabel: "ER",
    unit: "ER",
    kind: "over_under",
    statKey: "earnedRuns",
    volatility: 0.6,
    positions: ["SP"],
  },
  outs_recorded: {
    key: "outs_recorded",
    sport: ["mlb"],
    label: "Outs Recorded",
    shortLabel: "Outs",
    unit: "outs",
    kind: "over_under",
    statKey: "outsRecorded",
    volatility: 0.35,
    positions: ["SP"],
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
  /**
   * True when the line comes from an "N or more" milestone rather than a
   * balanced over/under. Milestones are lopsided (think -400 on one side), so
   * the analyst never recommends them; users can still bet them.
   */
  milestone?: boolean;
};

/** Markets offered for each position when no sportsbook quote exists, most stable first. */
const FOOTBALL_DEFAULTS: Partial<Record<Position, MarketKey[]>> = {
  QB: ["passing_yards", "completions", "passing_tds", "rushing_yards", "anytime_td"],
  RB: ["rushing_yards", "rushing_attempts", "receptions", "receiving_yards", "anytime_td"],
  WR: ["receiving_yards", "receptions", "anytime_td"],
  TE: ["receiving_yards", "receptions", "anytime_td"],
};
const NBA_DEFAULTS: MarketKey[] = ["points", "rebounds", "assists", "threes", "pra", "points_rebounds", "points_assists", "rebounds_assists"];
const NHL_SKATER: MarketKey[] = ["nhl_points", "shots_on_goal", "goals", "nhl_assists"];
const MLB_HITTER: MarketKey[] = ["hits", "total_bases", "hits_runs_rbis", "runs", "rbis", "home_runs"];

export const DEFAULT_MARKETS: Record<SportKey, Partial<Record<Position, MarketKey[]>>> = {
  nfl: FOOTBALL_DEFAULTS,
  ncaaf: FOOTBALL_DEFAULTS,
  nba: { PG: NBA_DEFAULTS, SG: NBA_DEFAULTS, SF: NBA_DEFAULTS, PF: NBA_DEFAULTS, C: NBA_DEFAULTS, G: NBA_DEFAULTS, F: NBA_DEFAULTS },
  nhl: { C: NHL_SKATER, LW: NHL_SKATER, RW: NHL_SKATER, D: NHL_SKATER, F: NHL_SKATER, G: ["saves"] },
  mlb: {
    C: MLB_HITTER,
    IF: MLB_HITTER,
    OF: MLB_HITTER,
    DH: MLB_HITTER,
    SP: ["pitcher_strikeouts", "outs_recorded", "hits_allowed", "earned_runs"],
  },
};

export const defaultMarketsFor = (sport: SportKey, position: Position): MarketKey[] => DEFAULT_MARKETS[sport]?.[position] ?? [];

/** Which opponent tendency moves each market, and whether a high value helps the over. */
export const MARKET_SIGNALS: Record<MarketKey, { signal: SignalKey; higherHelpsOver: boolean }> = {
  passing_yards: { signal: "passYardsAllowed", higherHelpsOver: true },
  passing_tds: { signal: "passYardsAllowed", higherHelpsOver: true },
  completions: { signal: "passYardsAllowed", higherHelpsOver: true },
  receiving_yards: { signal: "receivingYardsAllowed", higherHelpsOver: true },
  receptions: { signal: "receivingYardsAllowed", higherHelpsOver: true },
  rushing_yards: { signal: "rushYardsAllowed", higherHelpsOver: true },
  rushing_attempts: { signal: "rushYardsAllowed", higherHelpsOver: true },
  anytime_td: { signal: "rushTdsAllowed", higherHelpsOver: true },
  points: { signal: "pointsAllowed", higherHelpsOver: true },
  rebounds: { signal: "pointsAllowed", higherHelpsOver: true },
  assists: { signal: "pointsAllowed", higherHelpsOver: true },
  threes: { signal: "pointsAllowed", higherHelpsOver: true },
  pra: { signal: "pointsAllowed", higherHelpsOver: true },
  points_rebounds: { signal: "pointsAllowed", higherHelpsOver: true },
  points_assists: { signal: "pointsAllowed", higherHelpsOver: true },
  rebounds_assists: { signal: "pointsAllowed", higherHelpsOver: true },
  steals: { signal: "pointsAllowed", higherHelpsOver: true },
  blocks: { signal: "pointsAllowed", higherHelpsOver: true },
  nhl_points: { signal: "goalsAllowed", higherHelpsOver: true },
  nhl_assists: { signal: "goalsAllowed", higherHelpsOver: true },
  goals: { signal: "goalsAllowed", higherHelpsOver: true },
  shots_on_goal: { signal: "shotsAllowed", higherHelpsOver: true },
  // A goalie makes more saves against a team that shoots a lot.
  saves: { signal: "shotsFor", higherHelpsOver: true },
  hits: { signal: "hitsAllowed", higherHelpsOver: true },
  total_bases: { signal: "hitsAllowed", higherHelpsOver: true },
  hits_runs_rbis: { signal: "hitsAllowed", higherHelpsOver: true },
  home_runs: { signal: "homeRunsAllowed", higherHelpsOver: true },
  rbis: { signal: "runsAllowed", higherHelpsOver: true },
  runs: { signal: "runsAllowed", higherHelpsOver: true },
  pitcher_strikeouts: { signal: "battingStrikeouts", higherHelpsOver: true },
  hits_allowed: { signal: "battingHits", higherHelpsOver: true },
  earned_runs: { signal: "battingRuns", higherHelpsOver: true },
  // A pitcher goes deeper against a lineup that doesn't score.
  outs_recorded: { signal: "battingRuns", higherHelpsOver: false },
};

/** Sports played in weekly rounds (football) versus daily slates. */
export const WEEKLY_SPORTS = new Set<SportKey>(["nfl", "ncaaf"]);
export const isFootball = (sport: SportKey) => sport === "nfl" || sport === "ncaaf";

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
