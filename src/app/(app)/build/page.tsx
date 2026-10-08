import { Plus } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Build a parlay" };

export default function Page() {
  return (
    <>
      <PageHeader title="Build a parlay" />
      <EmptyState icon={<Plus />} title="Build a parlay is on the way" description="Pick a game, add players and props, then analyze the whole slip." />
    </>
  );
}
