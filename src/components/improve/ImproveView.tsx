"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { MockDataBadge } from "@/components/data/MockDataBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSuggestions } from "@/lib/analysis/client";
import type { ImproveResult } from "@/lib/analysis/results";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useParlayDraft } from "@/lib/parlay/store";
import type { ParlaySuggestion, Pick } from "@/lib/types";
import { CurrentSlipCard } from "./CurrentSlipCard";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { SuggestionCard } from "./SuggestionCard";

type Settled = { forPicks: Pick[]; result: ImproveResult };
type Profile = ParlaySuggestion["profile"];

export function ImproveView() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { picks, setPicks } = useParlayDraft();
  const [settled, setSettled] = useState<Settled | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [chosen, setChosen] = useState<Profile | null>(null);

  useEffect(() => {
    if (!hydrated || picks.length === 0) return;
    const controller = new AbortController();
    fetchSuggestions(picks, controller.signal)
      .then((result) => setSettled({ forPicks: picks, result }))
      .catch(() => {});
    return () => controller.abort();
  }, [hydrated, picks, attempt]);

  if (!hydrated) return <ImproveSkeleton />;

  if (picks.length === 0) {
    return (
      <EmptyState
        icon={<Ticket />}
        title="Nothing to improve yet"
        description="Build a slip first, then come back for safer, balanced and more aggressive versions."
        action={
          <Button asChild>
            <Link href="/build">Build a parlay</Link>
          </Button>
        }
      />
    );
  }

  const result = settled?.forPicks === picks ? settled.result : null;
  if (!result) return <ImproveSkeleton />;
  if (!result.ok) {
    return (
      <ErrorState
        title="Suggestions didn't load"
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

  const recommended = result.suggestions.find((s) => s.recommended)?.profile ?? null;
  const profile = chosen ?? recommended ?? "balanced";
  const suggestion = result.suggestions.find((s) => s.profile === profile)!;
  const flagged = result.suggestions
    .flatMap((s) => s.changes)
    .filter((c) => c.type === "remove" || c.type === "replace")
    .map((c) => c.before!.id);

  return (
    <div className="flex flex-col gap-5">
      <ProfileSwitcher value={profile} onChange={setChosen} recommended={recommended} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div key={profile} className="animate-fade-up">
          <SuggestionCard
            suggestion={suggestion}
            current={result.current}
            onUse={() => {
              setPicks(suggestion.picks);
              router.push("/analyze");
            }}
          />
        </div>
        <div className="flex flex-col gap-3 lg:sticky lg:top-10">
          <CurrentSlipCard picks={picks} current={result.current} flagged={flagged} />
          <div className="flex flex-wrap items-center gap-2 text-xs leading-relaxed text-muted-foreground">
            <MockDataBadge source={result.dataSource} />
            <span>Suggestions only use lines and prices the market lists. They never guarantee a result.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImproveSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Building suggestions">
      <Skeleton className="h-12 w-full rounded-2xl bg-surface" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-[420px] rounded-2xl bg-surface" />
        <Skeleton className="h-[260px] rounded-2xl bg-surface" />
      </div>
    </div>
  );
}
