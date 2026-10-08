import { Suspense } from "react";
import { BetDetailView } from "@/components/bets/BetDetailView";
import { StorageBadge } from "@/components/bets/StorageBadge";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Bet" };

export default function BetPage({ params, searchParams }: PageProps<"/bets/[betId]">) {
  return (
    <>
      <PageHeader title="Bet" backHref="/bets" actions={<StorageBadge />} />
      <Suspense fallback={null}>
        <BetForParams params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BetForParams({
  params,
  searchParams,
}: {
  params: PageProps<"/bets/[betId]">["params"];
  searchParams: PageProps<"/bets/[betId]">["searchParams"];
}) {
  const [{ betId }, query] = await Promise.all([params, searchParams]);
  return <BetDetailView betId={decodeURIComponent(betId)} justSaved={query.saved === "1"} />;
}
