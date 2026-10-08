import { beforeAll, describe, expect, it } from "vitest";
import { MockSportsDataProvider } from "@/lib/sports/mock/mockProvider";
import { demoParlay } from "@/lib/analysis/__tests__/fixtures";
import { buildBriefing } from "../briefing";
import { answerWithRules, detectIntent } from "../rules";
import { SUGGESTED_PROMPTS, type AnalystBriefing } from "../types";

let b: AnalystBriefing;
beforeAll(async () => {
  b = await buildBriefing(demoParlay.picks, new MockSportsDataProvider());
});

describe("rule-based analyst", () => {
  it("recognizes every suggested prompt", () => {
    for (const prompt of SUGGESTED_PROMPTS) {
      expect(detectIntent(prompt, b).intent, prompt).not.toBe("unknown");
    }
  });

  it("names the weakest leg with its real score", () => {
    const text = answerWithRules("Which leg worries you most?", b);
    const score = b.analysis.picks.find((p) => p.pickId === "pick-javonte")!.score.toFixed(1);
    expect(text).toContain("Williams");
    expect(text).toContain(`${score}/10`);
  });

  it("argues against the bet with concrete points", () => {
    const text = answerWithRules("Convince me not to bet this.", b);
    expect(text).toMatch(/4 legs/);
    expect(text).toContain("Williams");
  });

  it("keeps the three best legs and drops the weakest", () => {
    const text = answerWithRules("Which three picks would you keep?", b);
    expect(text).toContain("I'd drop Williams");
  });

  it("answers about a specific player", () => {
    expect(detectIntent("What about Pickens?", b)).toMatchObject({ intent: "player" });
    expect(answerWithRules("What about Pickens?", b)).toMatch(/^Pickens 62\+ Receiving Yards/);
  });

  it("is honest about questions it can't answer", () => {
    expect(answerWithRules("Who wins the Super Bowl?", b)).toMatch(/^I can't answer that one yet/);
  });

  it("flags demo data", () => {
    expect(answerWithRules("Is this parlay too correlated?", b)).toContain("demo data");
  });
});
