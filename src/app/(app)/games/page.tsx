import { Suspense } from "react";
import { SkeletonList } from "@/components/feedback/SkeletonList";
import { UpcomingGames } from "@/components/games/UpcomingGames";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Games" };

export default function GamesPage() {
  return (
    <>
      <PageHeader title="Upcoming games" backHref="/" />
      <Suspense fallback={<SkeletonList rows={4} />}>
        <UpcomingGames />
      </Suspense>
    </>
  );
}
