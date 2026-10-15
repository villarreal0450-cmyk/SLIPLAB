import { describe, expect, it } from "vitest";
import { MockSportsDataProvider } from "@/lib/sports/mock/mockProvider";
import { buildGamePicks, loadCandidates } from "../suggestions";
import { analyzeParlayFromContexts } from "..";
import { dakPassing } from "./fixtures";

const provider = new MockSportsDataProvider();

describe("buildGamePicks", () => {
  it("builds a 2-4 leg slip of good, distinct, non-clashing legs", async () => {
    const candidates = await loadCandidates([dakPassing.gameId], provider);
    const result = buildGamePicks(candidates);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.legs.length).toBeGreaterThanOrEqual(2);
    expect(result.legs.length).toBeLessThanOrEqual(4);
    expect(result.legs.every((l) => l.score >= 7.5)).toBe(true);
    expect(new Set(result.legs.map((l) => l.pick.playerId)).size).toBe(result.legs.length);
    expect(result.legs.every((l) => l.reason.length > 0)).toBe(true);
    expect(result.considered).toBeGreaterThan(result.legs.length);

    // Re-grading the slip from scratch agrees with what the card shows, and nothing clashes.
    const byKey = new Map(candidates.map((c) => [`${c.pick.playerId}:${c.pick.market}`, c.ctx]));
    const contexts = result.legs.map((l) => ({ ...byKey.get(`${l.pick.playerId}:${l.pick.market}`)!, pick: l.pick }));
    const check = analyzeParlayFromContexts({ id: "check", picks: result.legs.map((l) => l.pick) }, contexts);
    expect(check.score).toBe(result.parlay.score);
    expect(check.cohesion.findings.some((f) => f.strength < 0)).toBe(false);
  });

  it("says so when there are no lines instead of inventing picks", () => {
    expect(buildGamePicks([]).status).toBe("no_lines");
  });

  it("won't build a parlay out of weak legs", async () => {
    const candidates = await loadCandidates([dakPassing.gameId], provider);
    // Only touchdown scorers: volatile legs that never grade "good" on their own.
    const tds = candidates.filter((c) => c.pick.market === "anytime_td");
    const result = buildGamePicks(tds);
    expect(result.status).toBe("single_only");
    if (result.status !== "single_only") return;
    expect(result.bestSingle?.pick.market).toBe("anytime_td");
    expect(result.reason).toMatch(/wouldn't build a parlay/);
  });
});
