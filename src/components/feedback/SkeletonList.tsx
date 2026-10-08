import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonList({ rows = 3, rowClassName = "h-[76px]" }: { rows?: number; rowClassName?: string }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`w-full rounded-2xl bg-surface ${rowClassName}`} />
      ))}
    </div>
  );
}
