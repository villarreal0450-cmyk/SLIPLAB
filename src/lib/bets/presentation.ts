import { Ban, CircleCheck, CircleDashed, CircleX, Clock, type LucideIcon } from "lucide-react";
import type { BetStatus, LegStatus } from "@/lib/types";

export const betStatusMeta: Record<BetStatus, { label: string; icon: LucideIcon; className: string }> = {
  draft: { label: "Draft", icon: CircleDashed, className: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", icon: Clock, className: "bg-info/12 text-info" },
  won: { label: "Won", icon: CircleCheck, className: "bg-positive/12 text-positive" },
  lost: { label: "Lost", icon: CircleX, className: "bg-negative/12 text-negative" },
  void: { label: "Void", icon: Ban, className: "bg-muted text-muted-foreground" },
};

export const legStatusLabel: Record<LegStatus, string> = { pending: "Pending", won: "Hit", lost: "Miss", void: "Void" };

export function betTitle(legCount: number) {
  return legCount === 1 ? "Single" : `${legCount}-leg parlay`;
}

export const formatBetDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
