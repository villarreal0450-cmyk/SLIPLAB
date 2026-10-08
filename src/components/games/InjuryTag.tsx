import { cn } from "cn";
import type { InjuryStatus } from "@/lib/types";

const styles: Record<InjuryStatus, string> = {
  out: "bg-negative/15 text-negative",
  ir: "bg-negative/15 text-negative",
  doubtful: "bg-negative/10 text-negative",
  questionable: "bg-caution/12 text-caution",
  probable: "bg-muted text-muted-foreground",
};

const labels: Record<InjuryStatus, string> = {
  out: "Out",
  ir: "IR",
  doubtful: "Doubtful",
  questionable: "Questionable",
  probable: "Probable",
};

export function InjuryTag({ status, className }: { status: InjuryStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", styles[status], className)}>
      {labels[status]}
    </span>
  );
}
