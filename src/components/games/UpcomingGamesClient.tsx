"use client";

import { CalendarX2 } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { EmptyState } from "@/components/feedback/EmptyState";
import type { SportKey } from "@/lib/types";
import { GameCard } from "./GameCard";
import type { SlateData } from "@/lib/sports/queries";

export function UpcomingGamesClient({ data }: { data: SlateData }) {
  const [sport, setSport] = useState<SportKey>(data.sports[0]?.key ?? "nfl");
  const games = data.games.filter((g) => g.sport === sport);

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Sport" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {data.sports.map((s) => {
          const active = s.key === sport;
          return (
            <button
              key={s.key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setSport(s.key)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {games.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 />}
          title={`No ${data.sports.find((s) => s.key === sport)?.label ?? ""} games loaded`}
          description={data.isMock ? "Demo data only covers the NFL slate for now." : "Only the NFL is connected so far. More leagues are coming."}
          className="py-10"
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {games.map((game) => {
            const home = data.teams[game.homeTeamId];
            const away = data.teams[game.awayTeamId];
            if (!home || !away) return null;
            return (
              <li key={game.id} className="animate-fade-up">
                <GameCard game={game} home={home} away={away} href={`/games/${game.id}`} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
