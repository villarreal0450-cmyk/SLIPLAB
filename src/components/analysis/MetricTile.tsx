import type { ReactNode } from "react";
import { cn } from "cn";
import { toneClasses, type Tone } from "@/lib/analysis/presentation";

type MetricTileProps = {
  label: string;
  value: ReactNode;
  suffix?: string;
  tone?: Tone;
  className?: string;
};

export function MetricTile({ label, value, suffix, tone, className }: MetricTileProps) {
  return (
    <div className={cn("surface flex flex-col items-center justify-center gap-1 px-2 py-3.5 text-center", className)}>
      <p className={cn("text-xl font-semibold leading-none tracking-tight tabular", tone && toneClasses[tone].text)}>
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
