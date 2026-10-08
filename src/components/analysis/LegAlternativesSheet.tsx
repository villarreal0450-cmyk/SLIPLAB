"use client";

import { SearchX } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "cn";
import { PlayerAvatar } from "@/components/games/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchLegAlternatives } from "@/lib/analysis/client";
import { formatScore, toneClasses, toneForTier } from "@/lib/analysis/presentation";
import type { AlternativesResult } from "@/lib/analysis/results";
import { formatOdds } from "@/lib/odds";
import { describePick } from "@/lib/parlay/format";
import { useParlayDraft } from "@/lib/parlay/store";
import type { Pick } from "@/lib/types";

export type AlternativesRequest = { pick: Pick; mode: "safer" | "replace"; parlayScore: number };

const KIND_LABEL = { easier_line: "Easier line", other_market: "Steadier market", replacement: "Same game" } as const;

/** Options for one leg (Replace / Make safer), each scored inside the whole slip. */
export function LegAlternativesSheet({ request, onClose }: { request: AlternativesRequest | null; onClose: () => void }) {
  const { picks, swapPick, removePick } = useParlayDraft();
  const [state, setState] = useState<{ key: string; result: AlternativesResult } | null>(null);
  const key = request ? `${request.pick.id}:${request.mode}` : "";

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    fetchLegAlternatives(request.pick.id, request.mode, picks, controller.signal)
      .then((result) => setState({ key: `${request.pick.id}:${request.mode}`, result }))
      .catch(() => {});
    return () => controller.abort();
  }, [request, picks]);

  const result = state?.key === key ? state.result : null;
  const title = request?.mode === "safer" ? "Make it safer" : "Replace this leg";

  return (
    <Sheet open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-3xl border-border-strong px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-6 md:inset-x-auto! md:right-6! md:bottom-6! md:left-auto! md:w-[460px] md:rounded-3xl md:border"
      >
        {request && (
          <>
            <SheetHeader className="p-0 pb-4">
              <SheetTitle className="text-xl font-semibold tracking-tight">{title}</SheetTitle>
              <SheetDescription>
                {request.pick.playerName} · {describePick(request.pick)}. Each option is scored inside your whole slip (currently {formatScore(request.parlayScore)}).
              </SheetDescription>
            </SheetHeader>

            {!result ? (
              <div className="flex flex-col gap-2.5" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl bg-surface" />
                ))}
              </div>
            ) : !result.ok ? (
              <p role="alert" className="rounded-2xl bg-negative/10 p-4 text-sm text-negative">
                {result.error}
              </p>
            ) : result.options.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center">
                <SearchX className="size-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Nothing in this game&apos;s markets beats this leg. Removing it may be the cleanest fix.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    removePick(request.pick.id);
                    onClose();
                  }}
                >
                  Remove this leg
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {result.options.map((o) => {
                  const tone = toneForTier(o.tier);
                  const delta = Math.round((o.parlayAfter.score - request.parlayScore) * 10) / 10;
                  return (
                    <li key={o.pick.id} className="surface flex flex-col gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar name={o.pick.playerName} color={o.pick.meta?.teamColor} imageUrl={o.pick.meta?.headshotUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold tracking-tight">{o.pick.playerName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {describePick(o.pick)} · {formatOdds(o.pick.odds)}
                          </p>
                        </div>
                        <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold tabular", toneClasses[tone].soft, toneClasses[tone].text)}>
                          {formatScore(o.score)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{o.reason}</p>
                      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                        <div className="min-w-0 text-xs text-muted-foreground tabular">
                          <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 font-medium">{KIND_LABEL[o.kind]}</span>
                          <span className="whitespace-nowrap">
                            Slip {formatScore(request.parlayScore)} → <span className="font-semibold text-foreground">{formatScore(o.parlayAfter.score)}</span>
                            {delta !== 0 && ` (${delta > 0 ? "+" : ""}${delta.toFixed(1)})`}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 rounded-xl"
                          onClick={() => {
                            swapPick(request.pick.id, o.pick);
                            onClose();
                          }}
                        >
                          Use this
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
