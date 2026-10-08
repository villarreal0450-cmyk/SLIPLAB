import type { ReactNode } from "react";

/** Small floating label positioned in percent of the chart box. */
export function ChartTooltip({ xPct, yPct, children }: { xPct: number; yPct: number; children: ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border-strong bg-popover px-2.5 py-1.5 text-xs shadow-card"
      style={{ left: `${Math.min(88, Math.max(12, xPct))}%`, top: `${yPct}%` }}
    >
      {children}
    </div>
  );
}
