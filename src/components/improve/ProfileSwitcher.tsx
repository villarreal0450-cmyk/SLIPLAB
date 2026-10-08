"use client";

import { cn } from "cn";
import type { ParlaySuggestion } from "@/lib/types";

type Profile = ParlaySuggestion["profile"];

const LABELS: Record<Profile, string> = { safer: "Safer", balanced: "Balanced", aggressive: "More aggressive" };
const ORDER: Profile[] = ["safer", "balanced", "aggressive"];

/** Segmented control with a sliding thumb. */
export function ProfileSwitcher({ value, onChange, recommended }: { value: Profile; onChange: (p: Profile) => void; recommended: Profile | null }) {
  const index = ORDER.indexOf(value);
  return (
    <div role="radiogroup" aria-label="Suggestion style" className="relative grid grid-cols-3 rounded-2xl bg-surface-sunken p-1">
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-foreground shadow-card transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {ORDER.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={cn(
            "relative z-10 rounded-xl px-2 py-2.5 text-sm font-semibold transition-colors",
            value === p ? "text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p === "aggressive" ? (
            <>
              <span className="sm:hidden">Aggressive</span>
              <span className="hidden sm:inline">{LABELS[p]}</span>
            </>
          ) : (
            LABELS[p]
          )}
          {recommended === p && <span className="sr-only"> (recommended)</span>}
        </button>
      ))}
    </div>
  );
}
