import { ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { labelForScriptConfidence } from "@/lib/analysis/presentation";
import { describePick } from "@/lib/parlay/format";
import type { GameScript, Pick } from "@/lib/types";

/** The parlay read as one story: projected game flow and which legs it helps or hurts. */
export function GameScriptCard({ script, picks }: { script: GameScript; picks: Pick[] }) {
  const byId = new Map(picks.map((p) => [p.id, p]));
  const helped = script.helpedPickIds.map((id) => byId.get(id)).filter((p): p is Pick => !!p);
  const hurt = script.hurtPickIds.map((id) => byId.get(id)).filter((p): p is Pick => !!p);
  const sample = picks.find((p) => p.gameId === script.gameId);
  const title = sample?.meta ? `${sample.meta.teamAbbr} vs ${sample.meta.opponentAbbr}` : "This game";

  return (
    <section className="surface p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-semibold tracking-tight">Expected game script · {title}</h3>
        <span className="shrink-0 text-xs text-muted-foreground">{labelForScriptConfidence(script.confidence)}</span>
      </div>

      <ol className="relative mb-5 flex flex-col gap-3 border-l border-border pl-5">
        {script.beats.map((beat, i) => (
          <li key={beat} className="relative text-sm leading-relaxed text-foreground/85">
            <span className="absolute -left-[27px] top-0.5 flex size-3.5 items-center justify-center rounded-full border border-border-strong bg-background text-[9px] font-semibold text-muted-foreground tabular">
              {i + 1}
            </span>
            {beat}
          </li>
        ))}
      </ol>

      {script.breaker && (
        <div className="mb-4 flex gap-2.5 rounded-2xl border border-caution/25 bg-caution/[0.06] p-3.5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-caution">What breaks it</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/85">{script.breaker}</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <ScriptList title="Helped by this script" icon={<TrendingUp className="size-3.5" aria-hidden="true" />} tone="text-positive" picks={helped} empty="None of your legs lean on this script." />
        <ScriptList title="Hurt by this script" icon={<TrendingDown className="size-3.5" aria-hidden="true" />} tone="text-negative" picks={hurt} empty="No legs work against it." />
      </div>
    </section>
  );
}

function ScriptList({ title, icon, tone, picks, empty }: { title: string; icon: React.ReactNode; tone: string; picks: Pick[]; empty: string }) {
  return (
    <div className="rounded-2xl bg-surface-sunken p-3.5">
      <h4 className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${tone}`}>
        {icon}
        {title}
      </h4>
      {picks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          {picks.map((p) => (
            <li key={p.id}>
              <span className="font-medium">{p.playerName}</span> <span className="text-muted-foreground">{describePick(p)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
