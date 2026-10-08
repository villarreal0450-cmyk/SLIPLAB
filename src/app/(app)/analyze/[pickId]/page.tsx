import { Suspense } from "react";
import { PickBreakdownView } from "@/components/breakdown/PickBreakdownView";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Pick breakdown" };

export default function PickBreakdownPage({ params }: PageProps<"/analyze/[pickId]">) {
  return (
    <>
      <PageHeader title="Pick breakdown" backHref="/analyze" className="mb-5" />
      <Suspense fallback={null}>
        <BreakdownForParams params={params} />
      </Suspense>
    </>
  );
}

async function BreakdownForParams({ params }: { params: PageProps<"/analyze/[pickId]">["params"] }) {
  const { pickId } = await params;
  return <PickBreakdownView pickId={decodeURIComponent(pickId)} />;
}
