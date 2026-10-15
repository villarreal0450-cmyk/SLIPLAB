"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Info, Sparkles } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerAvatar } from "@/components/games/PlayerAvatar";
import { fetchGamePicks } from "@/lib/analysis/client";
import { formatScore, labelForRisk, toneClasses, toneForCohesion, toneForRisk, toneForTier } from "@/lib/analysis/presentation";
import type { GamePicksResult } from "@/lib/analysis/results";
import type { GamePickLeg } from "@/lib/analysis/suggestions/gamePicks";
import { formatOdds } from "@/lib/odds";
import { describePick } from "@/lib/parlay/format";
import { useParlayDraft } from "@/lib/parlay/store";

type State = { kind: "idle" } | { kind: "loading" } | { kind: "done"; result: GamePicksResult };

/**
 * "What would you bet here?" On request, the analyst grades every line in
 * this game and builds the parlay it would actually play, or says it would
 * pass. Loaded on demand so the game page itself stays fast.
 */
export function GamePicksCard({ gameId }: { gameId: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const controller = useRef<AbortController | null>(null);

  const load = async () => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setState({ kind: "loading" });
    try {
      const result = await fetchGamePicks(gameId, ac.signal);
      if (!ac.signal.aborted) setState({ kind: "done", result });
    } catch {
      // Aborted by a newer request; that request owns the state.
    }
  };

  if (state.kind === "idle") {
    return (
      <section className="surface-brand flex items-center gap-4 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand">
          <Sparkles className="size-6" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold tracking-tight">Analyst&apos;s picks</h2>
          <p className="text-sm text-muted-foreground">The parlay the analyst would play in this game.</p>
        </div>
        <Button onClick={load} className="h-10 shrink-0 rounded-xl px-4 font-semibold">
          Show me
        </Button>
      </section>
    );
  }

  if (state.kind === "loading") {
    return (
      <section className="surface flex flex-col gap-4 p-4" aria-busy="true" aria-live="polite">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 animate-pulse text-brand" aria-hidden="true" />
          Grading every line in this game…
        </p>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-2xl bg-surface-sunken" />
        ))}
      </section>
    );
  }

  const { result } = state;
  if (!result.ok) {
    return (
      <section className="surface flex flex-col gap-3 p-4">
        <p className="text-sm text-muted-foreground">{result.error}</p>
        <Button variant="secondary" onClick={load} className="self-start rounded-xl">
          Try again
        </Button>
      </section>
    );
  }

  const picks = result.picks;
  const demo = result.dataSource.isMock;

  if (picks.status === "no_lines") {
    return (
      <section className="surface p-4">
        <CardTitle />
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{picks.reason}</p>
      </section>
    );
  }

  if (picks.status === "single_only") {
    return (
      <section className="surface flex flex-col gap-4 p-4">
        <CardTitle />
        <p className="text-sm leading-relaxed text-foreground/85">{picks.reason}</p>
        {picks.bestSingle && (
          <>
            <ul className="divide-y divide-border">
              <LegRow leg={picks.bestSingle} />
            </ul>
            <AddButton legs={[picks.bestSingle]} label="Add this single" />
          </>
        )}
        <Footnote demo={demo} />
      </section>
    );
  }

  const p = picks.parlay;
  const tone = toneForTier(p.tier);
  return (
    <section aria-labelledby="game-picks-title" className="surface-brand flex flex-col gap-5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle id="game-picks-title" />
          <p className="text-sm text-muted-foreground">
            {p.legCount} picks · chosen from {picks.considered} graded lines
          </p>
        </div>
        {p.odds !== null && <p className="shrink-0 text-2xl font-semibold tracking-tight tabular">{formatOdds(p.odds)}</p>}
      </div>

      <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-sunken p-3 text-center">
        <div>
          <dt className="text-[11px] text-muted-foreground">Score</dt>
          <dd className={cn("font-semibold tabular", toneClasses[tone].text)}>{formatScore(p.score)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Cohesion</dt>
          <dd className={cn("font-semibold tabular", toneClasses[toneForCohesion(p.cohesion)].text)}>{p.cohesion}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Risk</dt>
          <dd className={cn("font-semibold", toneClasses[toneForRisk(p.riskLevel)].text)}>{labelForRisk(p.riskLevel)}</dd>
        </div>
      </dl>

      <ul className="divide-y divide-border">
        {picks.legs.map((leg) => (
          <LegRow key={leg.pick.id} leg={leg} />
        ))}
      </ul>

      {picks.story.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Why these fit together</h3>
          <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-foreground/85">
            {picks.story.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {picks.pricesMissing && (
        <p className="flex gap-2 rounded-2xl border border-border bg-surface-sunken p-3 text-sm leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          These lines came without prices, so the payout isn&apos;t shown. Check your book&apos;s odds before you bet.
        </p>
      )}

      <AddButton legs={picks.legs} label="Add these to my parlay" />
      <Footnote demo={demo} />
    </section>
  );
}

function CardTitle({ id }: { id?: string }) {
  return (
    <h2 id={id} className="flex items-center gap-1.5 text-lg font-semibold tracking-tight">
      <Sparkles className="size-4 text-brand" aria-hidden="true" />
      Analyst&apos;s picks
    </h2>
  );
}

function LegRow({ leg }: { leg: GamePickLeg }) {
  const tone = toneForTier(leg.tier);
  return (
    <li className="flex gap-3 py-3">
      <PlayerAvatar name={leg.pick.playerName} color={leg.pick.meta?.teamColor} imageUrl={leg.pick.meta?.headshotUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate font-semibold tracking-tight">{leg.pick.playerName}</p>
          <span className={cn("shrink-0 text-sm font-semibold tabular", toneClasses[tone].text)}>{formatScore(leg.score)}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {describePick(leg.pick)}
          {leg.pick.meta && <span className="text-muted-foreground/70"> · {leg.pick.meta.teamAbbr}</span>}
          {leg.pick.odds !== undefined && <span className="tabular"> · {formatOdds(leg.pick.odds)}</span>}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground/80">{leg.reason}</p>
      </div>
    </li>
  );
}

function AddButton({ legs, label }: { legs: GamePickLeg[]; label: string }) {
  const { upsertPick } = useParlayDraft();
  const [added, setAdded] = useState<"no" | "yes" | "full">("no");

  const add = () => {
    let full = false;
    for (const leg of legs) {
      if (upsertPick(leg.pick).error === "max_legs") full = true;
    }
    setAdded(full ? "full" : "yes");
  };

  if (added === "no") {
    return (
      <Button onClick={add} className="h-12 rounded-2xl text-base font-semibold">
        {label}
      </Button>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-sunken p-3 text-sm">
      <span className="flex items-center gap-2">
        <Check className="size-4 text-brand" aria-hidden="true" />
        {added === "full" ? "Your slip is full, so some legs weren't added." : "Added to your parlay."}
      </span>
      <Link href="/analyze" className="font-semibold text-brand hover:underline">
        Review it
      </Link>
    </div>
  );
}

function Footnote({ demo }: { demo: boolean }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {demo ? "Demo data, not live lines. " : ""}Graded by the analysis engine from stats, matchups and lines. It&apos;s a read, not a guarantee. Bet only what you can afford to lose.
    </p>
  );
}
