"use client";

import Link from "next/link";
import { Pencil, Sparkles, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { MockDataBadge } from "@/components/data/MockDataBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchParlayAnalysis } from "@/lib/analysis/client";
import type { AnalyzeResult } from "@/lib/analysis/results";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useParlayDraft } from "@/lib/parlay/store";
import type { Pick } from "@/lib/types";
import { AnalysisSkeleton } from "./AnalysisSkeleton";
import { CohesionPanel } from "./CohesionPanel";
import { GameScriptCard } from "./GameScriptCard";
import { LegAlternativesSheet, type AlternativesRequest } from "./LegAlternativesSheet";
import { ParlayScoreCard } from "./ParlayScoreCard";
import { PickCard } from "./PickCard";
import { WeakestLegCard } from "./WeakestLegCard";

type Settled = { forPicks: Pick[]; result: AnalyzeResult };
type Tab = "picks" | "script" | "cohesion";

/**
 * Analysis screen. Reads the draft slip, runs the engine on the server and
 * re-runs whenever the slip changes. The last result stays on screen (dimmed)
 * while a new one loads so removing a leg doesn't flash a skeleton.
 */
export function ParlayAnalysisView() {
  const hydrated = useHydrated();
  const { picks, removePick } = useParlayDraft();
  const [settled, setSettled] = useState<Settled | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab>("picks");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativesRequest | null>(null);

  useEffect(() => {
    if (!hydrated || picks.length === 0) return;
    const controller = new AbortController();
    fetchParlayAnalysis(picks, controller.signal)
      .then((result) => setSettled({ forPicks: picks, result }))
      .catch(() => {
        // Aborted because the slip changed or the page unmounted; a newer request owns the UI.
      });
    return () => controller.abort();
  }, [hydrated, picks, attempt]);

  if (!hydrated) return <AnalysisSkeleton />;

  if (picks.length === 0) {
    return (
      <EmptyState
        icon={<Ticket />}
        title="Nothing to analyze yet"
        description="Add a few picks from a game and the analyst will grade each leg and the parlay as a whole."
        action={
          <Button asChild>
            <Link href="/build">Build a parlay</Link>
          </Button>
        }
      />
    );
  }

  const isStale = settled?.forPicks !== picks;
  const result = settled?.result;

  if (!result) return <AnalysisSkeleton />;

  if (!result.ok) {
    if (isStale) return <AnalysisSkeleton />;
    return (
      <ErrorState
        title="Analysis didn't finish"
        description={result.error}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setSettled(null);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
            {result.pickId && (
              <Button variant="ghost" onClick={() => removePick(result.pickId!)}>
                Remove that pick
              </Button>
            )}
          </div>
        }
      />
    );
  }

  const { analysis } = result;
  // Only render picks the analysis covers; a just-removed pick disappears immediately.
  const pickById = new Map(picks.map((p) => [p.id, p]));
  const rows = analysis.picks.flatMap((a) => {
    const pick = pickById.get(a.pickId);
    return pick ? [{ pick, analysis: a }] : [];
  });
  const helped = new Set(analysis.gameScripts.flatMap((s) => s.helpedPickIds));
  const hurt = new Set(analysis.gameScripts.flatMap((s) => s.hurtPickIds));
  const weakestPick = analysis.weakestLeg ? pickById.get(analysis.weakestLeg.pickId) : undefined;
  const weakestAnalysis = analysis.picks.find((p) => p.pickId === analysis.weakestLeg?.pickId);

  const showWhy = (pickId: string) => {
    setTab("picks");
    setExpandedId(pickId);
    requestAnimationFrame(() => document.getElementById(`pick-${pickId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div
      className={`flex flex-col gap-6 transition-opacity duration-200 lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start ${isStale ? "pointer-events-none opacity-60" : ""}`}
      aria-busy={isStale}
    >
      <div className="flex flex-col gap-3 lg:sticky lg:top-10">
        <ParlayScoreCard analysis={analysis} />
        {analysis.weakestLeg && weakestPick && weakestAnalysis && (
          <WeakestLegCard
            weakest={analysis.weakestLeg}
            pick={weakestPick}
            analysis={weakestAnalysis}
            onWhy={() => showWhy(weakestPick.id)}
            onRemove={() => removePick(weakestPick.id)}
            onReplace={() => setAlternatives({ pick: weakestPick, mode: "replace", parlayScore: analysis.score })}
            onMakeSafer={() => setAlternatives({ pick: weakestPick, mode: "safer", parlayScore: analysis.score })}
          />
        )}
        <div className="hidden flex-col gap-3 lg:flex">
          <AnalysisFooter isMock={analysis.dataSource.isMock} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-4">
        <TabsList variant="line" className="w-full justify-start gap-4 border-b border-border px-0">
          <TabsTrigger value="picks" className="flex-none px-0 pb-2.5">
            Picks ({rows.length})
          </TabsTrigger>
          <TabsTrigger value="script" className="flex-none px-0 pb-2.5">
            Game script
          </TabsTrigger>
          <TabsTrigger value="cohesion" className="flex-none px-0 pb-2.5">
            Cohesion
          </TabsTrigger>
        </TabsList>

        <TabsContent value="picks" className="flex flex-col gap-2.5">
          {rows.map(({ pick, analysis: a }, i) => (
            <PickCard
              key={pick.id}
              index={i + 1}
              pick={pick}
              analysis={a}
              expanded={expandedId === pick.id}
              onToggle={() => setExpandedId((cur) => (cur === pick.id ? null : pick.id))}
              scriptEffect={helped.has(pick.id) ? "helped" : hurt.has(pick.id) ? "hurt" : null}
              isWeakest={analysis.weakestLeg?.pickId === pick.id}
            />
          ))}
        </TabsContent>

        <TabsContent value="script" className="flex flex-col gap-3">
          {analysis.gameScripts.length === 0 ? (
            <p className="surface p-5 text-sm text-muted-foreground">Not enough game context to project a script.</p>
          ) : (
            analysis.gameScripts.map((s) => <GameScriptCard key={s.gameId} script={s} picks={picks} />)
          )}
          {analysis.gameScripts.length > 1 && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              This slip spans {analysis.gameScripts.length} games. Each one is a separate story the parlay has to get right.
            </p>
          )}
        </TabsContent>

        <TabsContent value="cohesion">
          <CohesionPanel cohesion={analysis.cohesion} picks={picks} />
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-3 lg:hidden">
        <AnalysisFooter isMock={analysis.dataSource.isMock} />
      </div>

      <LegAlternativesSheet request={alternatives} onClose={() => setAlternatives(null)} />
    </div>
  );
}

function AnalysisFooter({ isMock }: { isMock: boolean }) {
  return (
    <>
      <Button asChild className="h-12 rounded-2xl bg-foreground text-base font-semibold text-background hover:bg-foreground/90">
        <Link href="/analyze/improve">
          <Sparkles data-icon="inline-start" />
          Improve my parlay
        </Link>
      </Button>
      <Button asChild variant="secondary" className="h-12 rounded-2xl text-base">
        <Link href="/build">
          <Pencil data-icon="inline-start" />
          Edit picks
        </Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2 text-xs leading-relaxed text-muted-foreground">
        <MockDataBadge source={{ provider: "", isMock, asOf: "" }} />
        <span>Scores reflect analyst confidence in each pick&apos;s quality, not a chance of winning.</span>
      </div>
    </>
  );
}
