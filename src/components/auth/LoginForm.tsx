"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, PlugZap } from "lucide-react";
import { useId, useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

/**
 * Email magic link + Google. Accounts are optional: everything works as a
 * guest, and signing in only adds sync across devices.
 */
export function LoginForm({ errorCode }: { errorCode: string | null }) {
  const { configured, user } = useAuth();
  const router = useRouter();
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(errorCode ? "That sign-in link didn't work. Request a new one." : null);

  if (!configured) {
    return (
      <EmptyState
        icon={<PlugZap />}
        title="Accounts aren't connected yet"
        description="This build has no Supabase project configured. Everything still works as a guest, and your bets are saved on this device."
        action={
          <Button asChild variant="secondary">
            <Link href="/bets">Go to My Bets</Link>
          </Button>
        }
      />
    );
  }

  if (user) {
    return (
      <EmptyState
        icon={<MailCheck />}
        title="You're signed in"
        description={user.email ?? undefined}
        action={<Button onClick={() => router.push("/bets")}>Go to My Bets</Button>}
      />
    );
  }

  const redirectTo = () => `${window.location.origin}/auth/callback?next=/bets`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    setState("sending");
    setError(null);
    const { error: err } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    if (err) {
      setState("idle");
      setError(err.message);
    } else {
      setState("sent");
    }
  }

  async function google() {
    setError(null);
    const { error: err } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (err) setError(err.message);
  }

  if (state === "sent") {
    return (
      <EmptyState
        icon={<MailCheck />}
        title="Check your email"
        description={`We sent a sign-in link to ${email}. Open it on this device.`}
        action={
          <Button variant="secondary" onClick={() => setState("idle")}>
            Use a different email
          </Button>
        }
      />
    );
  }

  return (
    <div className="surface mx-auto flex w-full max-w-md flex-col gap-5 p-5 sm:p-6">
      <form onSubmit={sendLink} className="flex flex-col gap-3">
        <label htmlFor={emailId} className="text-sm font-medium">
          Email
        </label>
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-12 rounded-2xl border border-input bg-surface-sunken px-4 text-base outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <Button type="submit" disabled={state === "sending"} className="h-12 rounded-2xl text-base font-semibold">
          {state === "sending" ? "Sending…" : "Email me a sign-in link"}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="secondary" onClick={google} className="h-12 rounded-2xl text-base">
        Continue with Google
      </Button>
      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">You can keep using the app without an account.</p>
    </div>
  );
}
