import { StorageBadge } from "@/components/bets/StorageBadge";
import { InsightsView } from "@/components/insights/InsightsView";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <>
      <PageHeader title="Insights" description="How your decisions have played out, and what to do more or less of." actions={<StorageBadge />} />
      <InsightsView />
    </>
  );
}
