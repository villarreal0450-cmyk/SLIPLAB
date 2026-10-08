"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleDashed, RotateCcw, SearchX, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MockDataBadge } from "@/components/data/MockDataBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { SkeletonList } from "@/components/feedback/SkeletonList";
import { Button } from "@/components/ui/button";
import { formatScore, labelForRisk, toneClasses, toneForTier } from "@/lib/analysis/presentation";
import { useBets } from "@/lib/bets/BetsProvider";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { markPlaced, returnFigure, settleLeg, updateDetails, SPORTSBOOKS } from "@/lib/bets/model";
import { betTitle, formatBetDate } from "@/lib/bets/presentation";
import { formatMoney, parseMoneyInput } from "@/lib/format/money";
import { formatOdds } from "@/lib/odds";
import { parseOddsInput } from "@/lib/parlay/marketMath";
import { useParlayDraft } from "@/lib/parlay/store";
import type { SavedBet } from "@/lib/types";
import { BetStatusBadge } from "./BetStatusBadge";
import { LegResultRow } from "./LegResultRow";

export function BetDetailView({ betId, justSaved = false }: { betId: string; justSaved?: boolean }) {
  const { status, bets, saveBet, removeBet } = useBets();
  const router = useRouter();
  const { setPicks, clear } = useParlayDraft();
  const hydrated = useHydrated();

  // Arriving from "Save bet": the slip now lives here, so start the next one fresh.
  useEffect(() => {
    if (justSaved) clear();
  }, [justSaved, clear]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!hydrated || status === "loading") return <SkeletonList rows={3} rowClassName="h-[120px]" />;
  const bet = bets.find((b) => b.id === betId);
  if (!bet) {
    return (
      <EmptyState
        icon={<SearchX />}
        title="Bet not found"
        description="It may have been deleted, or it was saved on another device."
        action={
          <Button asChild variant="secondary">
            <Link href="/bets">Back to My Bets</Link>
          </Button>
        }
      />
    );
  }

  const persist = async (next: SavedBet) => {
    setSaveError(null);
    try {
      await saveBet(next);
    } catch {
      setSaveError("That change didn't save. Try again.");
    }
  };

  const ret = returnFigure(bet);
  const tone = bet.analysis ? toneForTier(bet.analysis.tier) : null;

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
      <div className="flex flex-col gap-5">
        {justSaved && (
          <p role="status" className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-positive" aria-hidden="true" />
            Saved to My Bets. Your slip is cleared for the next one.
          </p>
        )}
        <section className="surface flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <BetStatusBadge status={bet.status} />
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{betTitle(bet.legs.length)}</h2>
              <p className="text-sm text-muted-foreground">
                Saved {formatBetDate(bet.createdAt)}
                {bet.sportsbook && ` · ${bet.sportsbook}`}
                {bet.settledAt && ` · settled ${formatBetDate(bet.settledAt)}`}
              </p>
            </div>
            <p className="text-2xl font-semibold tracking-tight tabular">{formatOdds(bet.odds)}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-sunken p-3 text-center tabular sm:grid-cols-3">
            <div>
              <dt className="text-[11px] text-muted-foreground">Stake</dt>
              <dd className="font-semibold">{formatMoney(bet.stake)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">{ret.label}</dt>
              <dd className="font-semibold">{formatMoney(ret.amount)}</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-[11px] text-muted-foreground">Analyst score then</dt>
              <dd className={`font-semibold ${tone ? toneClasses[tone].text : ""}`}>{bet.analysis ? `${formatScore(bet.analysis.score)}/10` : "—"}</dd>
            </div>
          </dl>

          {bet.status === "draft" && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CircleDashed className="size-4" aria-hidden="true" />
                Saved as a draft. Not placed yet.
              </p>
              <Button size="sm" className="rounded-xl" onClick={() => persist(markPlaced(bet))}>
                Mark as placed
              </Button>
            </div>
          )}
        </section>

        <section aria-labelledby="legs-heading" className="surface p-4 sm:p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="legs-heading" className="font-semibold tracking-tight">
              Legs
            </h2>
            <p className="text-xs text-muted-foreground">Results are entered by hand for now.</p>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {bet.legs.map((leg) => (
              <LegResultRow
                key={leg.id}
                leg={leg}
                isWeakest={bet.analysis?.weakestLegId === leg.id}
                editable={bet.status !== "draft"}
                onChange={(s, v) => persist(settleLeg(bet, leg.id, s, v))}
              />
            ))}
          </ul>
          {saveError && (
            <p role="alert" className="mt-3 text-sm text-negative">
              {saveError}
            </p>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-10">
        {bet.analysis && (
          <section aria-labelledby="snapshot-heading" className="surface p-4 sm:p-5">
            <h2 id="snapshot-heading" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What the analyst said
            </h2>
            <p className={`mt-2 font-semibold ${tone ? toneClasses[tone].text : ""}`}>{bet.analysis.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{bet.analysis.summary}</p>
            <p className="mt-3 text-xs text-muted-foreground tabular">
              Cohesion {bet.analysis.cohesion}/100 · {labelForRisk(bet.analysis.riskLevel)} risk · {formatBetDate(bet.analysis.analyzedAt)}
            </p>
            {bet.analysis.isMockData && (
              <div className="mt-3">
                <MockDataBadge source={{ provider: "", isMock: true, asOf: "" }} />
              </div>
            )}
          </section>
        )}

        <BetDetailsEditor bet={bet} onSave={persist} />

        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            className="h-11 rounded-2xl"
            onClick={() => {
              setPicks(bet.legs.map((l) => l.pick));
              router.push("/analyze");
            }}
          >
            <RotateCcw data-icon="inline-start" />
            Analyze again
          </Button>
          <Button
            variant="ghost"
            className="h-11 rounded-2xl text-muted-foreground"
            onClick={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              try {
                await removeBet(bet.id);
                router.push("/bets");
              } catch {
                setConfirmDelete(false);
                setSaveError("Couldn't delete the bet. Try again.");
              }
            }}
          >
            <Trash2 data-icon="inline-start" />
            {confirmDelete ? "Tap again to delete" : "Delete bet"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BetDetailsEditor({ bet, onSave }: { bet: SavedBet; onSave: (b: SavedBet) => void }) {
  const [stake, setStake] = useState(bet.stake === null ? "" : String(bet.stake));
  const [odds, setOdds] = useState(bet.odds === null ? "" : formatOdds(bet.odds));
  const [book, setBook] = useState(bet.sportsbook ?? "");
  const [notes, setNotes] = useState(bet.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const parsedStake = parseMoneyInput(stake);
  const parsedOdds = parseOddsInput(odds);
  const dirty =
    (parsedStake === undefined ? true : parsedStake !== bet.stake) ||
    (parsedOdds === null ? true : (parsedOdds ?? null) !== bet.odds) ||
    (book || null) !== bet.sportsbook ||
    (notes.trim() || null) !== bet.notes;

  return (
    <section aria-labelledby="details-heading" className="surface flex flex-col gap-3 p-4 sm:p-5">
      <h2 id="details-heading" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Details
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Stake ($)
          <input value={stake} onChange={(e) => setStake(e.target.value)} inputMode="decimal" className="h-10 rounded-xl border border-input bg-surface-sunken px-3 text-sm text-foreground outline-none tabular focus-visible:border-ring" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Odds
          <input value={odds} onChange={(e) => setOdds(e.target.value.replace(/[^\d+-]/g, ""))} inputMode="numeric" className="h-10 rounded-xl border border-input bg-surface-sunken px-3 text-sm text-foreground outline-none tabular focus-visible:border-ring" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Sportsbook
        <select value={book} onChange={(e) => setBook(e.target.value)} className="h-10 rounded-xl border border-input bg-surface-sunken px-2 text-sm text-foreground outline-none focus-visible:border-ring">
          <option value="">—</option>
          {SPORTSBOOKS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} className="resize-none rounded-xl border border-input bg-surface-sunken px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring" />
      </label>
      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}
      <Button
        variant="secondary"
        disabled={!dirty}
        className="rounded-xl"
        onClick={() => {
          if (parsedStake === undefined) return setError("Stake should be an amount like 25 or 25.50.");
          if (parsedOdds === null) return setError("Odds should look like +535 or -110.");
          setError(null);
          onSave(updateDetails(bet, { stake: parsedStake, odds: parsedOdds ?? null, sportsbook: book || null, notes: notes.trim() || null }));
        }}
      >
        Save details
      </Button>
    </section>
  );
}
