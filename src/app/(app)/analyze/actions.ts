"use server";

import { analyzeParlay, PickContextError } from "@/lib/analysis";
import { parseParlayInput } from "@/lib/parlay/schema";
import { getSportsDataProvider } from "@/lib/sports";
import type { ParlayAnalysis } from "@/lib/types";

export type AnalyzeResult =
  | { ok: true; analysis: ParlayAnalysis }
  | { ok: false; error: string; pickId?: string };

/**
 * Analyze a draft parlay. Open to guests by design (demo before sign-up), so
 * it is read-only and validates every field. Add rate limiting before this
 * calls any paid API.
 */
export async function analyzeParlayAction(input: unknown): Promise<AnalyzeResult> {
  const parsed = parseParlayInput(input);
  if (!parsed.success) {
    return { ok: false, error: "That slip couldn't be read. Remove the last pick and add it again." };
  }

  try {
    const analysis = await analyzeParlay({ id: "draft", picks: parsed.data.picks }, getSportsDataProvider());
    return { ok: true, analysis };
  } catch (error) {
    if (error instanceof PickContextError) {
      return { ok: false, error: "One of your picks points to a player or game we don't have data for.", pickId: error.pickId };
    }
    console.error("analyzeParlayAction failed", error);
    return { ok: false, error: "The analysis didn't finish. Try again in a moment." };
  }
}
