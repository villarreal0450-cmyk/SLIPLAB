import type { PickBreakdown } from "@/lib/analysis";
import { ProjectionChart } from "./ProjectionChart";

export function ProjectionCard({ breakdown: b }: { breakdown: PickBreakdown }) {
  const projection = b.analysis.projection;
  if (!projection || b.market.kind === "yes_no") return null;
  const favorable = b.pick.direction === "under" ? projection.value < (projection.line ?? 0) : projection.value >= (projection.line ?? 0);

  return (
    <section aria-labelledby="projection-heading" className="surface p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 id="projection-heading" className="font-semibold tracking-tight">
            {b.market.label} projection
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Green bars are outcomes that clear your line.</p>
        </div>
        <div className="shrink-0 rounded-2xl bg-surface-sunken px-3.5 py-2 text-center">
          <p className="text-[11px] text-muted-foreground">Our projection</p>
          <p className={`text-2xl font-semibold leading-tight tracking-tight tabular ${favorable ? "text-positive" : "text-caution"}`}>{projection.value}</p>
          <p className="text-[11px] text-muted-foreground">{b.market.unit}</p>
        </div>
      </div>
      <ProjectionChart projection={projection} direction={b.pick.direction} unit={b.market.unit} />
      {b.marketLine?.line !== null && b.marketLine?.line !== undefined && (
        <p className="mt-2 text-xs text-muted-foreground tabular">
          Market line {b.marketLine.line} · your line {projection.line}
        </p>
      )}
    </section>
  );
}
