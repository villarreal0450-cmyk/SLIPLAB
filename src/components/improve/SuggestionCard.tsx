import { Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { formatScore, toneClasses, toneForTier } from "@/lib/analysis/presentation";
import { formatOdds } from "@/lib/odds";
import type { ParlaySuggestion, ProjectedOutcome } from "@/lib/types";
import { ChangeList } from "./ChangeList";
import { SlipLegs } from "./SlipLegs";

type SuggestionCardProps = {
  suggestion: ParlaySuggestion;
  current: ProjectedOutcome;
  onUse: () => void;
};

export function SuggestionCard({ suggestion: s, current, onUse }: SuggestionCardProps) {
  const tone = toneForTier(s.projected.tier);
  const delta = Math.round((s.projected.score - current.score) * 10) / 10;

  return (
    <section
      aria-labelledby="suggestion-title"
      className={cn("flex flex-col gap-5 p-4 sm:p-5", s.recommended ? "surface-brand" : "surface")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {s.recommended && (
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Recommended
            </p>
          )}
          <h2 id="suggestion-title" className="text-xl font-semibold tracking-tight">
            {s.title} parlay
          </h2>
          <p className="text-sm text-muted-foreground">
            {s.projected.legCount} {s.projected.legCount === 1 ? "pick" : "picks"} · {s.tagline}
          </p>
        </div>
        <p className="shrink-0 text-2xl font-semibold tracking-tight tabular">{formatOdds(s.projected.odds)}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-sunken p-3 text-center">
        <div>
          <dt className="text-[11px] text-muted-foreground">Score</dt>
          <dd className={cn("font-semibold tabular", toneClasses[tone].text)}>
            {formatScore(s.projected.score)}
            {!s.unchanged && delta !== 0 && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({delta > 0 ? "+" : ""}
                {delta.toFixed(1)})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Cohesion</dt>
          <dd className="font-semibold tabular">{s.projected.cohesion}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Risk</dt>
          <dd className="font-semibold capitalize">{s.projected.riskLevel}</dd>
        </div>
      </dl>

      <SlipLegs picks={s.picks} flagged={s.changes.filter((c) => c.warning && c.after).map((c) => c.after!.id)} />

      <p className="text-sm leading-relaxed text-foreground/85">{s.rationale}</p>

      {s.caution && (
        <p className="flex gap-2 rounded-2xl border border-caution/25 bg-caution/[0.06] p-3 text-sm leading-relaxed text-foreground/85">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
          {s.caution}
        </p>
      )}

      {!s.unchanged && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">What changes and why</h3>
          <ChangeList changes={s.changes} />
        </div>
      )}

      <Button onClick={onUse} disabled={s.unchanged} className="h-12 rounded-2xl text-base font-semibold">
        {s.unchanged ? "Already your slip" : "Use this parlay"}
      </Button>
    </section>
  );
}
