import { FlaskConical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DataSourceInfo } from "@/lib/types";

/** Honest label for demo data. Renders nothing once a real provider is active. */
export function MockDataBadge({ source }: { source: DataSourceInfo }) {
  if (!source.isMock) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 rounded-full border border-caution/30 bg-caution/10 px-2 py-0.5 text-[11px] font-medium text-caution">
          <FlaskConical className="size-3" aria-hidden="true" />
          Demo data
        </span>
      </TooltipTrigger>
      <TooltipContent>Sample data for development. Not live stats or lines.</TooltipContent>
    </Tooltip>
  );
}
