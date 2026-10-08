import { CloudSun, MapPin, Wind } from "lucide-react";
import { MockDataBadge } from "@/components/data/MockDataBadge";
import type { GameBoard } from "@/lib/sports/queries";
import { Kickoff } from "./Kickoff";
import { TeamMark } from "./TeamMark";

function spreadLabel(board: GameBoard): string | null {
  if (!board.odds) return null;
  const { homeSpread, total } = board.odds;
  const fav = homeSpread < 0 ? board.home : homeSpread > 0 ? board.away : null;
  const side = fav ? `${fav.abbreviation} -${Math.abs(homeSpread)}` : "Pick'em";
  return `${side} · O/U ${total}`;
}

/** Matchup hero for a game page. Shows context, not a betting board. */
export function GameHeader({ board }: { board: GameBoard }) {
  const { game, home, away } = board;
  const weather = game.weather;
  const context = spreadLabel(board);

  return (
    <section className="surface relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(120% 80% at 0% 0%, color-mix(in oklch, ${away.color} 35%, transparent) 0%, transparent 55%), radial-gradient(120% 80% at 100% 0%, color-mix(in oklch, ${home.color} 35%, transparent) 0%, transparent 55%)`,
        }}
      />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {game.week ? `Week ${game.week} · ` : ""}
            <Kickoff iso={game.startsAt} />
          </span>
          <MockDataBadge source={{ provider: "", isMock: board.isMock, asOf: "" }} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <TeamBlock abbr={away.abbreviation} name={away.name} mark={<TeamMark team={away} size="lg" />} />
          <span className="text-sm font-medium text-muted-foreground">@</span>
          <TeamBlock abbr={home.abbreviation} name={home.name} mark={<TeamMark team={home} size="lg" />} alignEnd />
        </div>

        <dl className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {context && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Spread and total</dt>
              <dd className="tabular">{context}</dd>
            </div>
          )}
          {game.venue && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" />
              <dt className="sr-only">Venue</dt>
              <dd>{game.venue}</dd>
            </div>
          )}
          {weather && (
            <div className="flex items-center gap-1.5">
              {(weather.windMph ?? 0) >= 15 ? <Wind className="size-3.5" aria-hidden="true" /> : <CloudSun className="size-3.5" aria-hidden="true" />}
              <dt className="sr-only">Weather</dt>
              <dd>{weather.isDome ? "Indoors" : [`${weather.tempF}°F`, weather.conditions, weather.windMph !== null ? `wind ${weather.windMph} mph` : null].filter(Boolean).join(" · ")}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

function TeamBlock({ abbr, name, mark, alignEnd = false }: { abbr: string; name: string; mark: React.ReactNode; alignEnd?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${alignEnd ? "flex-row-reverse text-right" : ""}`}>
      {mark}
      <div className="min-w-0">
        <p className="text-2xl font-semibold tracking-tight">{abbr}</p>
        <p className="truncate text-xs text-muted-foreground">{name}</p>
      </div>
    </div>
  );
}
