"use client";

import Link from "next/link";
import { BarChart3, FlaskConical, Lightbulb, X } from "lucide-react";
import { useMemo, useState } from "react";
import { MetricTile } from "@/components/analysis/MetricTile";
import { EmptyState } from "@/components/feedback/EmptyState";
import { SkeletonList } from "@/components/feedback/SkeletonList";
import { Button } from "@/components/ui/button";
import { useBets } from "@/lib/bets/BetsProvider";
import { REVIEW_LABEL } from "@/lib/bets/review";
import { formatMoney } from "@/lib/format/money";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { computeInsights, type Rate } from "@/lib/insights/compute";
import { sampleHistory } from "@/lib/insights/sample";
import type { ProcessReview } from "@/lib/types";
import { RateBars } from "./RateBars";

const pct = (r: Rate) => (r.rate === null ? "—" : `${Math.round(r.rate * 100)}%`);

const PROCESS_COPY: Record<ProcessReview, string> = {
  good_read: "Graded well and hit.",
  good_process_bad_result: "Graded well, missed anyway. Variance, not a mistake.",
  high_variance_result: "Decided by volatile markets or near misses.",
  bad_process: "Weak going in, whatever the result. The ones to cut.",
};

export function InsightsView() {
  const hydrated = useHydrated();
  const { status, bets } = useBets();
  const [preview, setPreview] = useState(false);
  const sample = useMemo(() => (preview ? sampleHistory() : null), [preview]);
  const source = sample ?? bets;
  const insights = useMemo(() => computeInsights(source), [source]);

  if (!hydrated || status === "loading") return <SkeletonList rows={3} rowClassName="h-[140px]" />;

  if (insights.totals.settled === 0 && !preview) {
    return (
      <EmptyState
        icon={<BarChart3 />}
        title="No settled bets yet"
        description="Insights appear once a few of your saved bets have results: hit rates by prop type and leg count, how the analyst's grades held up, and patterns worth knowing."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => setPreview(true)}>
              <FlaskConical data-icon="inline-start" />
              Preview with sample data
            </Button>
            <Button asChild variant="ghost">
              <Link href="/bets">Go to My Bets</Link>
            </Button>
          </div>
        }
      />
    );
  }

  const t = insights.totals;
  return (
    <div className="flex flex-col gap-6">
      {preview && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-caution/30 bg-caution/[0.06] p-3 text-sm">
          <p className="flex items-center gap-2">
            <FlaskConical className="size-4 shrink-0 text-caution" aria-hidden="true" />
            Sample data — a made-up history to show how Insights works. Not your bets.
          </p>
          <Button size="icon-sm" variant="ghost" onClick={() => setPreview(false)} aria-label="Close preview">
            <X />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MetricTile label={`Record · ${t.settled} settled`} value={`${t.won}–${t.lost}${t.void ? `–${t.void}` : ""}`} />
        <MetricTile label={`Bets won · of ${t.bets.total}`} value={pct(t.bets)} />
        <MetricTile label={`Legs hit · of ${t.legs.total}`} value={pct(t.legs)} />
        <MetricTile label="Avg legs per bet" value={t.avgLegs === null ? "—" : t.avgLegs.toFixed(1)} />
      </div>
      {t.stakedBets > 0 && (
        <p className="-mt-3 text-sm text-muted-foreground tabular">
          Staked {formatMoney(t.staked)} across {t.stakedBets} settled {t.stakedBets === 1 ? "bet" : "bets"}, returned {formatMoney(t.returned)} (
          {t.net >= 0 ? "+" : "−"}
          {formatMoney(Math.abs(t.net))}).
        </p>
      )}

      {insights.highlights.length > 0 && (
        <section aria-labelledby="highlights-heading" className="flex flex-col gap-2.5">
          <h2 id="highlights-heading" className="text-lg font-semibold tracking-tight">
            Patterns worth knowing
          </h2>
          <ul className="grid gap-2.5 md:grid-cols-2">
            {insights.highlights.map((h) => (
              <li key={h} className="surface flex gap-3 p-4 text-sm leading-relaxed">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
                {h}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="By prop type" subtitle="Leg hit rate">
          <RateBars groups={insights.byMarket} unit="legs" />
        </Panel>
        <Panel title="By number of legs" subtitle="Bets won">
          <RateBars groups={insights.byLegCount} unit="bets" />
        </Panel>
        <Panel title="How the analyst's grades held up" subtitle="Leg hit rate by grade at the time you saved">
          <RateBars groups={insights.byGrade} unit="legs" />
        </Panel>
        <Panel title="By risk level" subtitle="Bets won">
          <RateBars groups={insights.byRisk} unit="bets" />
        </Panel>
      </div>

      <Panel title="Process vs results" subtitle="Every settled leg, judged on how it graded before the game">
        <ul className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(PROCESS_COPY) as ProcessReview[]).map((k) => (
            <li key={k} className="flex items-start justify-between gap-3 rounded-2xl bg-surface-sunken p-3.5">
              <div>
                <p className="text-sm font-medium">{REVIEW_LABEL[k]}</p>
                <p className="text-xs text-muted-foreground">{PROCESS_COPY[k]}</p>
              </div>
              <span className="text-xl font-semibold tabular">{insights.process[k]}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="text-xs leading-relaxed text-muted-foreground">
        These numbers describe your past decisions. They don&apos;t predict the next bet, and a hot stretch isn&apos;t a reason to stake more.
      </p>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="surface p-4 sm:p-5">
      <h2 className="font-semibold tracking-tight">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p>
      {children}
    </section>
  );
}
