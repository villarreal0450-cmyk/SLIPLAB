"use client";

import { Activity, BarChart3, CalendarRange, ChevronDown, CloudSun, HeartPulse, Scale, Swords, Target, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import type { FactorResult } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  recent_form: BarChart3,
  season_baseline: CalendarRange,
  matchup: Swords,
  opportunity: Target,
  line_value: Scale,
  injuries: HeartPulse,
  market_volatility: Activity,
  game_environment: CloudSun,
};

const tile: Record<FactorResult["impact"], string> = {
  positive: "bg-positive/12 text-positive",
  neutral: "bg-muted text-muted-foreground",
  negative: "bg-negative/12 text-negative",
};

const impactText: Record<FactorResult["impact"], string> = { positive: "Helps", neutral: "Neutral", negative: "Hurts" };

/** The factors that moved the score most, with the rest one tap away. */
export function KeyFactors({ factors }: { factors: FactorResult[] }) {
  const [showAll, setShowAll] = useState(false);
  const ranked = [...factors].sort((a, b) => Math.abs(b.score - 0.5) * b.weight - Math.abs(a.score - 0.5) * a.weight);
  const visible = showAll ? ranked : ranked.slice(0, 4);

  return (
    <section aria-labelledby="key-factors" className="flex flex-col gap-3">
      <h2 id="key-factors" className="text-lg font-semibold tracking-tight">
        Key factors
      </h2>
      <ul className="flex flex-col gap-3.5">
        {visible.map((f) => {
          const Icon = ICONS[f.key] ?? Activity;
          return (
            <li key={f.key} className="flex gap-3">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tile[f.impact])}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-medium">
                  {f.label}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{impactText[f.impact]}</span>
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.explanation}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {ranked.length > 4 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {showAll ? "Show fewer" : `Show all ${ranked.length} factors`}
          <ChevronDown className={cn("size-4 transition-transform", showAll && "rotate-180")} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
