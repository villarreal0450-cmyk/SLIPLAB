import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Game, Team } from "@/lib/types";
import { TeamMark } from "./TeamMark";

type GameCardProps = {
  game: Game;
  home: Team;
  away: Team;
  href?: string;
};

export function formatKickoff(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today · ${time}`;
  const day = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${day} · ${time}`;
}

export function GameCard({ game, home, away, href }: GameCardProps) {
  const content = (
    <>
      <div className="flex -space-x-2">
        <TeamMark team={away} className="ring-2 ring-surface" />
        <TeamMark team={home} className="ring-2 ring-surface" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold tracking-tight">
          {away.abbreviation} <span className="text-muted-foreground">@</span> {home.abbreviation}
        </p>
        <p className="text-xs text-muted-foreground">{formatKickoff(game.startsAt)}</p>
      </div>
      {href && <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  const className = "surface flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-elevated";
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
