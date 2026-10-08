import { cn } from "cn";
import { toneClasses, type Tone } from "@/lib/analysis/presentation";

/** Thin animated bar for a 0..max value. Decorative; the number carries the meaning. */
export function QualityBar({ value, max = 10, tone, className }: { value: number; max?: number; tone: Tone; className?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div aria-hidden="true" className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full origin-left animate-bar-in rounded-full", toneClasses[tone].bg)} style={{ width: `${pct}%` }} />
    </div>
  );
}
