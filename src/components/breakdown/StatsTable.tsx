import type { PickBreakdown } from "@/lib/analysis";

const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Table view of the game log: the accessible, exact companion to the charts. */
export function StatsTable({ breakdown: b }: { breakdown: PickBreakdown }) {
  const isYesNo = b.market.kind === "yes_no";
  return (
    <section aria-labelledby="log-heading" className="surface overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4 sm:px-5">
        <h2 id="log-heading" className="font-semibold tracking-tight">
          Game log
        </h2>
        <p className="text-xs text-muted-foreground">Last {b.recentGames.length} games</p>
      </div>
      <div className="overflow-x-auto">
        <table className="mt-3 w-full whitespace-nowrap text-sm tabular">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-2 font-medium sm:px-5">Date</th>
              <th scope="col" className="px-2 py-2 font-medium">Opp</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">{isYesNo ? "TD" : b.market.shortLabel}</th>
              {b.usage && (
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  <abbr title={b.usage.label} className="no-underline">{b.usage.shortLabel}</abbr>
                </th>
              )}
              <th scope="col" className="px-4 py-2 text-right font-medium sm:px-5">Result</th>
            </tr>
          </thead>
          <tbody>
            {[...b.recentGames].reverse().map((g, i, arr) => {
              const usage = b.usage ? b.usage.values[arr.length - 1 - i] : null;
              return (
                <tr key={`${g.date}-${i}`} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-muted-foreground sm:px-5">{shortDate(g.date)}</td>
                  <td className="px-2 py-2.5">
                    {g.isHome ? "vs" : "@"} {g.opponentAbbr}
                  </td>
                  <td className="px-2 py-2.5 text-right font-medium">{g.value === null ? "–" : isYesNo ? (g.value >= 1 ? "Yes" : "No") : g.value}</td>
                  {b.usage && <td className="px-2 py-2.5 text-right text-muted-foreground">{usage ?? "–"}</td>}
                  <td className={`px-4 py-2.5 text-right font-medium sm:px-5 ${g.hit ? "text-positive" : "text-muted-foreground"}`}>
                    {g.hit === null ? "–" : g.hit ? "Hit" : "Miss"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
