"use client";

import { useId, useState } from "react";
import { cn } from "cn";
import { PlayerAvatar } from "@/components/games/PlayerAvatar";
import { formatScore, toneClasses, toneForTier } from "@/lib/analysis/presentation";
import { legStatusLabel } from "@/lib/bets/presentation";
import { describePick } from "@/lib/parlay/format";
import { MARKETS, tierForScore, type LegStatus, type SavedLeg } from "@/lib/types";

const OPTIONS: LegStatus[] = ["pending", "won", "lost", "void"];
const ACTIVE: Record<LegStatus, string> = {
  pending: "bg-surface-elevated text-foreground",
  won: "bg-positive/15 text-positive",
  lost: "bg-negative/15 text-negative",
  void: "bg-surface-elevated text-foreground",
};

type LegResultRowProps = {
  leg: SavedLeg;
  isWeakest: boolean;
  /** Results can only be entered once the bet is placed. */
  editable: boolean;
  onChange: (status: LegStatus, resultValue: number | null) => void;
};

/** One leg with manual result entry (automated settlement comes with live data). */
export function LegResultRow({ leg, isWeakest, editable, onChange }: LegResultRowProps) {
  const id = useId();
  const def = MARKETS[leg.pick.market];
  const [valueInput, setValueInput] = useState(leg.resultValue === null ? "" : String(leg.resultValue));
  const scoreTone = leg.analysisScore !== null ? toneForTier(tierForScore(leg.analysisScore)) : null;

  const commitValue = () => {
    const trimmed = valueInput.trim();
    const n = trimmed === "" ? null : Number(trimmed);
    if (n !== null && (!Number.isFinite(n) || n < 0)) return setValueInput(leg.resultValue === null ? "" : String(leg.resultValue));
    if (n !== leg.resultValue) onChange(leg.status, n);
  };

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <PlayerAvatar name={leg.pick.playerName} color={leg.pick.meta?.teamColor} imageUrl={leg.pick.meta?.headshotUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold tracking-tight">{leg.pick.playerName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {describePick(leg.pick)}
            {isWeakest && <span className="font-medium text-negative"> · flagged weakest</span>}
          </p>
        </div>
        {leg.analysisScore !== null && scoreTone && (
          <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold tabular", toneClasses[scoreTone].soft, toneClasses[scoreTone].text)}>
            {formatScore(leg.analysisScore)}
          </span>
        )}
      </div>

      {editable ? (
        <div className="flex flex-wrap items-center gap-2 pl-12">
          <div role="radiogroup" aria-label={`Result for ${leg.pick.playerName}`} className="grid grid-cols-4 gap-0.5 rounded-xl bg-surface-sunken p-0.5">
            {OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={leg.status === s}
                onClick={() => s !== leg.status && onChange(s, leg.resultValue)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  leg.status === s ? ACTIVE[s] : "text-muted-foreground hover:text-foreground",
                )}
              >
                {legStatusLabel[s]}
              </button>
            ))}
          </div>
          {def.kind === "over_under" && leg.status !== "pending" && leg.status !== "void" && (
            <div className="flex items-center gap-1.5">
              <label htmlFor={id} className="text-xs text-muted-foreground">
                Final
              </label>
              <input
                id={id}
                inputMode="decimal"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value.replace(/[^\d.]/g, ""))}
                onBlur={commitValue}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                placeholder={def.unit}
                className="h-8 w-20 rounded-lg border border-input bg-surface-sunken px-2 text-sm outline-none tabular focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
          )}
        </div>
      ) : (
        <p className="pl-12 text-xs text-muted-foreground">Mark the bet as placed to enter results.</p>
      )}
    </li>
  );
}
