import { ScoreRing } from "@/components/analysis/ScoreRing";
import { toneClasses, toneForTier } from "@/lib/analysis/presentation";
import type { PickAnalysis } from "@/lib/types";

export function VerdictCard({ analysis }: { analysis: PickAnalysis }) {
  const tone = toneForTier(analysis.tier);
  return (
    <section className="surface flex items-center gap-4 p-4 sm:p-5">
      <ScoreRing score={analysis.score} tone={tone} size="md" label={`Pick score ${analysis.score} out of 10, ${analysis.verdict}`} />
      <div className="min-w-0">
        <p className={`text-lg font-semibold tracking-tight ${toneClasses[tone].text}`}>{analysis.verdict}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
      </div>
    </section>
  );
}
