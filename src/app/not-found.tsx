import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4">
      <EmptyState
        icon={<Compass />}
        title="Page not found"
        description="That link doesn't go anywhere. Head back home and try again."
        action={
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
        }
        className="w-full"
      />
    </main>
  );
}
