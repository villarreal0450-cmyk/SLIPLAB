import { ArrowRight } from "lucide-react";
import { cn } from "cn";
import { describePick } from "@/lib/parlay/format";
import type { SuggestionChange } from "@/lib/types";

const BADGE: Record<SuggestionChange["type"], { label: string; className: string }> = {
  keep: { label: "Keep", className: "bg-muted text-muted-foreground" },
  adjust_line: { label: "Change", className: "bg-caution/12 text-caution" },
  replace: { label: "Swap", className: "bg-info/12 text-info" },
  remove: { label: "Remove", className: "bg-negative/12 text-negative" },
  add: { label: "Add", className: "bg-positive/12 text-positive" },
};

/** Every change with its reason. Reasons are never optional: no silent swaps. */
export function ChangeList({ changes }: { changes: SuggestionChange[] }) {
  return (
    <ol className="flex flex-col divide-y divide-border">
      {changes.map((c, i) => {
        const badge = BADGE[c.type];
        const subject = c.before ?? c.after!;
        return (
          <li key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className={cn("mt-0.5 h-fit shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", badge.className)}>{badge.label}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {c.type === "add" ? (
                  <>
                    {c.after!.playerName} <span className="text-muted-foreground">{describePick(c.after!)}</span>
                  </>
                ) : (
                  <>
                    {subject.playerName} <span className="text-muted-foreground">{describePick(c.before!)}</span>
                    {(c.type === "adjust_line" || c.type === "replace") && c.after && (
                      <>
                        <ArrowRight className="mx-1 inline size-3.5 text-muted-foreground" aria-label="to" />
                        {c.type === "replace" && `${c.after.playerName} `}
                        <span>{describePick(c.after)}</span>
                      </>
                    )}
                  </>
                )}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{c.reason}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
