import { cn } from "cn";
import type { FactorResult } from "@/lib/types";

const dot: Record<FactorResult["impact"], string> = {
  positive: "bg-positive",
  neutral: "bg-muted-foreground/60",
  negative: "bg-negative",
};

const impactLabel: Record<FactorResult["impact"], string> = {
  positive: "helps",
  neutral: "neutral",
  negative: "hurts",
};

export function FactorRow({ factor }: { factor: FactorResult }) {
  return (
    <li className="flex gap-3">
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot[factor.impact])} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {factor.label}
          <span className="sr-only"> ({impactLabel[factor.impact]})</span>
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{factor.explanation}</p>
      </div>
    </li>
  );
}
