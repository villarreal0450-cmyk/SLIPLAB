import { Newspaper } from "lucide-react";
import { InjuryTag } from "@/components/games/InjuryTag";
import type { PickBreakdown } from "@/lib/analysis";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/**
 * There is no news feed yet, so this shows the injury updates we do have and
 * says plainly that broader news isn't connected.
 */
export function NewsPanel({ breakdown: b }: { breakdown: PickBreakdown }) {
  const updates = [...b.injuries.own, ...b.injuries.opponent].sort((a, c) => c.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="flex flex-col gap-3">
      {updates.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {updates.map((u) => (
            <li key={u.playerId} className="surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">
                  {u.playerName} <span className="font-normal text-muted-foreground">· {u.position}</span>
                </p>
                <InjuryTag status={u.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{u.description}</p>
              <p className="mt-2 text-xs text-muted-foreground/80">Injury report · {when(u.updatedAt)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="surface p-5 text-sm text-muted-foreground">No injury updates for either team.</p>
      )}
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Newspaper className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Only injury reports are connected right now. Beat-writer news, depth-chart changes and practice notes arrive with a live data provider.
      </p>
    </div>
  );
}
