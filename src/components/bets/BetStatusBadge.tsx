import { cn } from "cn";
import { betStatusMeta } from "@/lib/bets/presentation";
import type { BetStatus } from "@/lib/types";

export function BetStatusBadge({ status, className }: { status: BetStatus; className?: string }) {
  const meta = betStatusMeta[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", meta.className, className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
