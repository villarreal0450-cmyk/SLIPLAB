import type { CSSProperties } from "react";
import { cn } from "cn";
import { formatScore, toneClasses, type Tone } from "@/lib/analysis/presentation";

type ScoreRingProps = {
  score: number;
  max?: number;
  tone: Tone;
  size?: "md" | "lg";
  label?: string;
  className?: string;
};

const dims = { md: { box: 88, stroke: 7, text: "text-2xl" }, lg: { box: 132, stroke: 10, text: "text-[2.6rem]" } };

/** Circular score with a one-shot fill animation. */
export function ScoreRing({ score, max = 10, tone, size = "lg", label, className }: ScoreRingProps) {
  const { box, stroke, text } = dims[size];
  const r = (box - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = Math.min(1, Math.max(0, score / max));
  const offset = c * (1 - fraction);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: box, height: box }}
      role="img"
      aria-label={label ?? `Score ${formatScore(score)} out of ${max}`}
    >
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="-rotate-90">
        <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          stroke={toneClasses[tone].stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="animate-ring-in"
          style={{ "--ring-circumference": `${c}` } as CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-semibold leading-none tracking-tight tabular", text)}>{formatScore(score)}</span>
        <span className="mt-1 text-xs text-muted-foreground">/{max}</span>
      </div>
    </div>
  );
}
