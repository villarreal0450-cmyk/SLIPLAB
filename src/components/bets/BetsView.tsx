"use client";

import Link from "next/link";
import { Ticket } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { SkeletonList } from "@/components/feedback/SkeletonList";
import { Button } from "@/components/ui/button";
import { useBets } from "@/lib/bets/BetsProvider";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { isSettled } from "@/lib/bets/model";
import { BetCard } from "./BetCard";

type Filter = "open" | "settled" | "all";

export function BetsView() {
  const { status, bets, error, reload } = useBets();
  const hydrated = useHydrated();
  const [chosen, setChosen] = useState<Filter | null>(null);

  // Bets come from the browser, so render the same skeleton as the server until hydrated.
  if (!hydrated || status === "loading") return <SkeletonList rows={3} rowClassName="h-[156px]" />;
  if (status === "error") {
    return (
      <ErrorState
        title="Couldn't load your bets"
        description={error ?? undefined}
        action={
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        }
      />
    );
  }
  if (bets.length === 0) {
    return (
      <EmptyState
        icon={<Ticket />}
        title="No saved bets yet"
        description="Analyze a slip, then save it here to track how it settles and what the analyst said beforehand."
        action={
          <Button asChild>
            <Link href="/build">Build a parlay</Link>
          </Button>
        }
      />
    );
  }

  const open = bets.filter((b) => !isSettled(b.status));
  const settled = bets.filter((b) => isSettled(b.status));
  const filter = chosen ?? (open.length ? "open" : "all");
  const list = filter === "open" ? open : filter === "settled" ? settled : bets;
  const won = settled.filter((b) => b.status === "won").length;
  const lost = settled.filter((b) => b.status === "lost").length;

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "open", label: "Open", count: open.length },
    { key: "settled", label: "Settled", count: settled.length },
    { key: "all", label: "All", count: bets.length },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter bets" className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={filter === t.key}
              onClick={() => setChosen(t.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                filter === t.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t.label} <span className="tabular opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
        {settled.length > 0 && (
          <p className="text-sm text-muted-foreground tabular">
            Record <span className="font-semibold text-foreground">{won}–{lost}</span>
            {settled.length - won - lost > 0 && <span> · {settled.length - won - lost} void</span>}
          </p>
        )}
      </div>

      {list.length === 0 ? (
        <p className="surface p-6 text-center text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((bet) => (
            <li key={bet.id} className="animate-fade-up">
              <BetCard bet={bet} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
