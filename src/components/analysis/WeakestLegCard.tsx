"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatScore } from "@/lib/analysis/presentation";
import { describePick } from "@/lib/parlay/format";
import type { Pick, PickAnalysis, WeakestLeg } from "@/lib/types";

type WeakestLegCardProps = {
  weakest: WeakestLeg;
  pick: Pick;
  analysis: PickAnalysis;
  onWhy: () => void;
  onRemove: () => void;
};

export function WeakestLegCard({ weakest, pick, analysis, onWhy, onRemove }: WeakestLegCardProps) {
  return (
    <section aria-labelledby="weakest-heading" className="rounded-2xl border border-negative/25 bg-negative/[0.06] p-4">
      <h2 id="weakest-heading" className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-negative">
        <CircleAlert className="size-3.5" aria-hidden="true" />
        Weakest leg
      </h2>
      <p className="font-semibold tracking-tight">
        {pick.playerName} <span className="font-normal text-muted-foreground">· {describePick(pick)}</span>
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {weakest.reason} <span className="tabular">Scores {formatScore(analysis.score)}/10.</span>
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" className="rounded-xl" onClick={onWhy}>
          Why?
        </Button>
        <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={onRemove}>
          Remove this leg
        </Button>
      </div>
    </section>
  );
}
