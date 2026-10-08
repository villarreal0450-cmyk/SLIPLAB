import { describe, expect, it } from "vitest";
import { dakPassing, javonteTd, lambReceiving } from "@/lib/analysis/__tests__/fixtures";
import { EMPTY_DRAFT, MAX_LEGS, parseDraft, reduceDraft } from "../draft";
import { describePick, formatLine } from "../format";

const now = "2026-10-08T00:00:00Z";

describe("reduceDraft", () => {
  it("adds picks and timestamps the draft", () => {
    const { draft } = reduceDraft(EMPTY_DRAFT, { type: "upsert", pick: dakPassing }, now);
    expect(draft.picks).toHaveLength(1);
    expect(draft.updatedAt).toBe(now);
  });

  it("replaces the same player + market instead of duplicating, keeping the original id", () => {
    let { draft } = reduceDraft(EMPTY_DRAFT, { type: "upsert", pick: dakPassing }, now);
    ({ draft } = reduceDraft(draft, { type: "upsert", pick: { ...dakPassing, id: "new-id", line: 225 } }, now));
    expect(draft.picks).toHaveLength(1);
    expect(draft.picks[0].line).toBe(225);
    expect(draft.picks[0].id).toBe(dakPassing.id);
  });

  it("removes and clears", () => {
    let { draft } = reduceDraft(EMPTY_DRAFT, { type: "upsert", pick: dakPassing }, now);
    ({ draft } = reduceDraft(draft, { type: "upsert", pick: lambReceiving }, now));
    ({ draft } = reduceDraft(draft, { type: "remove", pickId: dakPassing.id }, now));
    expect(draft.picks.map((p) => p.id)).toEqual([lambReceiving.id]);
    ({ draft } = reduceDraft(draft, { type: "clear" }, now));
    expect(draft.picks).toHaveLength(0);
  });

  it("refuses to exceed the leg cap", () => {
    let draft = EMPTY_DRAFT;
    for (let i = 0; i < MAX_LEGS; i++) {
      ({ draft } = reduceDraft(draft, { type: "upsert", pick: { ...dakPassing, id: `p${i}`, playerId: `player-${i}` } }, now));
    }
    const result = reduceDraft(draft, { type: "upsert", pick: lambReceiving }, now);
    expect(result.error).toBe("max_legs");
    expect(result.draft.picks).toHaveLength(MAX_LEGS);
  });
});

describe("swap and set", () => {
  it("swaps a leg in place and drops a duplicate selection", () => {
    let { draft } = reduceDraft(EMPTY_DRAFT, { type: "set", picks: [dakPassing, lambReceiving, javonteTd] }, now);
    const easierLamb = { ...lambReceiving, id: "lamb-72", line: 72.5 };
    ({ draft } = reduceDraft(draft, { type: "swap", pickId: lambReceiving.id, pick: easierLamb }, now));
    expect(draft.picks.map((p) => p.id)).toEqual([dakPassing.id, "lamb-72", javonteTd.id]);
    // Swapping the TD leg into Dak's passing yards removes the old duplicate Dak leg.
    ({ draft } = reduceDraft(draft, { type: "swap", pickId: javonteTd.id, pick: { ...dakPassing, id: "dak-2", line: 225 } }, now));
    expect(draft.picks.map((p) => p.id)).toEqual(["lamb-72", "dak-2"]);
  });

  it("set replaces the slip and de-duplicates", () => {
    const { draft } = reduceDraft(EMPTY_DRAFT, { type: "set", picks: [dakPassing, { ...dakPassing, id: "x" }, lambReceiving] }, now);
    expect(draft.picks.map((p) => p.id)).toEqual([dakPassing.id, lambReceiving.id]);
  });
});

describe("parseDraft", () => {
  it("round-trips a valid draft", () => {
    const { draft } = reduceDraft(EMPTY_DRAFT, { type: "upsert", pick: javonteTd }, now);
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
  });

  it("drops malformed data", () => {
    expect(parseDraft("not json")).toEqual(EMPTY_DRAFT);
    expect(parseDraft(JSON.stringify({ version: 2, picks: [] }))).toEqual(EMPTY_DRAFT);
    expect(parseDraft(JSON.stringify({ version: 1, picks: [{ id: 1 }] })).picks).toHaveLength(0);
  });
});

describe("format", () => {
  it("formats lines the way sportsbooks show them", () => {
    expect(formatLine("passing_yards", "over", 244)).toBe("244+");
    expect(formatLine("passing_yards", "over", 265.5)).toBe("Over 265.5");
    expect(formatLine("passing_yards", "under", 265.5)).toBe("Under 265.5");
    expect(formatLine("anytime_td", "yes", null)).toBe("Yes");
    expect(describePick(dakPassing)).toBe("244+ Passing Yards");
    expect(describePick(javonteTd)).toBe("Anytime Touchdown");
  });
});

import type { MarketLine } from "@/lib/types";
import { compareToMarket, marketOddsFor, parseOddsInput } from "../marketMath";

const dakMarket: MarketLine = {
  playerId: "dak-prescott",
  gameId: "g",
  market: "passing_yards",
  line: 265.5,
  overOdds: -112,
  underOdds: -108,
  alternates: [
    { line: 245.5, overOdds: -200, underOdds: 160 },
    { line: 243.5, overOdds: -210, underOdds: 170 },
  ],
  updatedAt: "",
};

describe("marketMath", () => {
  it("finds main, alternate and whole-number-equivalent prices", () => {
    expect(marketOddsFor(dakMarket, "over", 265.5)).toBe(-112);
    expect(marketOddsFor(dakMarket, "under", 245.5)).toBe(160);
    expect(marketOddsFor(dakMarket, "over", 244)).toBe(-210);
    expect(marketOddsFor(dakMarket, "over", 251)).toBeUndefined();
  });

  it("compares the user's line to the market from the bettor's side", () => {
    expect(compareToMarket(dakMarket, "over", 244)).toEqual({ tone: "easier", delta: 22 });
    expect(compareToMarket(dakMarket, "over", 280.5)?.tone).toBe("harder");
    expect(compareToMarket(dakMarket, "under", 280.5)?.tone).toBe("easier");
    expect(compareToMarket(dakMarket, "over", 265.5)?.tone).toBe("even");
  });

  it("parses odds input strictly", () => {
    expect(parseOddsInput("")).toBeUndefined();
    expect(parseOddsInput("+120")).toBe(120);
    expect(parseOddsInput("-115")).toBe(-115);
    expect(parseOddsInput("50")).toBeNull();
    expect(parseOddsInput("abc")).toBeNull();
  });
});
