import { cn } from "cn";
import { brand } from "@/config/brand";

type LogoProps = {
  className?: string;
  /** Show the wordmark next to the mark. */
  withWordmark?: boolean;
};

/** The S mark (same artwork as the app icon), optionally with the two-tone wordmark. */
export function Logo({ className, withWordmark = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label={brand.name}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand asset */}
      <img src="/brand/mark.png" alt="" width={28} height={28} className="size-7" />
      {withWordmark && (
        <span className="text-base font-semibold tracking-tight" aria-hidden="true">
          Slip<span className="text-brand">Lab</span>
        </span>
      )}
    </span>
  );
}
