import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Insights" };

export default function Page() {
  return (
    <>
      <PageHeader title="Insights" />
      <EmptyState icon={<BarChart3 />} title="Insights is on the way" description="Hit rates by sport, market and leg count, plus patterns in how you bet." />
    </>
  );
}
