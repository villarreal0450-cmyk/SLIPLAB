import { describe, expect, it } from "vitest";
import { MockSportsDataProvider } from "@/lib/sports/mock/mockProvider";
import { analyzeParlay, buildPickContext, computeCohesion, scorePick } from "..";
import { dakPassing, demoParlay, javonteTd, lambReceiving, pickensReceiving } from "./fixtures";

const provider = new MockSportsDataProvider();

describe("scorePick", () => {
  it("rates Dak 244+ passing as a strong pick against Tampa", async () => {
    const ctx = await buildPickContext(dakPassing, provider);
    const result = scorePick(ctx);
    expect(result.score).toBeGreaterThanOrEqual(8);
    expect(result.tier).toBe("strong");
    expect(result.factors.map((f) => f.key)).toContain("line_value");
    expect(result.bullCase.length).toBeGreaterThan(0);
    // Even a strong pick gets a counterpoint.
    expect(result.bearCase.length).toBeGreaterThan(0);
    expect(result.factors.find((f) => f.key === "injuries")?.explanation).toContain("Winfield (S) out");
    expect(result.projection?.value).toBeGreaterThan(244);
  });

  it("flags Lamb 81+ as aggressive relative to the market line", async () => {
    const ctx = await buildPickContext(lambReceiving, provider);
    const result = scorePick(ctx);
    const line = result.factors.find((f) => f.key === "line_value");
    expect(line?.impact).toBe("negative");
    expect(result.score).toBeLessThan(8.5);
  });

  it("never lists a neutral-or-better factor in the bear case", async () => {
    const ctx = await buildPickContext(javonteTd, provider);
    const result = scorePick(ctx);
    const negatives = result.factors.filter((f) => f.impact === "negative").map((f) => f.explanation);
    expect(result.bearCase).toEqual(expect.arrayContaining(negatives));
    expect(result.bearCase.some((t) => t.includes("decent scoring opportunity"))).toBe(false);
  });

  it("never sketches negative outcomes", async () => {
    const ctx = await buildPickContext(pickensReceiving, provider);
    const projection = scorePick(ctx).projection!;
    expect(projection.distribution[0].bucketStart).toBeGreaterThanOrEqual(0);
    expect(projection.distribution.at(-1)!.bucketEnd).toBeGreaterThan(projection.value);
  });

  it("scores the anytime TD leg lowest", async () => {
    const [dak, pickens, lamb, td] = await Promise.all(
      [dakPassing, pickensReceiving, lambReceiving, javonteTd].map((p) => buildPickContext(p, provider)),
    );
    const scores = [dak, pickens, lamb, td].map((c) => scorePick(c).score);
    expect(Math.min(...scores)).toBe(scores[3]);
    expect(scores[0]).toBeGreaterThan(scores[3]);
  });

  it("reports missing data instead of guessing", async () => {
    const ctx = await buildPickContext({ ...dakPassing, id: "x", playerId: "spencer-rattler", teamId: "nfl-no", opponentTeamId: "nfl-atl", gameId: "nfl-2026-w5-atl-no" }, provider);
    const result = scorePick(ctx);
    expect(result.missingData.length).toBeGreaterThan(0);
  });
});

describe("weakest leg", () => {
  it("is not flagged when every leg grades good or better", async () => {
    const strongOnly = { id: "strong", picks: [dakPassing, { ...lambReceiving, line: 66.5, odds: -210 }] };
    const analysis = await analyzeParlay(strongOnly, provider);
    expect(analysis.picks.every((p) => p.score >= 7.5)).toBe(true);
    expect(analysis.weakestLeg).toBeNull();
  });
});

describe("computeCohesion", () => {
  it("rewards a QB + WR stack and notes target competition", async () => {
    const ctxs = await Promise.all([dakPassing, lambReceiving, pickensReceiving].map((p) => buildPickContext(p, provider)));
    const cohesion = computeCohesion(ctxs);
    expect(cohesion.score).toBeGreaterThanOrEqual(70);
    expect(cohesion.findings.some((f) => f.ruleKey === "qb_receiver_stack")).toBe(true);
    expect(cohesion.findings.some((f) => f.ruleKey === "target_competition")).toBe(true);
  });
});

describe("analyzeParlay", () => {
  it("produces the full MVP analysis for the demo parlay", async () => {
    const analysis = await analyzeParlay(demoParlay, provider);
    expect(analysis.legCount).toBe(4);
    expect(analysis.score).toBeGreaterThan(6);
    expect(analysis.weakestLeg?.pickId).toBe("pick-javonte");
    expect(analysis.weakestLeg?.reason).toMatch(/^Touchdowns are inherently volatile, even with decent red-zone usage/);
    expect(analysis.gameScripts).toHaveLength(1);
    expect(analysis.gameScripts[0].beats.length).toBeGreaterThanOrEqual(3);
    expect(analysis.gameScripts[0].helpedPickIds).toContain("pick-dak");
    expect(analysis.gameScripts[0].breaker).toMatch(/Tampa Bay/);
    expect(analysis.combinedOdds).not.toBeNull();
    expect(analysis.dataSource.isMock).toBe(true);
    expect(["low", "medium", "high"]).toContain(analysis.riskLevel);
  });
});
