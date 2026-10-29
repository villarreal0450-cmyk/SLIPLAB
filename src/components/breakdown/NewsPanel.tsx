import { InjuryTag } from "@/components/games/InjuryTag";
import { ResearchCard } from "./ResearchCard";
import type { PickBreakdown } from "@/lib/analysis";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** On-demand web research first, then the official injury updates for both teams. */
export function NewsPanel({ breakdown: b }: { breakdown: PickBreakdown }) {
  const updates = [...b.injuries.own, ...b.injuries.opponent].sort((a, c) => c.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="flex flex-col gap-3">
      <ResearchCard pick={b.pick} />
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
    </div>
  );
}
