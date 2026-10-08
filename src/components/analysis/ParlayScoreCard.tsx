import { formatOdds } from "@/lib/odds";
import { labelForRisk, toneClasses, toneForCohesion, toneForRisk, toneForTier } from "@/lib/analysis/presentation";
import type { ParlayAnalysis } from "@/lib/types";
import { MetricTile } from "./MetricTile";
import { ScoreRing } from "./ScoreRing";

/** Hero of the analysis screen: overall score, verdict and the three headline metrics. */
export function ParlayScoreCard({ analysis }: { analysis: ParlayAnalysis }) {
  const tone = toneForTier(analysis.tier);
  return (
    <div className="flex flex-col gap-3">
      <section aria-labelledby="parlay-score-heading" className="surface p-5">
        <h2 id="parlay-score-heading" className="mb-4 text-sm font-medium text-muted-foreground">
          Parlay score
        </h2>
        <div className="flex items-center gap-5">
          <ScoreRing score={analysis.score} tone={tone} label={`Parlay score ${analysis.score} out of 10, ${analysis.label}`} />
          <div className="min-w-0">
            <p className={`text-lg font-semibold tracking-tight ${toneClasses[tone].text}`}>{analysis.label}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2.5">
        <MetricTile label="Cohesion" value={analysis.cohesion.score} suffix="/100" tone={toneForCohesion(analysis.cohesion.score)} />
        <MetricTile label="Risk level" value={labelForRisk(analysis.riskLevel)} tone={toneForRisk(analysis.riskLevel)} />
        <MetricTile
          label={`${analysis.legCount} ${analysis.legCount === 1 ? "leg" : "legs"}`}
          value={analysis.combinedOdds !== null ? formatOdds(analysis.combinedOdds) : "—"}
        />
      </div>
    </div>
  );
}
