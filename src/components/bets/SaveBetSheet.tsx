"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBets } from "@/lib/bets/BetsProvider";
import { createSavedBet, potentialPayout, SPORTSBOOKS } from "@/lib/bets/model";
import { formatMoney, parseMoneyInput } from "@/lib/format/money";
import { formatOdds } from "@/lib/odds";
import { parseOddsInput } from "@/lib/parlay/marketMath";
import type { ParlayAnalysis, Pick } from "@/lib/types";

type SaveBetSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  picks: Pick[];
  analysis: ParlayAnalysis;
};

/** Save the analyzed slip to My Bets, optionally with stake, book and notes. */
export function SaveBetSheet({ open, onOpenChange, picks, analysis }: SaveBetSheetProps) {
  const router = useRouter();
  const { saveBet, storage } = useBets();
  const ids = { stake: useId(), odds: useId(), notes: useId() };
  const [placed, setPlaced] = useState(true);
  const [stakeInput, setStakeInput] = useState("");
  const [oddsInput, setOddsInput] = useState(analysis.combinedOdds !== null ? formatOdds(analysis.combinedOdds) : "");
  const [book, setBook] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stake = parseMoneyInput(stakeInput);
  const odds = parseOddsInput(oddsInput);
  const payout = potentialPayout(stake ?? null, odds ?? null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (stake === undefined) return setError("Stake should be an amount like 25 or 25.50.");
    if (odds === null) return setError("Odds should look like +535 or -110.");
    setSaving(true);
    setError(null);
    const bet = createSavedBet({
      picks,
      analysis,
      stake,
      odds: odds ?? null,
      sportsbook: book,
      notes: notes.trim() ? notes.trim().slice(0, 500) : null,
      placed,
    });
    try {
      await saveBet(bet);
      onOpenChange(false);
      // The bet page clears the slip once it has loaded (no flash of an empty analysis).
      router.push(`/bets/${bet.id}?saved=1`);
    } catch {
      setError("Couldn't save the bet. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-3xl border-border-strong px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-6 md:inset-x-auto! md:right-6! md:bottom-6! md:left-auto! md:w-[460px] md:rounded-3xl md:border"
      >
        <SheetHeader className="p-0 pb-5">
          <SheetTitle className="text-xl font-semibold tracking-tight">Save bet</SheetTitle>
          <SheetDescription>
            {picks.length} {picks.length === 1 ? "leg" : "legs"} · analyzed at {analysis.score.toFixed(1)}/10.{" "}
            {storage === "device" ? "Saved on this device." : "Saved to your account."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <div role="radiogroup" aria-label="Bet status" className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-sunken p-1">
            {[
              { value: true, label: "I placed it" },
              { value: false, label: "Save as draft" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={placed === o.value}
                onClick={() => setPlaced(o.value)}
                className={cn(
                  "rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  placed === o.value ? "bg-surface-elevated text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={ids.stake} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Stake <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <div className="flex h-11 items-center rounded-2xl border border-input bg-surface-sunken px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40">
                <span className="text-muted-foreground">$</span>
                <input
                  id={ids.stake}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={stakeInput}
                  onChange={(e) => {
                    setError(null);
                    setStakeInput(e.target.value);
                  }}
                  className="min-w-0 flex-1 bg-transparent pl-1 text-base outline-none tabular placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
            <div>
              <label htmlFor={ids.odds} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Odds
              </label>
              <input
                id={ids.odds}
                inputMode="numeric"
                placeholder="+535"
                value={oddsInput}
                onChange={(e) => {
                  setError(null);
                  setOddsInput(e.target.value.replace(/[^\d+-]/g, ""));
                }}
                className="h-11 w-full rounded-2xl border border-input bg-surface-sunken px-3 text-base outline-none tabular placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
              />
            </div>
          </div>

          <p className="-mt-2 text-sm text-muted-foreground tabular" aria-live="polite">
            {payout !== null ? (
              <>
                Returns <span className="font-semibold text-foreground">{formatMoney(payout)}</span> if every leg hits.
              </>
            ) : (
              "Add a stake to see the potential return."
            )}
          </p>

          <fieldset>
            <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sportsbook <span className="normal-case tracking-normal">(optional)</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {SPORTSBOOKS.map((b) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={book === b}
                  onClick={() => setBook((cur) => (cur === b ? null : b))}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-sm transition-colors",
                    book === b ? "border-brand/50 bg-brand/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor={ids.notes} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Notes <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id={ids.notes}
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why you like it, what would change your mind…"
              className="w-full resize-none rounded-2xl border border-input bg-surface-sunken px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </div>

          {error && (
            <p role="alert" className="-mt-2 text-sm text-negative">
              {error}
            </p>
          )}

          <Button type="submit" disabled={saving} className="h-12 rounded-2xl text-base font-semibold">
            {saving ? "Saving…" : "Save bet"}
          </Button>
          <p className="-mt-2 text-center text-xs text-muted-foreground">Only stake what you&apos;re comfortable losing.</p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
