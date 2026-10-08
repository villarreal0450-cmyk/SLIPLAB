import { describe, expect, it } from "vitest";
import { dakPassing, demoParlay, javonteTd } from "@/lib/analysis/__tests__/fixtures";
import { parseParlayInput } from "../schema";

describe("parseParlayInput", () => {
  it("accepts the demo parlay", () => {
    expect(parseParlayInput({ picks: demoParlay.picks }).success).toBe(true);
  });

  it("rejects empty slips, bad odds and unknown markets", () => {
    expect(parseParlayInput({ picks: [] }).success).toBe(false);
    expect(parseParlayInput({ picks: [{ ...dakPassing, odds: 50 }] }).success).toBe(false);
    expect(parseParlayInput({ picks: [{ ...dakPassing, market: "hot_dogs" }] }).success).toBe(false);
  });

  it("enforces market-kind consistency", () => {
    expect(parseParlayInput({ picks: [{ ...dakPassing, direction: "yes" }] }).success).toBe(false);
    expect(parseParlayInput({ picks: [{ ...dakPassing, line: null }] }).success).toBe(false);
    expect(parseParlayInput({ picks: [{ ...javonteTd, line: 1 }] }).success).toBe(false);
  });

  it("rejects duplicate ids and non-objects", () => {
    expect(parseParlayInput({ picks: [dakPassing, dakPassing] }).success).toBe(false);
    expect(parseParlayInput("nope").success).toBe(false);
  });
});
