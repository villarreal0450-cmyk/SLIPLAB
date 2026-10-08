import { cn } from "cn";

type PlayerAvatarProps = {
  name: string;
  /** Team primary color (hex) for the ring. */
  color?: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = { sm: "size-9 text-xs", md: "size-11 text-sm", lg: "size-16 text-lg" };

/** Player headshot, or initials on a team-tinted tile when no image exists. */
export function PlayerAvatar({ name, color = "#3a3a40", imageUrl, size = "md", className }: PlayerAvatarProps) {
  const initials = name
    .replace(/\b(Jr\.?|Sr\.?|III|II)\b/g, "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- provider headshot hosts vary
    return <img src={imageUrl} alt="" className={cn("shrink-0 rounded-2xl object-cover", sizes[size], className)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center rounded-2xl font-semibold tracking-tight text-white/90", sizes[size], className)}
      style={{
        background: `linear-gradient(160deg, color-mix(in oklch, ${color} 70%, #1c1c20) 0%, #17171b 100%)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${color} 45%, transparent)`,
      }}
    >
      {initials}
    </span>
  );
}
