import type { LegAlternative, ParlayAnalysis, ParlaySuggestion, Pick, PickContext } from "@/lib/types";

export type ChatRole = "user" | "analyst";
export type ChatMessage = { role: ChatRole; content: string };

/** Which brain answered: Claude, or the rule-based analyst built on the scoring engine. */
export type AnalystMode = "ai" | "rules";

/**
 * Everything the analyst knows about the slip. Assembled on the server from
 * the same engine output the UI shows, so answers can't drift from the screen.
 */
export type AnalystBriefing = {
  picks: Pick[];
  contexts: PickContext[];
  analysis: ParlayAnalysis;
  suggestions: ParlaySuggestion[];
  /** Best same-game swaps for the weakest leg, if there is one. */
  replaceOptions: LegAlternative[];
  /** For slips of 4+ legs: the three best legs and how they grade together. */
  topThree: { picks: Pick[]; analysis: ParlayAnalysis } | null;
};

export const SUGGESTED_PROMPTS = [
  "Which leg worries you most?",
  "Make this parlay safer.",
  "Convince me not to bet this.",
  "What happens if Dallas gets an early lead?",
  "Which three picks would you keep?",
  "Is this parlay too correlated?",
  "What would you replace?",
] as const;
