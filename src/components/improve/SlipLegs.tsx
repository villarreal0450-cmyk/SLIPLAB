import { Check, CircleAlert } from "lucide-react";
import { PlayerAvatar } from "@/components/games/PlayerAvatar";
import { describePick } from "@/lib/parlay/format";
import type { Pick } from "@/lib/types";

/** Compact leg list used by suggestion and current-slip cards. */
export function SlipLegs({ picks, flagged = [] }: { picks: Pick[]; flagged?: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {picks.map((p) => {
        const flag = flagged.includes(p.id);
        return (
          <li key={p.id} className="flex items-center gap-3">
            <PlayerAvatar name={p.playerName} color={p.meta?.teamColor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium tracking-tight">{p.playerName}</p>
              <p className="truncate text-xs text-muted-foreground">{describePick(p)}{p.isAlternate ? " (alt)" : ""}</p>
            </div>
            {flag ? (
              <CircleAlert className="size-5 shrink-0 text-negative" aria-label="Weak leg" />
            ) : (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-positive/15 text-positive" aria-hidden="true">
                <Check className="size-3" />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
