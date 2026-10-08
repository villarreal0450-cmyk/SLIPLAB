"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { primaryNav, type NavItem } from "@/config/nav";

type Variant = "bottom" | "side";

const isActive = (href: string, pathname: string | null) =>
  pathname === null ? false : href === "/" ? pathname === "/" : pathname.startsWith(href);

function NavLink({ item, active, variant }: { item: NavItem; active: boolean; variant: Variant }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        variant === "bottom"
          ? "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors"
          : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        variant === "bottom"
          ? active
            ? "text-brand"
            : "text-muted-foreground hover:text-foreground"
          : active
            ? "bg-brand/10 text-brand"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

function Links({ variant, pathname }: { variant: Variant; pathname: string | null }) {
  return primaryNav.map((item) => <NavLink key={item.href} item={item} variant={variant} active={isActive(item.href, pathname)} />);
}

function ActiveLinks({ variant }: { variant: Variant }) {
  return <Links variant={variant} pathname={usePathname()} />;
}

/**
 * Primary nav links with the current route highlighted. The pathname is
 * request data on dynamic routes, so the highlight streams in behind Suspense
 * while the static links render immediately.
 */
export function PrimaryNavLinks({ variant }: { variant: Variant }) {
  return (
    <Suspense fallback={<Links variant={variant} pathname={null} />}>
      <ActiveLinks variant={variant} />
    </Suspense>
  );
}
