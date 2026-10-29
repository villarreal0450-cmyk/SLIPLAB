import type { MarketKey, Position, SportKey, StatLine } from "@/lib/types";

/**
 * What differs between ESPN leagues: where they live, how their schedule is
 * shaped, which roster groups and positions carry props, how game-log columns
 * map to our stats, and which sportsbook prop types map to our markets.
 */
export type LeagueSpec = {
  sport: SportKey;
  /** Path segment on the site APIs, e.g. "basketball/nba". */
  path: string;
  schedule: { mode: "week"; query: string; lastRegularWeek: number } | { mode: "days"; days: number };
  /** Roster groups to read when the roster is grouped (football: "offense"). Null = every group. */
  rosterGroups: string[] | null;
  positions: Record<string, Position>;
  /** Positions offered on the board. */
  propPositions: Set<Position>;
  /** Builds a game-log row mapper from the log's column names. */
  statRow: (names: string[]) => (cells: string[]) => StatLine;
  /** Full-game sportsbook prop types → our markets. */
  propTypes: Record<string, MarketKey>;
  /** "N or more" milestone props used when the book posts no full-game total. */
  milestoneTypes: Record<string, MarketKey>;
  teamStats: "football" | "basketball" | "hockey" | "baseball";
  /** Game-log season types to skip. */
  skipSeasonTypes: RegExp;
};

