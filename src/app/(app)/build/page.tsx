import { Suspense } from "react";
import { SkeletonList } from "@/components/feedback/SkeletonList";
import { UpcomingGames } from "@/components/games/UpcomingGames";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Build a parlay" };

const steps = ["Pick a game", "Add players & props", "Analyze the slip"];

export default function BuildPage() {
  return (
    <>
      <PageHeader title="Build a parlay" description="Your slip stays with you while you browse games." backHref="/" />

      <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Steps">
        {steps.map((label, i) => (
          <li key={label} className={`rounded-2xl border p-3 ${i === 0 ? "border-brand/40 bg-brand/8" : "border-border"}`}>
            <span className={`block text-xs font-semibold tabular ${i === 0 ? "text-brand" : "text-muted-foreground"}`}>0{i + 1}</span>
            <span className={`mt-1 block text-sm leading-tight ${i === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</span>
          </li>
        ))}
      </ol>

      <Suspense fallback={<SkeletonList rows={3} />}>
        <UpcomingGames />
      </Suspense>
    </>
  );
}
