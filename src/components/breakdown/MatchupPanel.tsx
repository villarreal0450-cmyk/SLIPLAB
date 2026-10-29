import { CloudSun, MapPin, Wind } from "lucide-react";
import { TeamMark } from "@/components/games/TeamMark";
import { InjuryReport } from "@/components/games/InjuryReport";
import type { PickBreakdown } from "@/lib/analysis";

function weatherText(w: { tempF: number; windMph: number | null; conditions: string | null }) {
  return [`${w.tempF}°F`, w.conditions, w.windMph !== null ? `${w.windMph} mph` : null].filter(Boolean).join(" · ");
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** Opponent profile (ranked across the league) and game environment. */
export function MatchupPanel({ breakdown: b }: { breakdown: PickBreakdown }) {
  const d = b.defense;
  const spread = b.game.spread;

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="defense-heading" className="surface p-4 sm:p-5">
        <h2 id="defense-heading" className="mb-3 flex items-center gap-2.5 font-semibold tracking-tight">
          <TeamMark team={b.opponent} size="sm" />
          {d?.title ?? `${b.opponent.city} defense`}
        </h2>
        {d ? (
          <dl className="flex flex-col divide-y divide-border">
            {d.rows.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <dt className={r.focus ? "font-medium" : "text-muted-foreground"}>{r.label}</dt>
                <dd className="text-right tabular">
                  <span className="font-medium">{r.perGame}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r.rank > r.leagueSize / 2 ? `${ordinal(r.leagueSize - r.rank + 1)}-most` : `${ordinal(r.rank)}-fewest`} of {r.leagueSize}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No numbers for this opponent yet.</p>
        )}
        {d && <p className="mt-3 text-xs text-muted-foreground">Ranked across the league. The highlighted row moves this market most.</p>}
      </section>

      <section aria-labelledby="env-heading" className="surface p-4 sm:p-5">
        <h2 id="env-heading" className="mb-3 font-semibold tracking-tight">
          Game environment
        </h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Spread</dt>
            <dd className="font-medium tabular">
              {spread === null ? "—" : spread === 0 ? "Pick'em" : `${b.team.abbreviation} ${spread > 0 ? "+" : ""}${spread}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total</dt>
            <dd className="font-medium tabular">{b.game.total ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Site</dt>
            <dd className="flex items-center gap-1.5 font-medium">
              <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {b.game.isHome ? "Home" : "Away"}
              {b.game.venue && <span className="truncate font-normal text-muted-foreground">· {b.game.venue}</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Weather</dt>
            <dd className="flex items-center gap-1.5 font-medium">
              {b.game.weather && (b.game.weather.windMph ?? 0) >= 15 ? <Wind className="size-3.5 text-muted-foreground" aria-hidden="true" /> : <CloudSun className="size-3.5 text-muted-foreground" aria-hidden="true" />}
              {b.game.weather ? (b.game.weather.isDome ? "Indoors" : weatherText(b.game.weather)) : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <InjuryReport injuries={[...b.injuries.own, ...b.injuries.opponent]} teams={[b.team, b.opponent]} />
    </div>
  );
}
