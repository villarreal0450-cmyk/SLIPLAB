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
      {projection.sources && (
        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-surface-sunken p-3 text-center text-xs">
          <div>
            <dt className="text-muted-foreground">Our stats</dt>
            <dd className="mt-0.5 font-semibold tabular text-foreground">{projection.sources.stats}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ESPN analysts</dt>
            <dd className="mt-0.5 font-semibold tabular text-foreground">{projection.sources.experts ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Market line</dt>
            <dd className="mt-0.5 font-semibold tabular text-foreground">{projection.sources.market ?? "—"}</dd>
          </div>
        </dl>
      )}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Our projection blends these sources. Games where the player had a clearly smaller role than usual count less.
        {projection.line !== null ? ` Your line: ${projection.line}.` : ""}
      </p>
    </section>
  );
}
