import { Suspense, type ReactNode } from "react";
import { ParlayDock } from "@/components/parlay/ParlayDock";
import { AppProviders } from "@/components/providers/AppProviders";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";

/**
 * Responsive application frame: sidebar on desktop, bottom tab bar on mobile.
 * Pages render inside a constrained column so desktop never looks like a
 * stretched phone layout.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <div className="flex min-h-dvh">
        <SideNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 sm:px-6 md:px-10 md:pb-16 md:pt-10">
            {children}
            {/* Reads the pathname, which is request data on dynamic routes. */}
            <Suspense fallback={null}>
              <ParlayDock />
            </Suspense>
          </main>
        </div>
        <BottomNav />
      </div>
    </AppProviders>
  );
}
