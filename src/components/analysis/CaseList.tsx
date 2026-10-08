import type { ReactNode } from "react";
import { cn } from "cn";

type CaseListProps = { title: string; icon: ReactNode; tone: string; items: string[]; empty: string };

/** Bull or bear case: a titled list of short reasons. */
export function CaseList({ title, icon, tone, items, empty }: CaseListProps) {
  return (
    <div className="rounded-2xl border border-border p-3.5">
      <h4 className={cn("mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", tone)}>
        {icon}
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-foreground/85">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
