import { describe, expect, it } from "vitest";
import { runParlayAnalysis, runPickBreakdown } from "../service";
import { dakPassing, demoParlay } from "./fixtures";

describe("analysis service", () => {
  it("analyzes a valid slip", async () => {
    const result = await runParlayAnalysis({ picks: demoParlay.picks });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.analysis.legCount).toBe(4);
  });

  it("rejects malformed input without throwing", async () => {
    expect((await runParlayAnalysis({ picks: "nope" })).ok).toBe(false);
    expect((await runParlayAnalysis(null)).ok).toBe(false);
  });

  it("reports unknown players as a pick-specific error", async () => {
    const result = await runParlayAnalysis({ picks: [{ ...dakPassing, playerId: "ghost" }] });
    expect(result).toMatchObject({ ok: false, pickId: dakPassing.id });
  });

  it("returns a breakdown, or not_found for picks outside the slip", async () => {
    const ok = await runPickBreakdown({ pickId: "pick-lamb", picks: demoParlay.picks });
    expect(ok.ok).toBe(true);
    const missing = await runPickBreakdown({ pickId: "other", picks: demoParlay.picks });
    expect(missing).toMatchObject({ ok: false, reason: "not_found" });
    const invalid = await runPickBreakdown({ picks: demoParlay.picks });
    expect(invalid).toMatchObject({ ok: false, reason: "invalid" });
  });
});
