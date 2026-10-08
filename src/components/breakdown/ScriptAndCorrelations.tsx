import { Link2, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "cn";
import type { PickBreakdown } from "@/lib/analysis";
import { labelForCorrelation, labelForScriptConfidence, toneClasses, toneForCorrelation } from "@/lib/analysis/presentation";

/** How this leg fits the rest of the slip: game script effect and correlations. */
export function ScriptAndCorrelations({ breakdown: b }: { breakdown: PickBreakdown }) {
  const gs = b.gameScript;
  return (
    <section aria-labelledby="fit-heading" className="surface p-4 sm:p-5">
      <h2 id="fit-heading" className="mb-3 font-semibold tracking-tight">
        How it fits your slip
      </h2>

      {gs && (
        <div className="mb-4">
          <p className="mb-1.5 flex items-center gap-2 text-sm font-medium">
            {gs.effect === "helped" ? (
              <TrendingUp className="size-4 text-positive" aria-hidden="true" />
            ) : gs.effect === "hurt" ? (
              <TrendingDown className="size-4 text-negative" aria-hidden="true" />
            ) : null}
            {gs.effect === "helped" ? "Helped by the expected game script" : gs.effect === "hurt" ? "Hurt by the expected game script" : "Not tied to the expected game script"}
            <span className="text-xs font-normal text-muted-foreground">· {labelForScriptConfidence(gs.script.confidence)}</span>
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{gs.script.summary}</p>
          {gs.effect === "helped" && gs.script.breaker && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">Risk: {gs.script.breaker}</p>}
        </div>
      )}

      {b.correlations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No direct relationship with the other legs.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {b.correlations.map(({ finding, otherPlayer }) => {
            const tone = toneForCorrelation(finding.type);
            return (
              <li key={`${finding.ruleKey}-${otherPlayer}`} className="flex gap-3">
                <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg", toneClasses[tone].soft, toneClasses[tone].text)}>
                  <Link2 className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    With {otherPlayer} <span className="font-normal text-muted-foreground">· {labelForCorrelation(finding.type)}</span>
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{finding.explanation}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
