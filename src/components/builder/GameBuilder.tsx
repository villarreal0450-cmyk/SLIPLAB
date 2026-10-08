"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { InjuryTag } from "@/components/games/InjuryTag";
import { PlayerAvatar } from "@/components/games/PlayerAvatar";
import { TeamMark } from "@/components/games/TeamMark";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { selectionKey } from "@/lib/parlay/format";
import { useParlayDraft } from "@/lib/parlay/store";
import type { BoardTeam } from "@/lib/sports/queries";
import { MARKETS } from "@/lib/types";
import { PickComposer, type ComposerTarget } from "./PickComposer";
import { PropChip } from "./PropChip";

/** Player + prop picker for one game. Tapping a prop opens the composer sheet. */
export function GameBuilder({ teams }: { teams: BoardTeam[] }) {
  const { picks } = useParlayDraft();
  const [target, setTarget] = useState<ComposerTarget | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = teams.map((t) => ({ ...t, players: q ? t.players.filter((p) => p.player.name.toLowerCase().includes(q)) : t.players }));

  const selectedByKey = useMemo(() => new Map(picks.map((p) => [selectionKey(p), p])), [picks]);
  const existing = target ? (selectedByKey.get(selectionKey({ playerId: target.player.id, market: target.market.market })) ?? null) : null;

  return (
    <>
      <label className="relative mb-5 block">
        <span className="sr-only">Find a player</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a player"
          className="h-11 w-full rounded-2xl border border-input bg-surface pl-10 pr-4 text-base outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </label>
      <div className="flex flex-col gap-8">
        {visible.map(({ team, opponent, players }) => (
          <section key={team.id} aria-labelledby={`team-${team.id}`}>
            <h2 id={`team-${team.id}`} className="mb-3 flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <TeamMark team={team} size="sm" />
              {team.city} {team.name}
            </h2>
            {players.length === 0 ? (
              <p className="surface px-4 py-6 text-center text-sm text-muted-foreground">{q ? "No players match." : "No player markets available yet."}</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {players.map(({ player, injury, props }) => (
                  <li key={player.id} className={injury && (injury.status === "out" || injury.status === "ir") ? "surface p-3.5 opacity-55" : "surface p-3.5"}>
                    <div className="mb-3 flex items-center gap-3">
                      <PlayerAvatar name={player.name} color={team.color} imageUrl={player.headshotUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold tracking-tight">{player.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {player.position}
                          {player.jerseyNumber !== undefined && ` · #${player.jerseyNumber}`}
                        </p>
                      </div>
                      {injury && <InjuryTag status={injury.status} />}
                    </div>
                    <div className="no-scrollbar -mx-3.5 flex gap-2 overflow-x-auto px-3.5">
                      {props
                        .slice()
                        .sort((a, b) => Number(a.priced === false) - Number(b.priced === false) || MARKETS[a.market].volatility - MARKETS[b.market].volatility)
                        .map((market) => (
                          <PropChip
                            key={market.market}
                            market={market}
                            selected={selectedByKey.get(selectionKey({ playerId: player.id, market: market.market })) ?? null}
                            onSelect={() => setTarget({ player, team, opponent, market })}
                          />
                        ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <Sheet open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-3xl border-border-strong px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-6 md:inset-x-auto! md:right-6! md:bottom-6! md:left-auto! md:w-[440px] md:rounded-3xl md:border"
        >
          {target && (
            <>
              <SheetTitle className="sr-only">
                {target.player.name} {MARKETS[target.market.market].label}
              </SheetTitle>
              <SheetDescription className="sr-only">Choose direction, line and odds, then add it to your parlay.</SheetDescription>
              <PickComposer
                key={`${target.player.id}:${target.market.market}`}
                target={target}
                existing={existing}
                onDone={() => setTarget(null)}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
