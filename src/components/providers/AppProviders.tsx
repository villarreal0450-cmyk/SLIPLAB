"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { BetsProvider } from "@/lib/bets/BetsProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <BetsProvider>{children}</BetsProvider>
    </AuthProvider>
  );
}
