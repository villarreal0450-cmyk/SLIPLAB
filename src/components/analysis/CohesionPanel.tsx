import { cn } from "cn";
import { labelForCorrelation, toneClasses, toneForCohesion, toneForCorrelation } from "@/lib/analysis/presentation";
import type { CohesionResult, Pick } from "@/lib/types";
import { lastName } from "@/lib/format/names";

/** Parlay cohesion: do the legs tell one coherent story? */
export function CohesionPanel({ cohesion, picks }: { cohesion: CohesionResult; picks: Pick[] }) {
  const tone = toneForCohesion(cohesion.score);
  const byId = new Map(picks.map((p) => [p.id, p]));
  const legName = (id: string) => { const pick = byId.get(id); return pick ? lastName(pick.playerName) : "Leg"; };

  return (
    <section className="surface p-4 sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Parlay cohesion</h3>
          <p className={cn("mt-1 text-lg font-semibold tracking-tight", toneClasses[tone].text)}>{cohesion.label}</p>
        </div>
        <p className="text-3xl font-semibold tracking-tight tabular">
          {cohesion.score}
          <span className="text-base font-normal text-muted-foreground">/100</span>
        </p>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={cohesion.score}
        aria-label="Cohesion score"
      >
        <div className={cn("h-full origin-left animate-bar-in rounded-full", toneClasses[tone].bg)} style={{ width: `${cohesion.score}%` }} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{cohesion.summary}</p>

      {cohesion.findings.length > 0 && (
        <ul className="mt-5 flex flex-col divide-y divide-border">
          {cohesion.findings.map((f) => {
            const fTone = toneForCorrelation(f.type);
            return (
              <li key={`${f.ruleKey}-${f.pickIds.join("-")}`} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    {legName(f.pickIds[0])} <span className="text-muted-foreground">+</span> {legName(f.pickIds[1])}
                  </p>
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", toneClasses[fTone].soft, toneClasses[fTone].text)}>
                    {labelForCorrelation(f.type)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.explanation}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
