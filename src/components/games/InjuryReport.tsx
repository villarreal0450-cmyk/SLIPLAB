import { HeartPulse } from "lucide-react";
import type { Injury, InjuryStatus, Team } from "@/lib/types";
import { InjuryTag } from "./InjuryTag";

const SEVERITY: Record<InjuryStatus, number> = { out: 0, doubtful: 1, questionable: 2, ir: 3, probable: 4 };
const VISIBLE = 3;

function Row({ injury }: { injury: Injury }) {
  return (
    <li className="flex items-start justify-between gap-3 text-sm">
      <span className="min-w-0">
        <span className="font-medium">{injury.playerName}</span>
        <span className="text-muted-foreground"> · {injury.position}</span>
        <span className="line-clamp-2 text-xs text-muted-foreground">{injury.description}</span>
      </span>
      <InjuryTag status={injury.status} className="mt-0.5 shrink-0" />
    </li>
  );
}

/** Compact injury list for both sides of a game: most serious first, the rest one tap away. */
export function InjuryReport({
  injuries,
  teams,
  layout = "split",
}: {
  injuries: Injury[];
  teams: Team[];
  /** "split" puts teams side by side on wider screens; "stacked" always stacks (narrow sidebars). */
  layout?: "split" | "stacked";
}) {
  const byTeam = teams.map((team) => ({
    team,
    list: injuries.filter((i) => i.teamId === team.id).sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status]),
  }));

  return (
    <section aria-labelledby="injuries-heading" className="surface p-4 sm:p-5">
      <h2 id="injuries-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <HeartPulse className="size-4 text-muted-foreground" aria-hidden="true" />
        Injury report
      </h2>
      <div className={layout === "split" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        {byTeam.map(({ team, list }) => (
          <div key={team.id}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{team.abbreviation}</p>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reported injuries.</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {list.slice(0, VISIBLE).map((injury) => (
                    <Row key={injury.playerId} injury={injury} />
                  ))}
                </ul>
                {list.length > VISIBLE && (
                  <details className="group/more mt-2">
                    <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                      <span className="group-open/more:hidden">Show {list.length - VISIBLE} more</span>
                      <span className="hidden group-open/more:inline">Show fewer</span>
                    </summary>
                    <ul className="mt-2 flex flex-col gap-2">
                      {list.slice(VISIBLE).map((injury) => (
                        <Row key={injury.playerId} injury={injury} />
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
