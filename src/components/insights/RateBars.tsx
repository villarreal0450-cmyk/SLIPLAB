import { cn } from "cn";
import { MIN_SAMPLE, type Group } from "@/lib/insights/compute";

/**
 * Hit rate per group as thin horizontal bars. One series, so no legend; each
 * row is labelled with the exact count so the bar is never the only signal.
 */
export function RateBars({ groups, unit }: { groups: Group[]; unit: "legs" | "bets" }) {
  if (groups.length === 0) return <p className="text-sm text-muted-foreground">Nothing settled here yet.</p>;
  return (
    <ul className="flex flex-col gap-3.5">
      {groups.map((g) => {
        const small = g.rate.total < MIN_SAMPLE;
        const pct = Math.round((g.rate.rate ?? 0) * 100);
        return (
          <li key={g.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{g.label}</span>
              <span className="shrink-0 tabular">
                <span className="font-semibold">{pct}%</span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {g.rate.hits} of {g.rate.total} {unit}
                </span>
                {small && <span className="ml-1.5 rounded bg-muted px-1 py-px text-[10px] text-muted-foreground">small sample</span>}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className={cn("h-full origin-left animate-bar-in rounded-full", small ? "bg-brand/40" : "bg-brand")} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
