"use client";

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

  const selectedByKey = useMemo(() => new Map(picks.map((p) => [selectionKey(p), p])), [picks]);
  const existing = target ? (selectedByKey.get(selectionKey({ playerId: target.player.id, market: target.market.market })) ?? null) : null;

  return (
    <>
      <div className="flex flex-col gap-8">
        {teams.map(({ team, opponent, players }) => (
          <section key={team.id} aria-labelledby={`team-${team.id}`}>
            <h2 id={`team-${team.id}`} className="mb-3 flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <TeamMark team={team} size="sm" />
              {team.city} {team.name}
            </h2>
            {players.length === 0 ? (
              <p className="surface px-4 py-6 text-center text-sm text-muted-foreground">No player markets available yet.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {players.map(({ player, injury, props }) => (
                  <li key={player.id} className="surface p-3.5">
                    <div className="mb-3 flex items-center gap-3">
                      <PlayerAvatar name={player.name} color={team.color} size="sm" />
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
                        .sort((a, b) => MARKETS[a.market].volatility - MARKETS[b.market].volatility)
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
