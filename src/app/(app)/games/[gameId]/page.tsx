import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameBuilder } from "@/components/builder/GameBuilder";
import { SkeletonList } from "@/components/feedback/SkeletonList";
import { GameHeader } from "@/components/games/GameHeader";
import { InjuryReport } from "@/components/games/InjuryReport";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { listGameIds, loadGameBoard } from "@/lib/sports/queries";

export async function generateStaticParams() {
  const ids = await listGameIds();
  return ids.map((gameId) => ({ gameId }));
}

export async function generateMetadata({ params }: PageProps<"/games/[gameId]">): Promise<Metadata> {
  const { gameId } = await params;
  const board = await loadGameBoard(gameId);
  return { title: board ? `${board.away.abbreviation} @ ${board.home.abbreviation}` : "Game" };
}

export default function GamePage({ params }: PageProps<"/games/[gameId]">) {
  return (
    <>
      <PageHeader title="Build your picks" description="Tap a prop to set your line and add it to the parlay." backHref="/games" />
      <Suspense fallback={<GameSkeleton />}>
        <GameContent params={params} />
      </Suspense>
    </>
  );
}

async function GameContent({ params }: { params: PageProps<"/games/[gameId]">["params"] }) {
  const { gameId } = await params;
  const board = await loadGameBoard(gameId);
  if (!board) notFound();

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
      <div className="flex flex-col gap-6">
        <GameHeader board={board} />
        <div className="lg:hidden">
          <InjuryReport injuries={board.injuries} teams={[board.away, board.home]} />
        </div>
        <GameBuilder teams={board.teams} />
      </div>
      <aside className="hidden lg:sticky lg:top-10 lg:block">
        <InjuryReport injuries={board.injuries} teams={[board.away, board.home]} layout="stacked" />
      </aside>
    </div>
  );
}

function GameSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-48 w-full rounded-2xl bg-surface" />
      <SkeletonList rows={4} rowClassName="h-[120px]" />
    </div>
  );
}
