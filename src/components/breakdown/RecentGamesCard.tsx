import { Check, Minus } from "lucide-react";
import { cn } from "cn";
import type { PickBreakdown } from "@/lib/analysis";
import { RecentGamesChart } from "./RecentGamesChart";

export function RecentGamesCard({ breakdown: b }: { breakdown: PickBreakdown }) {
  const isYesNo = b.market.kind === "yes_no";
  return (
    <section aria-labelledby="recent-heading" className="surface p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="recent-heading" className="font-semibold tracking-tight">
          Recent games
        </h2>
        {b.hitRate && (
          <p className="text-sm text-muted-foreground tabular">
            <span className="font-semibold text-foreground">
              {b.hitRate.hits}/{b.hitRate.games}
            </span>{" "}
            {isYesNo ? "with a TD" : "cleared your line"}
          </p>
        )}
      </div>

      {isYesNo ? (
        <ul className="grid grid-cols-5 gap-2">
          {b.recentGames.map((g, i) => (
            <li key={`${g.date}-${i}`} className="rounded-xl bg-surface-sunken px-1 py-2.5 text-center">
              <p className="text-[11px] text-muted-foreground">
                {g.isHome ? "vs" : "@"} {g.opponentAbbr}
              </p>
              <span className={cn("mx-auto mt-1.5 flex size-6 items-center justify-center rounded-full", g.hit ? "bg-positive/15 text-positive" : "bg-muted text-muted-foreground")}>
                {g.hit ? <Check className="size-3.5" aria-hidden="true" /> : <Minus className="size-3.5" aria-hidden="true" />}
              </span>
              <p className="mt-1 text-[11px] font-medium">{g.hit ? "Scored" : "No TD"}</p>
            </li>
          ))}
        </ul>
      ) : (
        <RecentGamesChart games={b.recentGames} line={b.pick.line} unit={b.market.unit} />
      )}
    </section>
  );
}
