import { beforeAll, describe, expect, it } from "vitest";
import { americanToDecimal } from "@/lib/odds";
import { MockSportsDataProvider } from "@/lib/sports/mock/mockProvider";
import type { ParlayAnalysis, ParlaySuggestion, PickContext } from "@/lib/types";
import { analyzeParlayFromContexts, buildPickContext } from "..";
import { buildLegAlternatives, buildSuggestions, loadCandidates, type Candidate } from "../suggestions";
import { demoParlay } from "./fixtures";

const provider = new MockSportsDataProvider();
const picks = demoParlay.picks;
let contexts: PickContext[];
let current: ParlayAnalysis;
let candidates: Candidate[];
let suggestions: ParlaySuggestion[];
const byProfile = (p: ParlaySuggestion["profile"]) => suggestions.find((s) => s.profile === p)!;

beforeAll(async () => {
  contexts = await Promise.all(picks.map((p) => buildPickContext(p, provider)));
  current = analyzeParlayFromContexts(demoParlay, contexts);
  candidates = await loadCandidates(picks.map((p) => p.gameId), provider);
  suggestions = buildSuggestions({ picks, contexts, current, candidates });
});

describe("buildSuggestions", () => {
  it("returns the three profiles with exactly one recommendation", () => {
    expect(suggestions.map((s) => s.profile)).toEqual(["safer", "balanced", "aggressive"]);
    expect(suggestions.filter((s) => s.recommended)).toHaveLength(1);
  });

  it("safer cuts the touchdown leg, buys Lamb's line down and grades better", () => {
    const safer = byProfile("safer");
    expect(safer.changes.find((c) => c.before?.id === "pick-javonte")?.type).toBe("remove");
    const lamb = safer.changes.find((c) => c.before?.id === "pick-lamb");
    expect(lamb?.type).toBe("adjust_line");
    expect(lamb!.after!.line!).toBeLessThan(81);
    expect(safer.projected.score).toBeGreaterThan(current.score);
    expect(safer.rationale).toMatch(/^This version cuts 1 leg the data doesn't support and buys cushion on 2 lines\./);
  });

  it("explains every change and only uses priced lines", () => {
    for (const s of suggestions) {
      for (const c of s.changes) {
        expect(c.reason.length).toBeGreaterThan(10);
        if (c.type !== "keep" && c.after) expect(c.after.odds).toBeDefined();
      }
    }
  });

  it("aggressive only raises a line when the new price beats the user's", () => {
    for (const c of byProfile("aggressive").changes.filter((c) => c.type === "adjust_line")) {
      expect(americanToDecimal(c.after!.odds!)).toBeGreaterThan(americanToDecimal(c.before!.odds!));
    }
    expect(byProfile("aggressive").caution).toBeTruthy();
    // A weak leg kept for upside is flagged, not presented as fine.
    expect(byProfile("aggressive").changes.find((c) => c.before?.id === "pick-javonte")?.warning).toBe(true);
  });

  it("never replaces a leg with a player already carrying another leg", () => {
    for (const s of suggestions) {
      for (const c of s.changes.filter((c) => c.type === "replace" || c.type === "add")) {
        const others = picks.filter((p) => p.id !== c.before?.id).map((p) => p.playerId);
        expect(others).not.toContain(c.after!.playerId);
      }
    }
  });
});

describe("buildLegAlternatives", () => {
  it("offers steadier markets for a touchdown leg when there is no line to buy down", () => {
    const opts = buildLegAlternatives({ pickId: "pick-javonte", mode: "safer", picks, contexts, current, candidates });
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.every((o) => o.kind === "other_market" && o.pick.playerId === "javonte-williams")).toBe(true);
  });

  it("offers easier lines for a stretched yardage leg", () => {
    const opts = buildLegAlternatives({ pickId: "pick-lamb", mode: "safer", picks, contexts, current, candidates });
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.every((o) => o.kind === "easier_line" && o.pick.line! < 81)).toBe(true);
  });

  it("ranks same-game replacements that beat the weak leg", () => {
    const opts = buildLegAlternatives({ pickId: "pick-javonte", mode: "replace", picks, contexts, current, candidates });
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.every((o) => o.pick.gameId === "nfl-2026-w5-tb-dal" && o.score > 4.6)).toBe(true);
    const scores = opts.map((o) => o.parlayAfter.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});

describe("picks with no sportsbook line", () => {
  it("still builds suggestions for a strong pick the market doesn't quote", async () => {
    const pick = { ...demoParlay.picks[0], id: "no-market", line: 0.5, odds: undefined };
    const ctx = { ...(await buildPickContext(pick, provider)), marketLine: null };
    const analysis = analyzeParlayFromContexts({ id: "nm", picks: [pick] }, [ctx]);
    expect(analysis.picks[0].score).toBeGreaterThanOrEqual(7.5);
    expect(() => buildSuggestions({ picks: [pick], contexts: [ctx], current: analysis, candidates: [] })).not.toThrow();
  });
});
