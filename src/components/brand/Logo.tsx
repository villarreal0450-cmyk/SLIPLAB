import { cn } from "cn";
import { brand } from "@/config/brand";

type LogoProps = {
  className?: string;
  /** Show the wordmark next to the mark. */
  withWordmark?: boolean;
};

export function Logo({ className, withWordmark = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label={brand.name}>
      <svg viewBox="0 0 32 24" className="h-5 w-auto text-brand" aria-hidden="true">
        <path d="M11 0h7L7 24H0L11 0Z" fill="currentColor" />
        <path d="M25 0h7L21 24h-7L25 0Z" fill="currentColor" opacity="0.6" />
      </svg>
      {withWordmark && <span className="text-base font-semibold tracking-tight">{brand.name}</span>}
    </span>
  );
}
