import { MetricTile } from "@/components/analysis/MetricTile";
import type { PickBreakdown } from "@/lib/analysis";
import { formatOdds } from "@/lib/odds";

export function SeasonSummary({ breakdown: b }: { breakdown: PickBreakdown }) {
  const isYesNo = b.market.kind === "yes_no";
  const avg = b.season.average;
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <MetricTile
        label={isYesNo ? "TD rate" : "Season avg"}
        value={avg === null ? "—" : isYesNo ? `${Math.round(avg * 100)}%` : avg.toFixed(1)}
      />
      <MetricTile label={isYesNo ? "Your pick" : "Your line"} value={isYesNo ? (b.pick.direction === "no" ? "No" : "Yes") : (b.pick.line ?? "—")} />
      <MetricTile
        label={isYesNo ? "Market price" : "Market line"}
        value={b.marketLine === null ? "—" : isYesNo ? formatOdds(b.pick.direction === "no" ? b.marketLine.underOdds : b.marketLine.overOdds) : (b.marketLine.line ?? "—")}
      />
    </div>
  );
}
