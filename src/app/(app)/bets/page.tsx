import { Ticket } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "My Bets" };

export default function Page() {
  return (
    <>
      <PageHeader title="My Bets" />
      <EmptyState icon={<Ticket />} title="My Bets is on the way" description="Saved parlays, results and post-game reviews will live here." />
    </>
  );
}
