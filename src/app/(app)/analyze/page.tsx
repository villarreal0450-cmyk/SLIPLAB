import { Sparkles } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Parlay analysis" };

/** Phase 3 replaces this with the full analysis screen. */
export default function AnalyzePage() {
  return (
    <>
      <PageHeader title="Parlay analysis" backHref="/build" />
      <EmptyState
        icon={<Sparkles />}
        title="Analysis screen comes next"
        description="Your slip is saved. The scoring engine is ready; the screen that shows the parlay score, each leg and the weakest link is the next phase."
        action={
          <Button asChild variant="secondary">
            <Link href="/build">Keep building</Link>
          </Button>
        }
      />
    </>
  );
}
