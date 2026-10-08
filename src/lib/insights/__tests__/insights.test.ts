import { describe, expect, it } from "vitest";
import { checkExposure } from "@/lib/bankroll/model";
import { reviewBet, reviewLeg } from "@/lib/bets/review";
import { computeInsights } from "../compute";
import { sampleHistory } from "../sample";

const bets = sampleHistory();

describe("computeInsights", () => {
  const i = computeInsights(bets);

  it("counts placed, open and settled bets", () => {
    expect(i.totals.placed).toBe(22);
    expect(i.totals.open).toBe(1);
    expect(i.totals.won + i.totals.lost + i.totals.void).toBe(i.totals.settled);
    expect(i.totals.bets.total).toBe(i.totals.won + i.totals.lost);
  });

  it("separates markets and shows touchdowns as the weak spot", () => {
    const td = i.byMarket.find((g) => g.key === "anytime_td")!;
    const rec = i.byMarket.find((g) => g.key === "receiving_yards")!;
    expect(td.rate.rate!).toBeLessThan(rec.rate.rate!);
  });

  it("produces grounded highlights", () => {
    expect(i.highlights.some((h) => /losing parlays included a failed touchdown prop/.test(h))).toBe(true);
    expect(i.highlights.some((h) => /graded 7\.5\+ hit/.test(h))).toBe(true);
    expect(i.highlights.some((h) => /7\+ legs your worst/.test(h))).toBe(true);
  });

  it("records process reviews for settled legs", () => {
    const total = Object.values(i.process).reduce((a, b) => a + b, 0);
    expect(total).toBe(i.totals.legs.total);
  });

  it("is empty-safe", () => {
    const empty = computeInsights([]);
    expect(empty.totals.bets.rate).toBeNull();
    expect(empty.highlights).toEqual([]);
  });
});

describe("post-game review", () => {
  it("separates process from result", () => {
    const [first] = bets; // Dak W, Pickens W, Lamb L (6.5, 73 vs 81: near miss), Javonte TD L (4.6)
    const reviews = first.legs.map((l) => reviewLeg(l)?.category);
    expect(reviews).toEqual(["good_read", "good_read", "high_variance_result", "high_variance_result"]);
    expect(reviewBet(first)!.headline).toBe(
      "The leg flagged as weakest — Williams Anytime Touchdown — missed, along with 1 other. 2 of the misses graded below 7 before the game — that's where the slip was thin.",
    );
  });

  it("calls a strong leg that missed good process, bad result", () => {
    const bet = bets[9]; // Dak W, Lamb 66.5 W, Pickens 62+ L at 55 (8.1)
    expect(reviewLeg(bet.legs[2])?.category).toBe("good_process_bad_result");
    expect(reviewBet(bet)!.headline).toMatch(/graded 7\+ going in: good process, bad result/);
  });

  it("doesn't reward a weak leg that happened to hit", () => {
    const single = bets[4]; // Javonte TD single, won, 4.6
    expect(reviewLeg(single.legs[0])?.category).toBe("bad_process");
  });
});

describe("bankroll exposure", () => {
  const settings = { bankroll: 2000, unitSize: 20, maxExposurePct: 5 };
  it("warns when a stake exceeds the exposure limit", () => {
    const c = checkExposure(500, settings, "high");
    expect(c.level).toBe("over");
    expect(c.notes[0]).toMatch(/25% of your bankroll/);
    expect(c.suggestedUnits).toBe(0.25);
  });
  it("stays quiet for normal stakes", () => {
    expect(checkExposure(10, settings, "medium").level).toBe("ok");
  });
  it("notices stakes creeping up after recent losses", () => {
    const now = Date.parse("2026-10-08T12:00:00Z");
    const recent = bets.map((b) => (b.status === "lost" ? { ...b, settledAt: "2026-10-08T06:00:00Z" } : b));
    const c = checkExposure(60, settings, "low", recent, now);
    expect(c.notes.join(" ")).toMatch(/losses in the last day/);
  });
});
