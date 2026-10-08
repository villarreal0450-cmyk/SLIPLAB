"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { checkExposure } from "@/lib/bankroll/model";
import { useBankroll } from "@/lib/bankroll/store";
import { useBets } from "@/lib/bets/BetsProvider";
import type { RiskLevel } from "@/lib/types";

/** Puts a stake in context of the bankroll. Informs; never blocks, never upsells. */
export function ExposureNote({ stake, risk }: { stake: number | null; risk: RiskLevel }) {
  const { settings } = useBankroll();
  const { bets } = useBets();
  if (!settings) {
    return (
      <p className="text-xs text-muted-foreground">
        <Link href="/profile" className="underline underline-offset-2 hover:text-foreground">
          Set a bankroll
        </Link>{" "}
        to see stakes in units.
      </p>
    );
  }
  if (stake === null) return null;
  const c = checkExposure(stake, settings, risk, bets);
  const share = c.pctOfBankroll < 1 ? c.pctOfBankroll.toFixed(1) : Math.round(c.pctOfBankroll);
  const units = Number.isInteger(c.units) ? c.units : Number(c.units.toFixed(2));

  if (c.level === "ok") {
    return (
      <p className="text-xs text-muted-foreground tabular">
        {units} {c.units === 1 ? "unit" : "units"} · {share}% of your bankroll
      </p>
    );
  }
  return (
    <div role="status" className="flex gap-2 rounded-2xl border border-caution/30 bg-caution/[0.06] p-3 text-sm leading-relaxed text-foreground/85">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {c.notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
    </div>
  );
}
