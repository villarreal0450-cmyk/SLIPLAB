"use client";

import { Cloud, Smartphone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBets } from "@/lib/bets/BetsProvider";

/** Tells the user where their bets live. Device storage is easy to lose, so say so. */
export function StorageBadge() {
  const { storage } = useBets();
  const device = storage === "device";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          {device ? <Smartphone className="size-3.5" aria-hidden="true" /> : <Cloud className="size-3.5" aria-hidden="true" />}
          {device ? "On this device" : "Synced"}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">
        {device ? "Saved in this browser only. Clearing site data removes them. Sign in to keep them across devices." : "Saved to your account."}
      </TooltipContent>
    </Tooltip>
  );
}
