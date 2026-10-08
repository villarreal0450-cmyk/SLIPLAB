import { PlayerAvatar } from "@/components/games/PlayerAvatar";
import type { PickBreakdown } from "@/lib/analysis";
import { formatOdds } from "@/lib/odds";
import { formatLine } from "@/lib/parlay/format";

export function BreakdownHeader({ breakdown: b }: { breakdown: PickBreakdown }) {
  const isYesNo = b.market.kind === "yes_no";
  const headline = isYesNo ? (b.pick.direction === "no" ? `No ${b.market.shortLabel}` : b.market.shortLabel) : formatLine(b.pick.market, b.pick.direction, b.pick.line);

  return (
    <section className="flex items-center gap-4">
      <PlayerAvatar name={b.player.name} color={b.team.color} imageUrl={b.player.headshotUrl ?? undefined} size="lg" className="sm:size-20 sm:text-2xl" />
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold leading-tight tracking-tight sm:text-3xl">{b.player.name}</h1>
        <p className="text-sm text-muted-foreground">
          {b.team.abbreviation} · {b.player.position}
          {b.player.jerseyNumber !== null && ` · #${b.player.jerseyNumber}`}
          <span className="text-muted-foreground/70"> · {b.game.isHome ? "vs" : "@"} {b.opponent.abbreviation}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xl font-semibold tracking-tight tabular sm:text-2xl">{headline}</p>
        <p className="text-xs text-muted-foreground">
          {isYesNo ? "" : b.market.label}
          {b.pick.odds !== undefined && <span className="tabular">{isYesNo ? "" : " · "}{formatOdds(b.pick.odds)}</span>}
        </p>
      </div>
    </section>
  );
}
