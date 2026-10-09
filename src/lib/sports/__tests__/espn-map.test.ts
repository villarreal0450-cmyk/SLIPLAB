import { describe, expect, it } from "vitest";
import { mapEspnPropBets, propBetsUrl } from "@/lib/sports/espn/props";
import type { Player } from "@/lib/types";
import { mapEvent, mapGameLog, mapInjuries, mapOdds, mapPosition, seasonAverages } from "../espn/map";
import type { EspnEvent } from "../espn/types";
import { toMarketLines } from "../odds/theOddsApi";

const event = (details: string): EspnEvent => ({
  id: "401",
  date: "2026-10-09T00:15Z",
  week: { number: 5 },
  status: { type: { state: "pre" } },
  weather: { displayValue: "Sunny", temperature: 85 },
  competitions: [
    {
      venue: { fullName: "AT&T Stadium", indoor: true },
      competitors: [
        { homeAway: "home", team: { id: "6", abbreviation: "DAL", location: "Dallas", name: "Cowboys", color: "002a5c" } },
        { homeAway: "away", team: { id: "27", abbreviation: "TB", location: "Tampa Bay", name: "Buccaneers", color: "bd1c36" } },
      ],
      odds: [{ details, overUnder: 48.5, provider: { name: "Draft Kings" } }],
    },
  ],
});

describe("ESPN mapping", () => {
  it("maps games, teams and the spread from the home side", () => {
    const m = mapEvent(event("DAL -9.5"))!;
    expect(m.game).toMatchObject({ id: "espn-401", homeTeamId: "nfl-dal", awayTeamId: "nfl-tb", status: "scheduled", week: 5 });
    expect(m.game.weather).toMatchObject({ isDome: true, windMph: null, conditions: "Sunny" });
    expect(m.teams[0]).toMatchObject({ abbreviation: "DAL", city: "Dallas", color: "#002a5c" });
    expect(m.odds).toMatchObject({ homeSpread: -9.5, total: 48.5 });
    expect(mapOdds(event("TB -3"), "DAL")?.homeSpread).toBe(3);
  });

  it("maps positions, including defenders for injuries", () => {
    expect(mapPosition("FB")).toBe("RB");
    expect(mapPosition("OT")).toBe("OL");
    expect(mapPosition("SS")).toBe("S");
    expect(mapPosition("XYZ")).toBe("DEF");
  });

  it("reads game logs by stat name and counts touchdowns", () => {
    const logs = mapGameLog(
      "espn-1",
      {
        names: ["receptions", "receivingTargets", "receivingYards", "receivingTouchdowns", "rushingAttempts", "rushingTouchdowns"],
        events: { "9": { gameDate: "2026-10-04T17:00:00Z", atVs: "@", opponent: { abbreviation: "HOU" } }, "8": { gameDate: "2026-09-27T17:00:00Z", atVs: "vs", opponent: { abbreviation: "BAL" } } },
        seasonTypes: [{ displayName: "2026 Regular Season", categories: [{ events: [{ eventId: "8", stats: ["5", "7", "61", "0", "1", "1"] }, { eventId: "9", stats: ["8", "11", "110", "1", "0", "0"] }] }] }],
      },
      new Map(),
    );
    expect(logs.map((l) => [l.date, l.opponentTeamId, l.isHome, l.stats.receivingYards, l.stats.targets, l.stats.anytimeTd])).toEqual([
      ["2026-10-04", "nfl-hou", false, 110, 11, 1],
      ["2026-09-27", "nfl-bal", true, 61, 7, 1],
    ]);
    expect(seasonAverages(logs)).toMatchObject({ receivingYards: 85.5, anytimeTd: 1 });
  });

  it("maps injury statuses and player ids from links", () => {
    const injuries = mapInjuries(
      {
        injuries: [
          {
            id: "27",
            injuries: [
              { status: "Out", date: "2026-10-06", details: { type: "Ankle" }, athlete: { displayName: "Antoine Winfield Jr.", position: { abbreviation: "S" }, links: [{ href: "https://www.espn.com/nfl/player/_/id/4362087/x" }] } },
              { status: "Injured Reserve", athlete: { displayName: "Someone Else", position: { abbreviation: "WR" } } },
            ],
          },
        ],
      },
      new Map([["27", "TB"]]),
    );
    expect(injuries.map((i) => [i.playerId, i.teamId, i.position, i.status])).toEqual([
      ["espn-4362087", "nfl-tb", "S", "out"],
      ["espn-name-Someone Else", "nfl-tb", "WR", "ir"],
    ]);
  });
});

