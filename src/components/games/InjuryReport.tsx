import { HeartPulse } from "lucide-react";
import type { Injury, Team } from "@/lib/types";
import { InjuryTag } from "./InjuryTag";

/** Compact injury list for both sides of a game. */
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
  const byTeam = teams.map((team) => ({ team, list: injuries.filter((i) => i.teamId === team.id) }));

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
              <ul className="flex flex-col gap-2">
                {list.map((injury) => (
                  <li key={injury.playerId} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{injury.playerName}</span>
                      <span className="text-muted-foreground"> · {injury.position}</span>
                      <span className="block text-xs text-muted-foreground">{injury.description}</span>
                    </span>
                    <InjuryTag status={injury.status} className="mt-0.5 shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
