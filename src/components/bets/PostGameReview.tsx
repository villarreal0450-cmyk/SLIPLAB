import { ClipboardCheck } from "lucide-react";
import { cn } from "cn";
import { REVIEW_LABEL, reviewBet } from "@/lib/bets/review";
import type { ProcessReview, SavedBet } from "@/lib/types";

const CHIP: Record<ProcessReview, string> = {
  good_read: "bg-positive/12 text-positive",
  good_process_bad_result: "bg-info/12 text-info",
  high_variance_result: "bg-caution/12 text-caution",
  bad_process: "bg-negative/12 text-negative",
};

/** Post-game autopsy: process judged separately from the result. */
export function PostGameReview({ bet }: { bet: SavedBet }) {
  const review = reviewBet(bet);
  if (!review) return null;
  const rows = review.legs.filter((l) => l.review);
  return (
    <section aria-labelledby="review-heading" className="surface p-4 sm:p-5">
      <h2 id="review-heading" className="mb-1 flex items-center gap-2 font-semibold tracking-tight">
        <ClipboardCheck className="size-4 text-muted-foreground" aria-hidden="true" />
        Post-game review
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-foreground/85">{review.headline}</p>
      {rows.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map(({ leg, review: r }) => (
            <li key={leg.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
              <span className={cn("w-fit rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", CHIP[r!.category])}>{REVIEW_LABEL[r!.category]}</span>
              <p className="text-sm leading-relaxed text-muted-foreground">{r!.explanation}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No pre-game grades were saved with this bet, so there&apos;s no process to review.</p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">Add the final stat on each leg for a sharper read on near misses.</p>
    </section>
  );
}
