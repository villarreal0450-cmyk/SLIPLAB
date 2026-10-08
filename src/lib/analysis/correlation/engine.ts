import type { CohesionResult, CorrelationFinding, PickContext } from "@/lib/types";
import { clamp } from "../scoring/math";
import { defaultCorrelationRules, type CorrelationRule } from "./rules";

export function cohesionLabel(score: number): string {
  if (score >= 80) return "Strong cohesion";
  if (score >= 65) return "Solid cohesion";
  if (score >= 50) return "Mixed signals";
  return "Conflicting legs";
}

/**
 * Parlay cohesion: do these legs tell one coherent story?
 * Starts from a neutral 70, rewards positive correlation, penalizes conflicts
 * and target competition, and penalizes spreading across many games (each
 * extra game is an independent story the parlay must get right).
 */
export function computeCohesion(contexts: PickContext[], rules: readonly CorrelationRule[] = defaultCorrelationRules): CohesionResult {
  const findings: CorrelationFinding[] = [];
  for (let i = 0; i < contexts.length; i++) {
    for (let j = i + 1; j < contexts.length; j++) {
      for (const rule of rules) {
        const f = rule.evaluate(contexts[i], contexts[j]);
        if (f) findings.push(f);
      }
    }
  }

  if (contexts.length < 2) {
    return { score: 100, label: "Single leg", findings, summary: "One leg — nothing to correlate." };
  }

  const positive = findings.filter((f) => f.strength > 0).reduce((acc, f) => acc + f.strength, 0);
  const negative = findings.filter((f) => f.strength < 0).reduce((acc, f) => acc + f.strength, 0);
  const games = new Set(contexts.map((c) => c.game.id)).size;
  const gamePenalty = (games - 1) * 6;

  const score = Math.round(clamp(70 + Math.min(positive, 1.2) * 22 + negative * 30 - gamePenalty, 0, 100));

  const summary = buildSummary(findings, games, score);
  return { score, label: cohesionLabel(score), findings, summary };
}

function buildSummary(findings: CorrelationFinding[], games: number, score: number): string {
  const pos = findings.filter((f) => f.type === "positive").length;
  const neg = findings.filter((f) => f.type !== "positive").length;
  const parts: string[] = [];
  if (pos) parts.push(`${pos} supporting relationship${pos > 1 ? "s" : ""}`);
  if (neg) parts.push(`${neg} point${neg > 1 ? "s" : ""} of tension`);
  if (games > 1) parts.push(`${games} separate games`);
  const base = parts.length ? parts.join(", ") + "." : "No meaningful relationships between legs.";
  if (score >= 80) return `The legs tell one story: ${base}`;
  if (score >= 65) return `Mostly coherent — ${base}`;
  return `The legs are pulling in different directions: ${base}`;
}
