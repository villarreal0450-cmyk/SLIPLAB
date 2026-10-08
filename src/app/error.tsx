"use client";

import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4">
      <ErrorState
        description={error.message || "An unexpected error occurred."}
        action={
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        }
        className="w-full"
      />
    </main>
  );
}