describe("The Odds API parsing", () => {
  const players = [
    { id: "espn-1", name: "Dak Prescott" },
    { id: "espn-2", name: "Chris Godwin Jr." },
  ] as Player[];

  it("prefers the first book, matches names loosely, and extends lines with alternates", () => {
    const lines = toMarketLines(
      {
        id: "e1",
        bookmakers: [
          { key: "fanduel", markets: [{ key: "player_pass_yds", outcomes: [{ name: "Over", description: "Dak Prescott", price: -120, point: 270.5 }, { name: "Under", description: "Dak Prescott", price: -110, point: 270.5 }] }] },
          {
            key: "draftkings",
            markets: [
              { key: "player_pass_yds", outcomes: [{ name: "Over", description: "Dak Prescott", price: -115, point: 268.5 }, { name: "Under", description: "Dak Prescott", price: -105, point: 268.5 }] },
              { key: "player_pass_yds_alternate", outcomes: [{ name: "Over", description: "Dak Prescott", price: -250, point: 244.5 }] },
              { key: "player_anytime_td", outcomes: [{ name: "Yes", description: "Chris Godwin", price: 210 }] },
              { key: "player_reception_yds", outcomes: [{ name: "Over", description: "Unknown Player", price: -110, point: 40.5 }] },
            ],
          },
        ],
      },
      "espn-401",
      players,
    );
    const dak = lines.find((l) => l.market === "passing_yards")!;
    expect(dak).toMatchObject({ line: 268.5, overOdds: -115, underOdds: -105 });
    expect(dak.alternates).toEqual([{ line: 244.5, overOdds: -250, underOdds: Number.NaN }]);
    const td = lines.find((l) => l.market === "anytime_td")!;
    expect(td).toMatchObject({ playerId: "espn-2", overOdds: 210 });
    expect(Number.isNaN(td.underOdds)).toBe(true);
    expect(lines).toHaveLength(2);
  });
});

describe("ESPN sportsbook props", () => {
  const ref = (id: string) => ({ $ref: `http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/athletes/${id}?lang=en` });

  it("finds the book that publishes props and asks for every one", () => {
    const found = propBetsUrl({
      items: [
        { provider: { id: "58", name: "ESPN BET" } },
        { provider: { id: "100", name: "Draft Kings" }, propBets: { $ref: "http://sports.core.api.espn.com/v2/x/odds/100/propBets?lang=en&region=us" } },
      ],
    });
    expect(found?.book).toBe("Draft Kings");
    expect(found?.url).toMatch(/^https:\/\/.*propBets\?.*limit=1000/);
    expect(propBetsUrl({ items: [{ provider: { id: "58" } }] })).toBeNull();
  });

  it("maps full-game totals to lines without prices, once per player and market", () => {
    const lines = mapEspnPropBets(
      {
        items: [
          { athlete: ref("2577417"), type: { name: "Total Passing Yards (incl. overtime)" }, current: { target: { value: 271.5 } } },
          { athlete: ref("2577417"), type: { name: "Total Passing Yards (incl. overtime)" }, current: { target: { value: 271.5 } } },
          { athlete: ref("4241389"), type: { name: "Total Receptions (incl. overtime)" }, current: { target: { value: 6.5 } } },
          { athlete: ref("4241389"), type: { name: "1st Half Total Receiving Yards" }, current: { target: { value: 40.5 } } },
          { athlete: ref("4241389"), type: { name: "Anytime Touchdown Scorer" }, current: {} },
          { type: { name: "Team Total Points" }, current: { target: { value: 24.5 } } },
        ],
      },
      "espn-401872980",
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ playerId: "espn-2577417", gameId: "espn-401872980", market: "passing_yards", line: 271.5 });
    expect(lines[1]).toMatchObject({ playerId: "espn-4241389", market: "receptions", line: 6.5 });
    expect(Number.isNaN(lines[0].overOdds)).toBe(true);
  });
});
