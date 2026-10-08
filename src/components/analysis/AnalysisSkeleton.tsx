import { Skeleton } from "@/components/ui/skeleton";

export function AnalysisSkeleton() {
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-6" aria-busy="true" aria-label="Analyzing your parlay">
      <div className="flex flex-col gap-3">
        <div className="surface flex items-center gap-5 p-5">
          <Skeleton className="size-[132px] shrink-0 rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-32 bg-muted" />
            <Skeleton className="h-3.5 w-full bg-muted" />
            <Skeleton className="h-3.5 w-4/5 bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[72px] rounded-2xl bg-surface" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
