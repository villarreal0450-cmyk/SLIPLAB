import { cn } from "cn";

type PlayerAvatarProps = {
  name: string;
  /** Team primary color (hex) for the tile. */
  color?: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = { sm: "size-9 text-xs", md: "size-11 text-sm", lg: "size-16 text-lg" };

/**
 * Player headshot on a team-tinted tile. Initials sit underneath the photo,
 * so a missing or broken image still reads as a clean avatar.
 */
export function PlayerAvatar({ name, color = "#3a3a40", imageUrl, size = "md", className }: PlayerAvatarProps) {
  const initials = name
    .replace(/\b(Jr\.?|Sr\.?|III|II)\b/g, "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <span
      aria-hidden="true"
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl font-semibold tracking-tight text-white/90", sizes[size], className)}
      style={{
        background: `linear-gradient(160deg, color-mix(in oklch, ${color} 70%, #1c1c20) 0%, #17171b 100%)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${color} 45%, transparent)`,
      }}
    >
      {initials}
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- provider-hosted headshots of varying sizes
        <img src={imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full scale-110 object-cover object-top pt-1" />
      )}
    </span>
  );
}
