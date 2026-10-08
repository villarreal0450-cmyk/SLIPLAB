import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatScore } from "@/lib/analysis/presentation";
import { formatOdds } from "@/lib/odds";
import type { Pick, ProjectedOutcome } from "@/lib/types";
import { SlipLegs } from "./SlipLegs";

export function CurrentSlipCard({ picks, current, flagged }: { picks: Pick[]; current: ProjectedOutcome; flagged: string[] }) {
  return (
    <section aria-labelledby="current-title" className="surface flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="current-title" className="text-lg font-semibold tracking-tight">
            Current parlay
          </h2>
          <p className="text-sm text-muted-foreground tabular">
            {picks.length} {picks.length === 1 ? "pick" : "picks"} · scores {formatScore(current.score)}
          </p>
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular">{formatOdds(current.odds)}</p>
      </div>
      <SlipLegs picks={picks} flagged={flagged} />
      <Button asChild variant="secondary" className="h-12 rounded-2xl text-base">
        <Link href="/analyze">Keep current</Link>
      </Button>
    </section>
  );
}
