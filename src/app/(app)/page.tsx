import Link from "next/link";
import { Camera, ChevronRight, MessageSquareText, Plus } from "lucide-react";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { SkeletonList } from "@/components/feedback/SkeletonList";
import { UpcomingGames } from "@/components/games/UpcomingGames";
import { brand } from "@/config/brand";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="relative">
        <div className="mb-6 flex items-center justify-between md:hidden">
          <Logo />
        </div>
        <h1 className="max-w-md text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl">{brand.tagline}</h1>
        <p className="mt-3 max-w-sm text-base text-muted-foreground sm:text-lg">{brand.subtitle}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
        <Link
          href="/scan"
          className="surface-brand group flex items-center gap-4 p-4 transition-colors hover:bg-brand/12 md:col-span-1 md:row-span-1"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand">
            <Camera className="size-7" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold tracking-tight">Scan your betslip</span>
            <span className="block text-sm text-muted-foreground">Upload a screenshot and get instant analysis</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
        <div className="grid grid-cols-2 gap-3 md:contents">
          <ActionCard href="/build" icon={Plus} title="Build a parlay" description="Get AI suggestions" />
          <ActionCard href="/analyst" icon={MessageSquareText} title="Ask analyst" description="Any question, anytime" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Upcoming games</h2>
          <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
            See all
          </Link>
        </div>
        <Suspense fallback={<SkeletonList rows={3} />}>
          <UpcomingGames />
        </Suspense>
      </section>
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Plus;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="surface flex flex-col gap-4 p-4 transition-colors hover:bg-surface-elevated">
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand/12 text-brand">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block font-semibold tracking-tight">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}