const num = (v: string | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** "18:32" → 18.5 minutes. */
const minutes = (v: string | undefined) => {
  if (!v) return undefined;
  const [m, s] = v.split(":").map(Number);
  return Number.isFinite(m) ? Math.round((m + (Number.isFinite(s) ? s / 60 : 0)) * 10) / 10 : undefined;
};

/** Baseball innings "5.2" = 5 full innings and 2 outs = 17 outs. */
const outs = (v: string | undefined) => {
  const n = num(v);
  if (n === undefined) return undefined;
  const whole = Math.floor(n);
  return whole * 3 + Math.round((n - whole) * 10);
};

/** "3-7" made-attempted → 3. */
const made = (v: string | undefined) => num(v?.split("-")[0]);

function rowMapper(columns: Record<string, (cell: string | undefined) => [keyof StatLine, number | undefined][]>, derive?: (s: StatLine) => void) {
  return (names: string[]) => (cells: string[]) => {
    const stats: StatLine = {};
    names.forEach((name, i) => {
      const read = columns[name];
      if (!read) return;
      for (const [key, value] of read(cells[i])) if (value !== undefined) stats[key] = value;
    });
    derive?.(stats);
    return stats;
  };
}

const one = (key: keyof StatLine, parse = num) => (cell: string | undefined): [keyof StatLine, number | undefined][] => [[key, parse(cell)]];

const FOOTBALL_ROW = rowMapper(
  {
    completions: one("completions"),
    passingAttempts: one("passAttempts"),
    passingYards: one("passingYards"),
    passingTouchdowns: one("passingTds"),
    interceptions: one("interceptions"),
    rushingAttempts: one("rushingAttempts"),
    rushingYards: one("rushingYards"),
    rushingTouchdowns: one("rushingTds"),
    receptions: one("receptions"),
    receivingTargets: one("targets"),
    receivingYards: one("receivingYards"),
    receivingTouchdowns: one("receivingTds"),
  },
  (s) => {
    s.anytimeTd = (s.rushingTds ?? 0) + (s.receivingTds ?? 0);
  },
);

const BASKETBALL_ROW = rowMapper(
  {
    minutes: one("minutes"),
    points: one("points"),
    totalRebounds: one("rebounds"),
    assists: one("assists"),
    steals: one("steals"),
    blocks: one("blocks"),
    "threePointFieldGoalsMade-threePointFieldGoalsAttempted": one("threes", made),
  },
  (s) => {
    const p = s.points ?? 0;
    const r = s.rebounds ?? 0;
    const a = s.assists ?? 0;
    if (s.points !== undefined || s.rebounds !== undefined || s.assists !== undefined) {
      s.pointsReboundsAssists = p + r + a;
      s.pointsRebounds = p + r;
      s.pointsAssists = p + a;
      s.reboundsAssists = r + a;
    }
  },
);

const HOCKEY_ROW = rowMapper({
  goals: one("goals"),
  assists: one("assists"),
  points: one("points"),
  shotsTotal: one("shotsOnGoal"),
  timeOnIcePerGame: one("timeOnIce", minutes),
  saves: one("saves"),
  shotsAgainst: one("shotsAgainst"),
  gameStarted: one("goalieStarted"),
});

/** Pitcher and batter logs share column names ("hits", "strikeouts"), so the mapper picks a role from the columns. */
const BASEBALL_ROW = (names: string[]) =>
  names.includes("innings")
    ? rowMapper({
        innings: one("outsRecorded", outs),
        hits: one("hitsAllowed"),
        earnedRuns: one("earnedRuns"),
        strikeouts: one("pitcherStrikeouts"),
        battersFaced: one("battersFaced"),
      })(names)
    : rowMapper(
        {
          atBats: one("atBats"),
          runs: one("runs"),
          hits: one("hits"),
          doubles: one("doubles"),
          triples: one("triples"),
          homeRuns: one("homeRuns"),
          RBIs: one("rbis"),
        },
        (s) => {
          if (s.hits === undefined) return;
          s.totalBases = s.hits + (s.doubles ?? 0) + 2 * (s.triples ?? 0) + 3 * (s.homeRuns ?? 0);
          s.hitsRunsRbis = s.hits + (s.runs ?? 0) + (s.rbis ?? 0);
        },
      )(names);

const FOOTBALL_POSITIONS: Record<string, Position> = {
  QB: "QB", RB: "RB", FB: "RB", HB: "RB", WR: "WR", TE: "TE", K: "K", PK: "K", P: "K",
  C: "OL", G: "OL", OG: "OL", T: "OL", OT: "OL", OL: "OL", LS: "OL",
  DE: "DL", DT: "DL", NT: "DL", DL: "DL", EDGE: "DL",
  LB: "LB", OLB: "LB", ILB: "LB", MLB: "LB",
  CB: "CB", S: "S", FS: "S", SS: "S", DB: "DB", SAF: "S",
};

const FOOTBALL_PROPS: Record<string, MarketKey> = {
  "Total Passing Yards (incl. overtime)": "passing_yards",
  "Total Pass Completions (incl. overtime)": "completions",
  "Total Passing Touchdowns (incl. overtime)": "passing_tds",
  "Total Rushing Yards (incl. overtime)": "rushing_yards",
  "Total Carries (incl. overtime)": "rushing_attempts",
  "Total Receiving Yards (incl. overtime)": "receiving_yards",
  "Total Receptions (incl. overtime)": "receptions",
};

const football = (sport: "nfl" | "ncaaf", path: string, query: string, lastRegularWeek: number): LeagueSpec => ({
  sport,
  path,
  schedule: { mode: "week", query, lastRegularWeek },
  rosterGroups: ["offense"],
  positions: FOOTBALL_POSITIONS,
  propPositions: new Set<Position>(["QB", "RB", "WR", "TE"]),
  statRow: FOOTBALL_ROW,
  propTypes: FOOTBALL_PROPS,
  milestoneTypes: {},
  teamStats: "football",
  skipSeasonTypes: /preseason/i,
});

export const LEAGUES: Record<SportKey, LeagueSpec> = {
  nfl: football("nfl", "football/nfl", "", 18),
  // FBS only (group 80): the full division, not just ranked teams.
  ncaaf: football("ncaaf", "football/college-football", "groups=80&limit=300", 16),
  nba: {
    sport: "nba",
    path: "basketball/nba",
    schedule: { mode: "days", days: 3 },
    rosterGroups: null,
    positions: { PG: "PG", SG: "SG", SF: "SF", PF: "PF", C: "C", G: "G", F: "F" },
    propPositions: new Set<Position>(["PG", "SG", "SF", "PF", "C", "G", "F"]),
    statRow: BASKETBALL_ROW,
    propTypes: {
      "Total Points": "points",
      "Total Rebounds": "rebounds",
      "Total Assists": "assists",
      "Total 3-Point Field Goals": "threes",
      "Total Points, Rebounds, and Assists": "pra",
      "Total Points and Rebounds": "points_rebounds",
      "Total Points and Assists": "points_assists",
      "Total Assists and Rebounds": "rebounds_assists",
      "Total Steals": "steals",
      "Total Blocks": "blocks",
    },
    milestoneTypes: {},
    teamStats: "basketball",
    skipSeasonTypes: /preseason/i,
  },
  nhl: {
    sport: "nhl",
    path: "hockey/nhl",
    schedule: { mode: "days", days: 3 },
    rosterGroups: null,
    positions: { C: "C", LW: "LW", RW: "RW", W: "F", F: "F", D: "D", G: "G" },
    propPositions: new Set<Position>(["C", "LW", "RW", "F", "D", "G"]),
    statRow: HOCKEY_ROW,
    propTypes: {
      "Total Points": "nhl_points",
      "Total Assists": "nhl_assists",
      "Total Shots on Goal": "shots_on_goal",
      "Total Saves": "saves",
    },
    milestoneTypes: { "Goals Milestones": "goals" },
    teamStats: "hockey",
    skipSeasonTypes: /preseason/i,
  },
  mlb: {
    sport: "mlb",
    path: "baseball/mlb",
    schedule: { mode: "days", days: 3 },
    rosterGroups: null,
    positions: { SP: "SP", RP: "RP", P: "SP", C: "C", "1B": "IF", "2B": "IF", "3B": "IF", SS: "IF", IF: "IF", LF: "OF", CF: "OF", RF: "OF", OF: "OF", DH: "DH" },
    propPositions: new Set<Position>(["SP", "C", "IF", "OF", "DH"]),
    statRow: BASEBALL_ROW,
    propTypes: {
      "Total Hits": "hits",
      "Total Bases": "total_bases",
      "Total RBIs": "rbis",
      "Total Runs Scored": "runs",
      "Total Hits + Runs + RBIs": "hits_runs_rbis",
      "Total Strikeouts": "pitcher_strikeouts",
      "Total Hits Allowed": "hits_allowed",
      "Earned Runs Allowed": "earned_runs",
      "Total Outs Recorded": "outs_recorded",
    },
    milestoneTypes: { "Home Runs Milestones": "home_runs", "Total Bases Milestones": "total_bases" },
    teamStats: "baseball",
    skipSeasonTypes: /spring training|preseason|exhibition/i,
  },
};
