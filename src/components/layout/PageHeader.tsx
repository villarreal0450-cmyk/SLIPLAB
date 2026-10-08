import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, backHref, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex items-start gap-3", className)}>
      {backHref && (
        <Link
          href={backHref}
          aria-label="Back"
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
