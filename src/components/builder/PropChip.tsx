import { Check } from "lucide-react";
import { cn } from "cn";
import { formatOdds } from "@/lib/odds";
import { formatLine } from "@/lib/parlay/format";
import { MARKETS, type MarketLine, type Pick } from "@/lib/types";

type PropChipProps = {
  market: MarketLine;
  selected: Pick | null;
  onSelect: () => void;
};

/** One market for a player. Shows the user's line once it's in the slip. */
export function PropChip({ market, selected, onSelect }: PropChipProps) {
  const def = MARKETS[market.market];
  const value = selected
    ? def.kind === "yes_no"
      ? selected.direction === "no" ? "No" : "Yes"
      : formatLine(selected.market, selected.direction, selected.line)
    : def.kind === "yes_no"
      ? formatOdds(market.overOdds)
      : String(market.line);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected !== null}
      aria-label={`${def.label}${selected ? `, in parlay: ${value}` : `, market ${value}`}`}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
        selected
          ? "border-brand/40 bg-brand/10"
          : "border-border bg-surface-sunken/60 hover:border-border-strong hover:bg-surface-elevated",
      )}
    >
      <span className="flex flex-col">
        <span className="text-[11px] text-muted-foreground">{def.shortLabel}</span>
        <span className={cn("text-sm font-semibold tabular", selected && "text-brand")}>{value}</span>
      </span>
      {selected && <Check className="size-3.5 text-brand" aria-hidden="true" />}
    </button>
  );
}
