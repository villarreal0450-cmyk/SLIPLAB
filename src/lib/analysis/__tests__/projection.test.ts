import { describe, expect, it } from "vitest";
import { MockSportsDataProvider } from "@/lib/sports/mock/mockProvider";
import { buildPickContext, scorePick } from "..";
import { modelPick } from "../scoring/projection";
import { readUsage } from "../scoring/usage";
import { javonteTd, dakPassing } from "./fixtures";

const provider = new MockSportsDataProvider();

describe("projection sources", () => {
  it("blends our stats with analysts and the market when both exist", async () => {
    const ctx = await buildPickContext(dakPassing, provider);
    const statsOnly = modelPick({ ...ctx, marketLine: null, expertProjection: null })!;
    expect(statsOnly.sources).toEqual({ stats: expect.any(Number) });

    const blended = modelPick({ ...ctx, expertProjection: { source: "ESPN fantasy analysts", stats: { passingYards: 200 } } })!;
    expect(blended.sources.experts).toBe(200);
    expect(blended.sources.market).toBe(ctx.marketLine!.line);
    // Analysts far below our stats pull the projection down.
    expect(blended.value).toBeLessThan(statsOnly.value);
  });

  it("adds an analyst factor only when a projection is published", async () => {
    const ctx = await buildPickContext(dakPassing, provider);
    const without = scorePick({ ...ctx, expertProjection: null });
    expect(without.factors.some((f) => f.key === "expert_projection")).toBe(false);
    // In the NFL a missing analyst projection is disclosed; elsewhere the factor simply doesn't apply.
    expect(without.missingData).toContain("Analyst projections");
    const nba = scorePick({ ...ctx, expertProjection: null, player: { ...ctx.player, sport: "nba" } });
    expect(nba.missingData).not.toContain("Analyst projections");
    const withIt = scorePick({ ...ctx, expertProjection: { source: "ESPN fantasy analysts", stats: { passingYards: 300 } } });
    const f = withIt.factors.find((x) => x.key === "expert_projection")!;
    expect(f.impact).toBe("positive");
    expect(f.explanation).toMatch(/ESPN fantasy analysts project 300/);
  });

  it("ignores milestone lines as a market signal", async () => {
    const ctx = await buildPickContext(dakPassing, provider);
    const m = modelPick({ ...ctx, marketLine: { ...ctx.marketLine!, milestone: true } })!;
    expect(m.sources.market).toBeUndefined();
  });
});

describe("limited-role games", () => {
  it("count less and are named", async () => {
    const ctx = await buildPickContext({ ...javonteTd, id: "rush", market: "rushing_yards", direction: "over", line: 60 }, provider);
    const games = ctx.recentGames.map((g, i) => (i === 0 ? { ...g, stats: { ...g.stats, rushingAttempts: 3, rushingYards: 4 } } : g));
    const usage = readUsage({ ...ctx, recentGames: games });
    expect(usage.limited.map((l) => l.index)).toEqual([0]);
    expect(usage.weights[0]).toBeLessThan(0.5);

    const full = modelPick(ctx)!.sources.stats;
    const dented = modelPick({ ...ctx, recentGames: games })!.sources.stats;
    const unweightedDrop = ((ctx.recentGames[0].stats.rushingYards ?? 0) - 4) / ctx.recentGames.length * 0.5;
    // The bad game moves the projection less than it would at full weight.
    expect(full - dented).toBeLessThan(unweightedDrop);
    expect(scorePick({ ...ctx, recentGames: games }).factors.find((f) => f.key === "recent_form")!.explanation).toMatch(/limited role \(3 carries vs a typical/);
  });
});
