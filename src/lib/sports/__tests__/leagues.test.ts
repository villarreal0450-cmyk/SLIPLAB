import { describe, expect, it } from "vitest";
import { gameIdFor, parseGameId, parsePlayerId, playerIdFor, sportOfTeamId, teamIdFor } from "../espn/ids";
import { easternDate, seasonYearOf } from "../espn/league";
import { LEAGUES } from "../espn/leagues";
import { mapGameLog, mapOdds, rankSignals } from "../espn/map";
import { mapFantasyProjections } from "../espn/projections";
import { mapEspnPropBets } from "../espn/props";
import type { EspnEvent } from "../espn/types";

describe("ESPN ids across leagues", () => {
  it("keeps NFL ids unchanged and namespaces every other league", () => {
    expect(gameIdFor("nfl", "401")).toBe("espn-401");
    expect(gameIdFor("nba", "401")).toBe("espn-nba-401");
    expect(parseGameId("espn-401")).toEqual({ sport: "nfl", id: "401" });
    expect(parseGameId("espn-nhl-9")).toEqual({ sport: "nhl", id: "9" });
    expect(parsePlayerId(playerIdFor("mlb", "33"))).toEqual({ sport: "mlb", id: "33" });
    expect(teamIdFor("nba", { id: "13", abbreviation: "LAL" })).toBe("nba-lal");
    expect(teamIdFor("ncaaf", { id: "2641", abbreviation: "TTU" })).toBe("ncaaf-2641");
    expect(sportOfTeamId("ncaaf-2641")).toBe("ncaaf");
    expect(sportOfTeamId("whatever")).toBeNull();
  });
});

const log = (names: string[], stats: string[], display = "2026-27 Regular Season") => ({
  names,
  events: { "1": { gameDate: "2026-10-25T23:30:00Z", atVs: "@", opponent: { id: "8", abbreviation: "DET" } } },
  seasonTypes: [{ displayName: display, categories: [{ events: [{ eventId: "1", stats }] }] }],
});

describe("game logs by sport", () => {
  it("reads basketball made-attempted columns and builds combos", () => {
    const [g] = mapGameLog(LEAGUES.nba, "espn-nba-1", log(["minutes", "threePointFieldGoalsMade-threePointFieldGoalsAttempted", "totalRebounds", "assists", "points"], ["34", "3-7", "8", "6", "27"]), new Map([["8", "nba-det"]]));
    expect(g).toMatchObject({ gameId: "espn-nba-1", opponentTeamId: "nba-det", isHome: false });
    expect(g.stats).toMatchObject({ minutes: 34, threes: 3, rebounds: 8, assists: 6, points: 27, pointsReboundsAssists: 41, pointsRebounds: 35, pointsAssists: 33, reboundsAssists: 14 });
  });

  it("reads hockey ice time as minutes", () => {
    const [g] = mapGameLog(LEAGUES.nhl, "espn-nhl-1", log(["goals", "assists", "points", "shotsTotal", "timeOnIcePerGame"], ["1", "1", "2", "4", "18:30"]), new Map());
    expect(g.stats).toMatchObject({ goals: 1, points: 2, shotsOnGoal: 4, timeOnIce: 18.5 });
  });

  it("tells pitchers from batters and counts outs from innings", () => {
    const [p] = mapGameLog(LEAGUES.mlb, "espn-mlb-1", log(["innings", "hits", "earnedRuns", "strikeouts", "battersFaced"], ["5.2", "6", "2", "7", "24"], "2026 Regular Season"), new Map());
    expect(p.stats).toMatchObject({ outsRecorded: 17, hitsAllowed: 6, earnedRuns: 2, pitcherStrikeouts: 7, battersFaced: 24 });
    const [b] = mapGameLog(LEAGUES.mlb, "espn-mlb-1", log(["atBats", "runs", "hits", "doubles", "triples", "homeRuns", "RBIs"], ["4", "1", "2", "1", "0", "1", "3"], "2026 Postseason"), new Map());
    expect(b.stats).toMatchObject({ hits: 2, totalBases: 6, homeRuns: 1, rbis: 3, hitsRunsRbis: 6 });
  });

  it("skips preseason and spring training", () => {
    expect(mapGameLog(LEAGUES.nba, "x", log(["points"], ["10"], "2026-27 Preseason"), new Map())).toEqual([]);
    expect(mapGameLog(LEAGUES.mlb, "x", log(["hits"], ["1"], "2026 Spring Training"), new Map())).toEqual([]);
  });

  it("knows which season a log belongs to", () => {
    expect(seasonYearOf(log([], [], "2026-27 Regular Season"))).toBe(2027);
    expect(seasonYearOf(log([], [], "2026 Regular Season"))).toBe(2026);
  });
});

