"use client";

import { primaryNav } from "@/config/nav";
import { BottomNavLink } from "./NavLink";

/** Mobile-only bottom navigation. Hidden on md+ where SideNav takes over. */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch px-2 pt-1.5">
        {primaryNav.map((item) => (
          <BottomNavLink key={item.href} item={item} />
        ))}
      </div>
    </nav>
  );
}
