import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatScore } from "@/lib/analysis/presentation";
import { returnFigure } from "@/lib/bets/model";
import { betTitle, formatBetDate } from "@/lib/bets/presentation";
import { formatMoney } from "@/lib/format/money";
import { lastName } from "@/lib/format/names";
import { formatOdds } from "@/lib/odds";
import type { SavedBet } from "@/lib/types";
import { BetStatusBadge } from "./BetStatusBadge";

export function BetCard({ bet }: { bet: SavedBet }) {
  const names = bet.legs.map((l) => lastName(l.pick.playerName));
  const shown = names.slice(0, 3).join(", ") + (names.length > 3 ? ` +${names.length - 3}` : "");
  const settledLegs = bet.legs.filter((l) => l.status !== "pending").length;
  const ret = returnFigure(bet);

  return (
    <Link href={`/bets/${bet.id}`} className="surface flex flex-col gap-3 p-4 transition-colors hover:bg-surface-elevated">
      <div className="flex items-center justify-between gap-3">
        <BetStatusBadge status={bet.status} />
        <span className="text-xs text-muted-foreground">
          {formatBetDate(bet.createdAt)}
          {bet.sportsbook && ` · ${bet.sportsbook}`}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold tracking-tight">
            {betTitle(bet.legs.length)}
            {bet.odds !== null && <span className="ml-2 font-normal text-muted-foreground tabular">{formatOdds(bet.odds)}</span>}
          </p>
          <p className="truncate text-sm text-muted-foreground">{shown}</p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <dl className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-sm tabular">
        <div>
          <dt className="text-[11px] text-muted-foreground">Stake</dt>
          <dd className="font-medium">{formatMoney(bet.stake)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">{ret.label}</dt>
          <dd className="font-medium">{formatMoney(ret.amount)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">{bet.status === "pending" ? "Legs settled" : "Score then"}</dt>
          <dd className="font-medium">
            {bet.status === "pending" ? `${settledLegs}/${bet.legs.length}` : bet.analysis ? `${formatScore(bet.analysis.score)}/10` : "—"}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
