"use client";

import { Wallet } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_MAX_EXPOSURE_PCT, defaultUnit, type BankrollSettings } from "@/lib/bankroll/model";
import { useBankroll } from "@/lib/bankroll/store";
import { formatMoney, parseMoneyInput } from "@/lib/format/money";

/** Optional bankroll context. Used only to put stakes in perspective. */
export function BankrollCard() {
  const { settings, save, clear } = useBankroll();
  return (
    <section className="surface flex flex-col gap-3 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-semibold tracking-tight">
        <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
        Bankroll
      </h2>
      <p className="text-sm text-muted-foreground">
        Optional. Set the money you&apos;ve put aside for betting, and stakes get shown in units and as a share of it. Saved on this device.
      </p>
      {/* Remount the form when settings change elsewhere (e.g. another tab). */}
      <BankrollForm key={JSON.stringify(settings)} settings={settings} onSave={save} onClear={clear} />
    </section>
  );
}

function BankrollForm({ settings, onSave, onClear }: { settings: BankrollSettings | null; onSave: (s: BankrollSettings) => void; onClear: () => void }) {
  const ids = { bankroll: useId(), unit: useId(), max: useId() };
  const [bankroll, setBankroll] = useState(settings ? String(settings.bankroll) : "");
  const [unit, setUnit] = useState(settings ? String(settings.unitSize) : "");
  const [max, setMax] = useState(String(settings?.maxExposurePct ?? DEFAULT_MAX_EXPOSURE_PCT));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const parsedBankroll = parseMoneyInput(bankroll);
  const unitPlaceholder = typeof parsedBankroll === "number" ? String(defaultUnit(parsedBankroll)) : "1% of bankroll";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const b = parseMoneyInput(bankroll);
    if (typeof b !== "number") return setError("Enter your bankroll, like 500 or 2000.");
    const u = unit.trim() ? parseMoneyInput(unit) : defaultUnit(b);
    if (typeof u !== "number" || u > b) return setError("A unit should be a small amount, less than the bankroll.");
    const m = Number(max);
    if (!Number.isFinite(m) || m <= 0 || m > 100) return setError("Max exposure should be a percentage between 1 and 100.");
    setError(null);
    onSave({ bankroll: b, unitSize: u, maxExposurePct: m });
    setSaved(true);
  }

  const field = "h-10 w-full rounded-xl border border-input bg-surface-sunken px-3 text-sm outline-none tabular focus-visible:border-ring";
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <label htmlFor={ids.bankroll} className="flex flex-col gap-1 text-xs text-muted-foreground">
          Bankroll ($)
          <input id={ids.bankroll} inputMode="decimal" value={bankroll} onChange={(e) => setBankroll(e.target.value)} placeholder="2000" className={field} />
        </label>
        <label htmlFor={ids.unit} className="flex flex-col gap-1 text-xs text-muted-foreground">
          Unit size ($)
          <input id={ids.unit} inputMode="decimal" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={unitPlaceholder} className={field} />
        </label>
        <label htmlFor={ids.max} className="flex flex-col gap-1 text-xs text-muted-foreground">
          Warn above (% per bet)
          <input id={ids.max} inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))} className={field} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}
      {settings && !error && (
        <p className="text-xs text-muted-foreground tabular">
          {saved ? "Saved. " : ""}1 unit = {formatMoney(settings.unitSize)} · warnings above {formatMoney((settings.bankroll * settings.maxExposurePct) / 100)} per bet
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" className="rounded-xl">
          Save bankroll
        </Button>
        {settings && (
          <Button type="button" variant="ghost" className="rounded-xl text-muted-foreground" onClick={onClear}>
            Remove
          </Button>
        )}
      </div>
    </form>
  );
}
