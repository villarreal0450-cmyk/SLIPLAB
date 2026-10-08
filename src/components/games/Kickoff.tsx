"use client";

import { useHydrated } from "@/lib/hooks/useHydrated";

export function formatKickoff(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today · ${time}`;
  const day = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${day} · ${time}`;
}

/**
 * Kickoff time in the viewer's own timezone. The server doesn't know that
 * timezone, so the label renders after hydration; a fixed-width placeholder
 * avoids layout shift.
 */
export function Kickoff({ iso, className }: { iso: string; className?: string }) {
  const hydrated = useHydrated();
  return (
    <time dateTime={iso} className={className}>
      {hydrated ? formatKickoff(iso) : <span className="inline-block w-24 rounded bg-muted/60 align-middle">&nbsp;</span>}
    </time>
  );
}
