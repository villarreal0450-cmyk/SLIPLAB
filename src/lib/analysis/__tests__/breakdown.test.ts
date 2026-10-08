import { describe, expect, it } from "vitest";
import { MockSportsDataProvider } from "@/lib/sports/mock/mockProvider";
import type { Team } from "@/lib/types";
import { analyzeParlayFromContexts, buildPickBreakdown, buildPickContext } from "..";
import { demoParlay } from "./fixtures";

const provider = new MockSportsDataProvider();

async function breakdownFor(pickId: string) {
  const contexts = await Promise.all(demoParlay.picks.map((p) => buildPickContext(p, provider)));
  const parlay = analyzeParlayFromContexts(demoParlay, contexts);
  const teams: Record<string, Team> = {};
  for (const t of await provider.getTeams("nfl")) teams[t.id] = t;
  return buildPickBreakdown(pickId, contexts, parlay, teams);
}

describe("buildPickBreakdown", () => {
  it("builds Dak's breakdown with a chronological game log graded against 244+", async () => {
    const b = await breakdownFor("pick-dak");
    expect(b).not.toBeNull();
    expect(b!.recentGames.map((g) => g.value)).toEqual([289, 223, 254, 247, 335]);
    expect(b!.recentGames.map((g) => g.opponentAbbr)).toEqual(["WAS", "CHI", "NYG", "LV", "HOU"]);
    expect(b!.hitRate).toEqual({ hits: 4, games: 5 });
    expect(b!.usage?.label).toBe("Pass attempts");
    expect(b!.defense?.focus).toBe("pass");
    expect(b!.game.spread).toBe(-2.5);
    expect(b!.correlations.length).toBeGreaterThan(0);
  });

  it("grades yes/no markets by whether the event happened", async () => {
    const b = await breakdownFor("pick-javonte");
    expect(b!.recentGames.map((g) => g.hit)).toEqual([false, false, true, false, true]);
    expect(b!.defense?.focus).toBe("run");
  });

  it("returns null for an unknown pick", async () => {
    expect(await breakdownFor("nope")).toBeNull();
  });
});
