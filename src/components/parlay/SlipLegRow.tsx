"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { PlayerAvatar } from "@/components/games/PlayerAvatar";
import { describePick, formatPickOdds } from "@/lib/parlay/format";
import type { Pick } from "@/lib/types";

export function SlipLegRow({ pick, onRemove, onNavigate }: { pick: Pick; onRemove: () => void; onNavigate?: () => void }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <PlayerAvatar name={pick.playerName} color={pick.meta?.teamColor} imageUrl={pick.meta?.headshotUrl} size="sm" />
      <Link href={`/games/${pick.gameId}`} onClick={onNavigate} className="min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
        <p className="truncate font-semibold tracking-tight">{pick.playerName}</p>
        <p className="truncate text-sm text-muted-foreground">
          {describePick(pick)}
          {pick.meta && <span className="text-muted-foreground/70"> · {pick.meta.teamAbbr} vs {pick.meta.opponentAbbr}</span>}
        </p>
      </Link>
      <span className="text-sm font-medium tabular text-muted-foreground">{formatPickOdds(pick)}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${pick.playerName} ${describePick(pick)}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </li>
  );
}
