"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, Info, Sparkles, Ticket } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { combineOdds, formatOdds } from "@/lib/odds";
import { LONG_PARLAY_THRESHOLD } from "@/lib/parlay/draft";
import { useParlayDraft } from "@/lib/parlay/store";
import { SlipLegRow } from "./SlipLegRow";

/** Routes that show the slip themselves, so the dock would be redundant. */
const HIDDEN_ON = ["/analyze", "/analyst"];

/**
 * Persistent access to the draft parlay while browsing. A compact bar above
 * the tab bar on mobile, a floating card on desktop; both open the full slip.
 */
export function ParlayDock() {
  const pathname = usePathname();
  const { picks, removePick, clear } = useParlayDraft();
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (picks.length === 0 || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const odds = combineOdds(picks.map((p) => p.odds));
  const legsLabel = `${picks.length} ${picks.length === 1 ? "leg" : "legs"}`;

  return (
    <>
      {/* Keeps page content clear of the fixed bar on mobile. */}
      <div aria-hidden="true" className="h-20 md:h-0" />

      <div className="fixed inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),0px)+4.25rem)] z-30 md:inset-x-auto md:bottom-6 md:right-8 md:w-[360px]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="surface-elevated flex w-full animate-fade-up items-center gap-3 p-2.5 pr-4 text-left backdrop-blur-xl transition-colors hover:bg-surface"
          aria-label={`Open your parlay, ${legsLabel}`}
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <Ticket className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold tracking-tight">Your parlay</span>
            <span className="block text-xs text-muted-foreground tabular">
              {legsLabel}
              {odds !== null && ` · ${formatOdds(odds)}`}
            </span>
          </span>
          <ChevronUp className="size-5 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirmClear(false);
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[88dvh] gap-0 rounded-t-3xl border-border-strong px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-6 md:inset-x-auto! md:right-6! md:bottom-6! md:left-auto! md:w-[440px] md:rounded-3xl md:border"
        >
          <SheetHeader className="p-0 pb-2">
            <SheetTitle className="text-xl font-semibold tracking-tight">Your parlay</SheetTitle>
            <SheetDescription>
              {legsLabel}
              {odds !== null ? ` · ${formatOdds(odds)}` : " · add odds to every leg to see the combined price"}
            </SheetDescription>
          </SheetHeader>

          <ul className="-mx-1 min-h-0 flex-1 divide-y divide-border overflow-y-auto px-1">
            {picks.map((pick) => (
              <SlipLegRow key={pick.id} pick={pick} onRemove={() => removePick(pick.id)} onNavigate={() => setOpen(false)} />
            ))}
          </ul>

          {picks.length > LONG_PARLAY_THRESHOLD && (
            <p className="mt-3 flex gap-2 rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Every extra leg multiplies the variance. Long parlays rarely grade well, even when each pick looks solid on its own.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <Button asChild className="h-12 rounded-2xl text-base font-semibold">
              <Link href="/analyze" onClick={() => setOpen(false)}>
                <Sparkles data-icon="inline-start" />
                Analyze parlay
              </Link>
            </Button>
            <div className="flex gap-2">
              <Button asChild variant="secondary" className="h-11 flex-1 rounded-2xl">
                <Link href="/build" onClick={() => setOpen(false)}>
                  Add more picks
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="h-11 flex-1 rounded-2xl text-muted-foreground"
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    return;
                  }
                  clear();
                  setOpen(false);
                  setConfirmClear(false);
                }}
              >
                {confirmClear ? "Tap again to clear" : "Clear slip"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
