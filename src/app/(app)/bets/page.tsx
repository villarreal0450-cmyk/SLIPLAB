import { BetsView } from "@/components/bets/BetsView";
import { StorageBadge } from "@/components/bets/StorageBadge";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "My Bets" };

export default function BetsPage() {
  return (
    <>
      <PageHeader title="My Bets" description="What you saved, how it settled, and what the analyst said beforehand." actions={<StorageBadge />} />
      <BetsView />
    </>
  );
}
