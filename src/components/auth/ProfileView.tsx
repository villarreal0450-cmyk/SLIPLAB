"use client";

import Link from "next/link";
import { CloudUpload, LifeBuoy, LogOut, Smartphone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { BankrollCard } from "@/components/bankroll/BankrollCard";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useBets } from "@/lib/bets/BetsProvider";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { clearDeviceBets, deviceBetRepository } from "@/lib/bets/deviceRepository";

export function ProfileView() {
  const { configured, user, loading, signOut } = useAuth();
  const { bets, storage, saveBet, reload, status } = useBets();
  const hydrated = useHydrated();
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [moving, setMoving] = useState<"idle" | "moving" | "done" | "error">("idle");

  // When signed in, look for bets left on this device from guest use.
  useEffect(() => {
    if (storage !== "account") return;
    let active = true;
    deviceBetRepository.load().then((b) => active && setDeviceCount(b.length));
    return () => {
      active = false;
    };
  }, [storage]);

  async function moveDeviceBets() {
    setMoving("moving");
    try {
      for (const bet of await deviceBetRepository.load()) await saveBet(bet);
      clearDeviceBets();
      setDeviceCount(0);
      setMoving("done");
      reload();
    } catch {
      setMoving("error");
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <section className="surface flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <UserRound className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold tracking-tight">{!hydrated || loading ? "…" : user ? user.email : "Guest"}</p>
            <p className="text-sm text-muted-foreground">
              {user ? "Bets sync to your account." : configured ? "Sign in to keep bets across devices." : "Accounts aren't connected in this build yet."}
            </p>
          </div>
        </div>
        {configured && !loading && (
          user ? (
            <Button variant="secondary" className="w-fit rounded-xl" onClick={signOut}>
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          ) : (
            <Button asChild className="w-fit rounded-xl">
              <Link href="/login">Sign in</Link>
            </Button>
          )
        )}
      </section>

      <section className="surface flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-semibold tracking-tight">
          <Smartphone className="size-4 text-muted-foreground" aria-hidden="true" />
          Your data
        </h2>
        <p className="text-sm text-muted-foreground">
          {!hydrated || status === "loading"
            ? "Loading…"
            : storage === "device"
            ? `${bets.length} saved ${bets.length === 1 ? "bet" : "bets"} in this browser. Clearing site data removes them.`
            : `${bets.length} saved ${bets.length === 1 ? "bet" : "bets"} in your account.`}
        </p>
        {storage === "account" && deviceCount !== null && deviceCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-3">
            <p className="text-sm text-muted-foreground">
              {deviceCount} {deviceCount === 1 ? "bet is" : "bets are"} still saved on this device from before you signed in.
            </p>
            <Button size="sm" className="rounded-xl" disabled={moving === "moving"} onClick={moveDeviceBets}>
              <CloudUpload data-icon="inline-start" />
              {moving === "moving" ? "Moving…" : "Move to account"}
            </Button>
          </div>
        )}
        {moving === "error" && <p role="alert" className="text-sm text-negative">Some bets didn&apos;t move. Try again.</p>}
      </section>

      <BankrollCard />

      <section className="surface flex flex-col gap-2 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-semibold tracking-tight">
          <LifeBuoy className="size-4 text-muted-foreground" aria-hidden="true" />
          Betting responsibly
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {brand.name} is an analysis tool. It never places bets and never guarantees outcomes. Set a budget before you bet, never chase losses, and take a break if it stops being fun.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If gambling is causing problems for you or someone you know, call or text <span className="font-medium text-foreground">1-800-GAMBLER</span> (US) for free, confidential help.
        </p>
      </section>
    </div>
  );
}
