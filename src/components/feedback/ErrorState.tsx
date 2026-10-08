import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({ title = "Something went wrong", description, action, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn("surface flex flex-col items-center px-6 py-12 text-center", className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-negative/12 text-negative">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
