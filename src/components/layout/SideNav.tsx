"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { brand } from "@/config/brand";
import { PrimaryNavLinks } from "./NavLink";

/** Desktop sidebar. Hidden below md. */
export function SideNav() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
      <Link href="/" className="mb-8 px-2">
        <Logo withWordmark />
      </Link>
      <nav aria-label="Primary" className="flex flex-col gap-1">
        <PrimaryNavLinks variant="side" />
      </nav>
      <p className="mt-auto px-2 text-xs leading-relaxed text-muted-foreground">{brand.disclaimer}</p>
    </aside>
  );
}
