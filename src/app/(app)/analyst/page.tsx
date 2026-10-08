import { AnalystView } from "@/components/analyst/AnalystView";
import { PageHeader } from "@/components/layout/PageHeader";
import { analystMode } from "@/lib/analyst/service";

export const metadata = { title: "Analyst" };

export default function AnalystPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Ask the analyst" description="Straight answers about your slip — including when not to bet it." />
      <AnalystView mode={analystMode()} />
    </div>
  );
}
