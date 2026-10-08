import { cn } from "cn";
import type { Team } from "@/lib/types";

type TeamMarkProps = {
  team: Team;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = { sm: "size-8 text-[10px]", md: "size-10 text-xs", lg: "size-14 text-sm" };

/** Team avatar. Uses the logo when available, otherwise a tinted monogram. */
export function TeamMark({ team, size = "md", className }: TeamMarkProps) {
  if (team.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- external logo URLs vary by provider
    return <img src={team.logoUrl} alt={`${team.city} ${team.name}`} className={cn("rounded-full object-contain", sizes[size], className)} />;
  }
  return (
    <span
      role="img"
      aria-label={`${team.city} ${team.name}`}
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold tracking-wide text-white ring-1 ring-white/10", sizes[size], className)}
      style={{ background: `linear-gradient(145deg, ${team.color} 0%, color-mix(in oklch, ${team.color} 55%, black) 100%)` }}
    >
      {team.abbreviation}
    </span>
  );
}
