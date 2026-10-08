import { describe, expect, it } from "vitest";
import { MockSportsDataProvider } from "@/lib/sports/mock/mockProvider";
import { analyzeParlay } from "@/lib/analysis";
import { demoParlay } from "@/lib/analysis/__tests__/fixtures";
import { createSavedBet, deriveStatus, markPlaced, parseBets, potentialPayout, settleLeg, updateDetails } from "../model";

let n = 0;
const newId = () => `id-${++n}`;
const now = "2026-10-08T12:00:00Z";

describe("bet model", () => {
  it("computes payout including stake", () => {
    expect(potentialPayout(100, 535)).toBe(635);
    expect(potentialPayout(110, -110)).toBe(210);
    expect(potentialPayout(null, 535)).toBeNull();
  });

  it("derives parlay status from legs", () => {
    expect(deriveStatus("pending", [{ status: "won" }, { status: "pending" }])).toBe("pending");
    expect(deriveStatus("pending", [{ status: "won" }, { status: "lost" }])).toBe("lost");
    expect(deriveStatus("pending", [{ status: "won" }, { status: "void" }])).toBe("won");
    expect(deriveStatus("pending", [{ status: "void" }, { status: "void" }])).toBe("void");
    expect(deriveStatus("draft", [{ status: "lost" }])).toBe("draft");
  });

  it("snapshots the analysis and maps the weakest leg to its saved leg id", async () => {
    const analysis = await analyzeParlay(demoParlay, new MockSportsDataProvider());
    const bet = createSavedBet({ picks: demoParlay.picks, analysis, stake: 50, odds: 535, sportsbook: "DraftKings", notes: null, placed: true, now, newId });
    expect(bet.status).toBe("pending");
    expect(bet.potentialPayout).toBe(317.5);
    expect(bet.legs).toHaveLength(4);
    expect(bet.legs[0].analysisScore).toBe(analysis.picks[0].score);
    const weakLeg = bet.legs.find((l) => l.id === bet.analysis!.weakestLegId);
    expect(weakLeg?.pick.id).toBe("pick-javonte");
  });

  it("settles legs, then the bet, and records the settlement time once", () => {
    let bet = createSavedBet({ picks: demoParlay.picks.slice(0, 2), analysis: null, stake: 10, odds: 200, sportsbook: null, notes: null, placed: false, now, newId });
    bet = markPlaced(bet, now);
    expect(bet.status).toBe("pending");
    bet = settleLeg(bet, bet.legs[0].id, "won", 300, "2026-10-09T00:00:00Z");
    expect(bet.status).toBe("pending");
    bet = settleLeg(bet, bet.legs[1].id, "lost", 73, "2026-10-09T01:00:00Z");
    expect(bet.status).toBe("lost");
    expect(bet.settledAt).toBe("2026-10-09T01:00:00Z");
    // Correcting a leg back to pending reopens the bet.
    bet = settleLeg(bet, bet.legs[1].id, "pending", null);
    expect(bet.status).toBe("pending");
    expect(bet.settledAt).toBeNull();
  });

  it("recomputes payout when details change", () => {
    const bet = createSavedBet({ picks: demoParlay.picks, analysis: null, stake: null, odds: 300, sportsbook: null, notes: null, placed: false, now, newId });
    expect(updateDetails(bet, { stake: 20 }).potentialPayout).toBe(80);
  });

  it("parses stored data defensively", () => {
    const bet = createSavedBet({ picks: demoParlay.picks, analysis: null, stake: null, odds: null, sportsbook: null, notes: null, placed: false, now, newId });
    expect(parseBets({ version: 1, bets: [bet, { junk: true }] })).toEqual([bet]);
    expect(parseBets("nope")).toEqual([]);
  });
});
