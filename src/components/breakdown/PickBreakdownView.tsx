"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gavel, SearchX, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { CaseList } from "@/components/analysis/CaseList";
import { MockDataBadge } from "@/components/data/MockDataBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analystCall, toneClasses, toneForTier } from "@/lib/analysis/presentation";
import { fetchPickBreakdown } from "@/lib/analysis/client";
import type { BreakdownResult } from "@/lib/analysis/results";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useParlayDraft } from "@/lib/parlay/store";
import type { Pick } from "@/lib/types";
import { BreakdownHeader } from "./BreakdownHeader";
import { KeyFactors } from "./KeyFactors";
import { MatchupPanel } from "./MatchupPanel";
import { NewsPanel } from "./NewsPanel";
import { ProjectionCard } from "./ProjectionCard";
import { RecentGamesCard } from "./RecentGamesCard";
import { ScriptAndCorrelations } from "./ScriptAndCorrelations";
import { SeasonSummary } from "./SeasonSummary";
import { StatsTable } from "./StatsTable";
import { VerdictCard } from "./VerdictCard";

type Settled = { forPicks: Pick[]; result: BreakdownResult };

export function PickBreakdownView({ pickId }: { pickId: string }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const { picks, removePick } = useParlayDraft();
  const [settled, setSettled] = useState<Settled | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inSlip = picks.some((p) => p.id === pickId);

  useEffect(() => {
    if (!hydrated || !inSlip) return;
    const controller = new AbortController();
    fetchPickBreakdown(pickId, picks, controller.signal)
      .then((result) => setSettled({ forPicks: picks, result }))
      .catch(() => {
        // Aborted: a newer request owns the UI.
      });
    return () => controller.abort();
  }, [hydrated, inSlip, pickId, picks, attempt]);

  if (!hydrated) return <BreakdownSkeleton />;

  if (!inSlip) {
    return (
      <EmptyState
        icon={<SearchX />}
        title="This pick isn't in your slip"
        description="It may have been removed or the slip was cleared."
        action={
          <Button asChild variant="secondary">
            <Link href="/analyze">Back to analysis</Link>
          </Button>
        }
      />
    );
  }

  const result = settled?.forPicks === picks ? settled.result : null;
  if (!result) return <BreakdownSkeleton />;
  if (!result.ok) {
    return (
      <ErrorState
        title="Breakdown didn't load"
        description={result.error}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setSettled(null);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  const b = result.breakdown;
  const tone = toneForTier(b.analysis.tier);

  return (
    <div className="flex flex-col gap-6">
      <BreakdownHeader breakdown={b} />

      <Tabs defaultValue="analysis" className="gap-5">
        <TabsList variant="line" className="w-full justify-start gap-5 border-b border-border px-0">
          {["analysis", "stats", "matchup", "news"].map((t) => (
            <TabsTrigger key={t} value={t} className="flex-none px-0 pb-2.5 capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="analysis" className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
          <div className="flex flex-col gap-5">
            <VerdictCard analysis={b.analysis} />
            <KeyFactors factors={b.analysis.factors} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <CaseList title="Bull case" icon={<ThumbsUp className="size-3.5" aria-hidden="true" />} tone="text-positive" items={b.analysis.bullCase.slice(0, 4)} empty="Nothing in the data argues strongly for this leg." />
              <CaseList title="Bear case" icon={<ThumbsDown className="size-3.5" aria-hidden="true" />} tone="text-negative" items={b.analysis.bearCase.slice(0, 4)} empty="No major red flags in the data." />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <ProjectionCard breakdown={b} />
            <RecentGamesCard breakdown={b} />
            <ScriptAndCorrelations breakdown={b} />
            <section aria-labelledby="final-verdict" className={`rounded-2xl border p-4 sm:p-5 ${toneClasses[tone].border} ${toneClasses[tone].soft}`}>
              <h2 id="final-verdict" className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${toneClasses[tone].text}`}>
                <Gavel className="size-3.5" aria-hidden="true" />
                Final verdict
              </h2>
              <p className="text-base font-medium leading-relaxed">{analystCall(b.analysis)}</p>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="flex flex-col gap-4 lg:max-w-2xl">
          <SeasonSummary breakdown={b} />
          <RecentGamesCard breakdown={b} />
          <StatsTable breakdown={b} />
        </TabsContent>

        <TabsContent value="matchup" className="lg:max-w-2xl">
          <MatchupPanel breakdown={b} />
        </TabsContent>

        <TabsContent value="news" className="lg:max-w-2xl">
          <NewsPanel breakdown={b} />
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <MockDataBadge source={b.dataSource} />
          <span>Scores reflect analyst confidence in the pick, not a chance of winning.</span>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href={`/games/${b.game.id}`}>Edit line</Link>
          </Button>
          <Button
            variant="ghost"
            className="rounded-xl text-muted-foreground"
            onClick={() => {
              removePick(pickId);
              router.push("/analyze");
            }}
          >
            Remove from slip
          </Button>
        </div>
      </div>
    </div>
  );
}

function BreakdownSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading pick breakdown">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-2xl bg-surface" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-48 bg-surface" />
          <Skeleton className="h-4 w-28 bg-surface" />
        </div>
      </div>
      <Skeleton className="h-9 w-full bg-surface" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-32 rounded-2xl bg-surface" />
        <Skeleton className="h-56 rounded-2xl bg-surface" />
      </div>
    </div>
  );
}
