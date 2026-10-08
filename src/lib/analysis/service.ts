import "server-only";

import { parseParlayInput } from "@/lib/parlay/schema";
import { getSportsDataProvider } from "@/lib/sports";
import type { Team } from "@/lib/types";
import { buildPickBreakdown } from "./breakdown";
import { buildPickContext, PickContextError } from "./context/buildPickContext";
import { analyzeParlayFromContexts } from "./parlay/analyzeParlay";
import type { AnalyzeResult, BreakdownResult } from "./results";

/**
 * Server-side entry points for analysis requests. Input is untrusted (it
 * comes straight from the browser), so everything is validated here.
 * Open to guests by design; add rate limiting before this calls a paid API.
 */

export async function runParlayAnalysis(input: unknown): Promise<AnalyzeResult> {
  const parsed = parseParlayInput(input);
  if (!parsed.success) {
    return { ok: false, error: "That slip couldn't be read. Remove the last pick and add it again." };
  }
  try {
    const provider = getSportsDataProvider();
    const picks = parsed.data.picks;
    const contexts = await Promise.all(picks.map((p) => buildPickContext(p, provider)));
    return { ok: true, analysis: analyzeParlayFromContexts({ id: "draft", picks }, contexts) };
  } catch (error) {
    if (error instanceof PickContextError) {
      return { ok: false, error: "One of your picks points to a player or game we don't have data for.", pickId: error.pickId };
    }
    console.error("runParlayAnalysis failed", error);
    return { ok: false, error: "The analysis didn't finish. Try again in a moment." };
  }
}

export async function runPickBreakdown(input: unknown): Promise<BreakdownResult> {
  const body = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const pickId = body.pickId;
  const parsed = parseParlayInput({ picks: body.picks });
  if (typeof pickId !== "string" || !parsed.success) {
    return { ok: false, error: "That pick couldn't be read.", reason: "invalid" };
  }
  const picks = parsed.data.picks;
  if (!picks.some((p) => p.id === pickId)) {
    return { ok: false, error: "This pick isn't in your slip anymore.", reason: "not_found" };
  }

  try {
    const provider = getSportsDataProvider();
    const contexts = await Promise.all(picks.map((p) => buildPickContext(p, provider)));
    const parlay = analyzeParlayFromContexts({ id: "draft", picks }, contexts);
    const ctx = contexts.find((c) => c.pick.id === pickId)!;
    const teamsById: Record<string, Team> = {};
    for (const t of await provider.getTeams(ctx.team.sport)) teamsById[t.id] = t;

    const breakdown = buildPickBreakdown(pickId, contexts, parlay, teamsById);
    if (!breakdown) return { ok: false, error: "This pick isn't in your slip anymore.", reason: "not_found" };
    return { ok: true, breakdown };
  } catch (error) {
    if (error instanceof PickContextError) {
      return { ok: false, error: "We don't have data for one of the picks in this slip.", reason: "failed" };
    }
    console.error("runPickBreakdown failed", error);
    return { ok: false, error: "The breakdown didn't load. Try again in a moment.", reason: "failed" };
  }
}
