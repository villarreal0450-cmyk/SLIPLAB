"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Info, ThumbsDown, ThumbsUp, TrendingDown, TrendingUp } from "lucide-react";
import { useId } from "react";
import { cn } from "cn";
import { PlayerAvatar } from "@/components/games/PlayerAvatar";
import { formatScore, labelForTier, toneClasses, toneForTier } from "@/lib/analysis/presentation";
import { formatOdds } from "@/lib/odds";
import { formatLine } from "@/lib/parlay/format";
import { MARKETS, type Pick, type PickAnalysis } from "@/lib/types";
import { CaseList } from "./CaseList";
import { FactorRow } from "./FactorRow";
import { QualityBar } from "./QualityBar";

type PickCardProps = {
  index: number;
  pick: Pick;
  analysis: PickAnalysis;
  expanded: boolean;
  onToggle: () => void;
  scriptEffect: "helped" | "hurt" | null;
  isWeakest: boolean;
};

export function PickCard({ index, pick, analysis, expanded, onToggle, scriptEffect, isWeakest }: PickCardProps) {
  const tone = toneForTier(analysis.tier);
  const def = MARKETS[pick.market];
  const panelId = useId();
  const lineText = formatLine(pick.market, pick.direction, pick.line);

  return (
    <article id={`pick-${pick.id}`} className={cn("surface scroll-mt-6 overflow-hidden transition-colors", expanded && "border-border-strong")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full flex-col gap-3 p-4 text-left outline-none focus-visible:bg-surface-elevated"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular text-muted-foreground">
            {index}
          </span>
          <PlayerAvatar name={pick.playerName} color={pick.meta?.teamColor} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold tracking-tight">{pick.playerName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {pick.meta ? `${pick.meta.teamAbbr} · ${pick.meta.position}` : def.label}
              {isWeakest && <span className="ml-1.5 font-medium text-negative">· Weakest leg</span>}
            </p>
          </div>
          <div className="max-w-[45%] shrink-0 text-right">
            <p className="truncate font-semibold tracking-tight tabular">{def.kind === "yes_no" ? (pick.direction === "no" ? `No ${def.shortLabel}` : def.shortLabel) : lineText}</p>
            <p className="truncate text-xs text-muted-foreground">{def.kind === "yes_no" ? (pick.odds !== undefined ? formatOdds(pick.odds) : "") : def.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-10">
          <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold tabular", toneClasses[tone].soft, toneClasses[tone].text)}>
            {formatScore(analysis.score)}
            <span className="font-normal opacity-70">/10</span>
          </span>
          <QualityBar value={analysis.score} tone={tone} className="flex-1" />
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")} aria-hidden="true" />
        </div>
      </button>

      <div id={panelId} className={cn("grid transition-[grid-template-rows] duration-300 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="min-h-0 overflow-hidden" inert={!expanded}>
          <div className="flex flex-col gap-5 border-t border-border px-4 pb-5 pt-4">
            <div>
              <p className={cn("text-sm font-semibold", toneClasses[tone].text)}>
                {analysis.verdict}
                {pick.odds !== undefined && def.kind !== "yes_no" && (
                  <span className="ml-2 font-normal text-muted-foreground tabular">at {formatOdds(pick.odds)}</span>
                )}
                <span className="sr-only"> ({labelForTier(analysis.tier)})</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/85">{analysis.summary}</p>
              {scriptEffect && (
                <p className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs", scriptEffect === "helped" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative")}>
                  {scriptEffect === "helped" ? <TrendingUp className="size-3" aria-hidden="true" /> : <TrendingDown className="size-3" aria-hidden="true" />}
                  {scriptEffect === "helped" ? "Helped by the expected game script" : "Hurt by the expected game script"}
                </p>
              )}
            </div>

            {analysis.projection && analysis.projection.line !== null && (
              <div className="flex items-center justify-between rounded-2xl bg-surface-sunken px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Your line</p>
                  <p className="text-lg font-semibold tabular">{analysis.projection.line}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Our projection</p>
                  <p className={cn("text-lg font-semibold tabular", projectionTone(pick, analysis.projection.value, analysis.projection.line))}>
                    {analysis.projection.value} <span className="text-sm font-normal text-muted-foreground">{def.unit}</span>
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <CaseList
                title="Bull case"
                icon={<ThumbsUp className="size-3.5" aria-hidden="true" />}
                tone="text-positive"
                items={analysis.bullCase.slice(0, 3)}
                empty="Nothing in the data argues strongly for this leg."
              />
              <CaseList
                title="Bear case"
                icon={<ThumbsDown className="size-3.5" aria-hidden="true" />}
                tone="text-negative"
                items={analysis.bearCase.slice(0, 3)}
                empty="No major red flags in the data. The main risk is ordinary variance."
              />
            </div>

            <details className="group/factors">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                All factors ({analysis.factors.length})
                <ChevronDown className="size-3.5 transition-transform group-open/factors:rotate-180" aria-hidden="true" />
              </summary>
              <ul className="mt-3 flex flex-col gap-3">
                {analysis.factors.map((f) => (
                  <FactorRow key={f.key} factor={f} />
                ))}
              </ul>
            </details>

            {analysis.missingData.length > 0 && (
              <p className="flex gap-2 rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Not enough data for {analysis.missingData.join(", ").toLowerCase()}. Those factors were left out of the score.
              </p>
            )}

            <Link
              href={`/analyze/${encodeURIComponent(pick.id)}`}
              className="flex items-center justify-between rounded-2xl bg-surface-sunken px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-elevated"
            >
              Full breakdown
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function projectionTone(pick: Pick, projection: number, line: number) {
  const favorable = pick.direction === "under" ? projection < line : projection >= line;
  return favorable ? "text-positive" : "text-caution";
}
