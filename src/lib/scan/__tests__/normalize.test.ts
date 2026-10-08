import { beforeAll, describe, expect, it } from "vitest";
import { MockSportsDataProvider } from "@/lib/sports/mock/mockProvider";
import { buildCatalog, matchMarket, normalizeSlip } from "../normalize";
import { SAMPLE_SLIP } from "../sample";
import type { CatalogGame, ParsedSlip } from "../types";

let catalog: CatalogGame[];
let n = 0;
const newId = () => `leg-${++n}`;

beforeAll(async () => {
  catalog = await buildCatalog(new MockSportsDataProvider());
});

describe("matchMarket", () => {
  it("maps common sportsbook wording", () => {
    expect(matchMarket("Passing Yards")).toBe("passing_yards");
    expect(matchMarket("Player Rec Yds")).toBe("receiving_yards");
    expect(matchMarket("Anytime TD Scorer")).toBe("anytime_td");
    expect(matchMarket("Rushing Attempts")).toBe("rushing_attempts");
    expect(matchMarket("Total Receptions")).toBe("receptions");
    expect(matchMarket("Moneyline")).toBeNull();
    expect(matchMarket("Longest Reception")).toBeNull();
    expect(matchMarket("First TD Scorer")).toBeNull();
    expect(matchMarket("1st Half Passing Yards")).toBeNull();
  });
});

describe("normalizeSlip", () => {
  it("turns the sample slip into four ready picks with the printed lines and odds", () => {
    const legs = normalizeSlip(SAMPLE_SLIP, catalog, newId);
    expect(legs.map((l) => l.status)).toEqual(["ready", "ready", "ready", "ready"]);
    expect(legs[0].pick).toMatchObject({ playerId: "dak-prescott", market: "passing_yards", direction: "over", line: 244, odds: -150, gameId: "nfl-2026-w5-tb-dal" });
    expect(legs[3].pick).toMatchObject({ playerId: "javonte-williams", market: "anytime_td", direction: "yes", line: null });
  });

  it("flags inferences instead of hiding them", () => {
    const slip: ParsedSlip = {
      ...SAMPLE_SLIP,
      legs: [
        { raw_text: "Prescott pass yds 255.5", player: "Prescott", team: null, market: "Pass Yds", line: 255.5, direction: null, odds: null },
        { raw_text: "Lamb receiving", player: "CeeDee Lamb", team: null, market: "Receiving Yards", line: null, direction: "over", odds: null },
        { raw_text: "Someone Else 2+ sacks", player: "Someone Else", team: null, market: "Sacks", line: 2, direction: "over", odds: null },
        { raw_text: "Pickens longest reception", player: "George Pickens", team: null, market: "Longest Reception", line: 20, direction: "over", odds: null },
      ],
    };
    const [prescott, lamb, unknown, oddMarket] = normalizeSlip(slip, catalog, newId);
    expect(prescott.status).toBe("review");
    expect(prescott.issues.join(" ")).toMatch(/by last name/);
    expect(prescott.issues.join(" ")).toMatch(/assumed over/);
    expect(prescott.pick?.odds).toBeDefined(); // filled from the market ladder, and said so
    expect(lamb.status).toBe("review");
    expect(lamb.pick).toBeNull();
    expect(unknown.status).toBe("unmatched");
    expect(oddMarket.status).toBe("review");
    expect(oddMarket.issues[0]).toMatch(/Didn't recognize the prop/);
  });
});
