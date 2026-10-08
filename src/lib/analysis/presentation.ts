import type { CorrelationType, RiskLevel, ScoreTier } from "@/lib/types";

/**
 * Visual language for analysis results. Components read tones from here so
 * colors stay consistent: green = favorable, amber = caution, red = risk.
 */

export type Tone = "positive" | "caution" | "negative" | "neutral";

export const toneClasses: Record<Tone, { text: string; bg: string; soft: string; border: string; stroke: string }> = {
  positive: { text: "text-positive", bg: "bg-positive", soft: "bg-positive/12", border: "border-positive/30", stroke: "var(--positive)" },
  caution: { text: "text-caution", bg: "bg-caution", soft: "bg-caution/12", border: "border-caution/30", stroke: "var(--caution)" },
  negative: { text: "text-negative", bg: "bg-negative", soft: "bg-negative/12", border: "border-negative/30", stroke: "var(--negative)" },
  neutral: { text: "text-muted-foreground", bg: "bg-muted-foreground", soft: "bg-muted", border: "border-border", stroke: "var(--muted-foreground)" },
};

const tierTone: Record<ScoreTier, Tone> = { strong: "positive", good: "positive", risky: "caution", avoid: "negative" };
const tierLabel: Record<ScoreTier, string> = { strong: "Strong pick", good: "Good pick", risky: "Risky", avoid: "Avoid" };

export const toneForTier = (tier: ScoreTier): Tone => tierTone[tier];
export const labelForTier = (tier: ScoreTier) => tierLabel[tier];

export const toneForRisk = (risk: RiskLevel): Tone => (risk === "low" ? "positive" : risk === "medium" ? "caution" : "negative");
export const labelForRisk = (risk: RiskLevel) => risk[0].toUpperCase() + risk.slice(1);

export const toneForCohesion = (score: number): Tone => (score >= 75 ? "positive" : score >= 55 ? "caution" : "negative");

export const toneForCorrelation = (type: CorrelationType): Tone =>
  type === "positive" ? "positive" : type === "competition" ? "caution" : "negative";

export const labelForCorrelation = (type: CorrelationType) =>
  type === "positive" ? "Work together" : type === "competition" ? "Share targets" : "Pull apart";

export function labelForScriptConfidence(confidence: number) {
  if (confidence >= 0.7) return "Strong lean";
  if (confidence >= 0.5) return "Moderate lean";
  return "Loose read";
}

export const formatScore = (score: number) => score.toFixed(1);