describe("odds by sport", () => {
  const ev = (details: string, spread: number): EspnEvent => ({
    id: "9",
    date: "2026-10-29T00:00Z",
    competitions: [{ competitors: [], odds: [{ details, spread, overUnder: 6.5 }] }],
  });

  it("reads hockey details as a moneyline, not a spread", () => {
    const o = mapOdds(LEAGUES.nhl, ev("TB -238", -1.5), "TB")!;
    expect(o).toMatchObject({ homeSpread: -1.5, homeMoneyline: -238, awayMoneyline: null, total: 6.5 });
  });

  it("reads basketball details as a spread", () => {
    expect(mapOdds(LEAGUES.nba, ev("NO -5.5", -5.5), "NO")!.homeSpread).toBe(-5.5);
    expect(mapOdds(LEAGUES.nba, ev("SAC -3", 3), "NO")!.homeSpread).toBe(3);
  });
});

describe("league ranks", () => {
  it("ranks every signal with 1 = lowest", () => {
    const ranked = rankSignals(new Map([["a", { pointsAllowed: 110 }], ["b", { pointsAllowed: 101 }], ["c", { pointsAllowed: 118 }]]));
    expect(ranked.get("b")!.pointsAllowed).toEqual({ perGame: 101, rank: 1, leagueSize: 3 });
    expect(ranked.get("c")!.pointsAllowed!.rank).toBe(3);
  });
});

describe("ESPN prop lines by sport", () => {
  const ref = (id: string) => ({ $ref: `http://x/athletes/${id}?lang=en` });
  it("uses the league's prop names and turns the lowest milestone into a flagged N - 0.5 line", () => {
    const lines = mapEspnPropBets(
      LEAGUES.nhl,
      {
        items: [
          { athlete: ref("1"), type: { name: "Total Points" }, current: { target: { value: 0.5 } } },
          { athlete: ref("1"), type: { name: "Goals Milestones" }, current: { target: { value: 2 } } },
          { athlete: ref("1"), type: { name: "Goals Milestones" }, current: { target: { value: 1 } } },
        ],
      },
      "espn-nhl-9",
    );
    expect(lines.find((l) => l.market === "nhl_points")).toMatchObject({ playerId: "espn-nhl-1", line: 0.5 });
    expect(lines.find((l) => l.market === "nhl_points")?.milestone).toBeUndefined();
    expect(lines.find((l) => l.market === "goals")).toMatchObject({ line: 0.5, milestone: true });
  });
});

describe("ESPN analyst projections", () => {
  it("reads this week's projection and skips players projected not to play", () => {
    const byId = mapFantasyProjections(
      {
        players: [
          {
            player: {
              id: 4047365,
              stats: [
                { statSourceId: 0, statSplitTypeId: 1, scoringPeriodId: 7, stats: { "24": 36 } },
                { statSourceId: 1, statSplitTypeId: 1, scoringPeriodId: 8, stats: { "23": 14.3, "24": 62, "25": 0.5, "42": 22.8, "53": 3 } },
              ],
            },
          },
          { player: { id: 5, stats: [{ statSourceId: 1, statSplitTypeId: 1, scoringPeriodId: 8, stats: { "24": 0 } }] } },
        ],
      },
      8,
    );
    expect(byId.get("4047365")).toMatchObject({ rushingAttempts: 14.3, rushingYards: 62, receivingYards: 22.8, receptions: 3 });
    expect(byId.get("4047365")!.anytimeTd).toBeCloseTo(0.39, 2);
    expect(byId.has("5")).toBe(false);
  });
});

describe("daily schedules", () => {
  it("uses US Eastern dates", () => {
    // 02:00 UTC on Oct 29 is still Oct 28 in New York.
    expect(easternDate(0, new Date("2026-10-29T02:00:00Z"))).toBe("20261028");
    expect(easternDate(1, new Date("2026-10-29T02:00:00Z"))).toBe("20261029");
  });
});
