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

/** Opponent defensive profile and game environment. Ranks: 1 = toughest defense. */
export function MatchupPanel({ breakdown: b }: { breakdown: PickBreakdown }) {
  const d = b.defense;
  const rows = d
    ? [
        { label: "Pass yards allowed / game", value: d.passYardsAllowed, rank: d.passRank, focus: d.focus === "pass" },
        { label: "Receiving yards allowed / game", value: d.wrYardsAllowed, rank: null, focus: false },
        { label: "Rush yards allowed / game", value: d.rushYardsAllowed, rank: d.rushRank, focus: d.focus === "run" },
        { label: "Points allowed / game", value: d.pointsAllowed, rank: null, focus: false },
        { label: "Sacks / game (defense)", value: d.sacksPerGame === null ? "—" : d.sacksPerGame.toFixed(1), rank: null, focus: false },
      ]
    : [];
  const spread = b.game.spread;

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="defense-heading" className="surface p-4 sm:p-5">
        <h2 id="defense-heading" className="mb-3 flex items-center gap-2.5 font-semibold tracking-tight">
          <TeamMark team={b.opponent} size="sm" />
          {b.opponent.city} defense
        </h2>
        {d ? (
          <dl className="flex flex-col divide-y divide-border">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <dt className={r.focus ? "font-medium" : "text-muted-foreground"}>{r.label}</dt>
                <dd className="text-right tabular">
                  <span className="font-medium">{r.value}</span>
                  {r.rank !== null && <span className="ml-2 text-xs text-muted-foreground">{ordinal(r.rank)} of 32</span>}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No defensive data for this opponent yet.</p>
        )}
        {d && <p className="mt-3 text-xs text-muted-foreground">Ranks run from 1st (toughest) to 32nd (most generous). Highlighted rows matter most for this market.</p>}
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
