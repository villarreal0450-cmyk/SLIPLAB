import { ParlayAnalysisView } from "@/components/analysis/ParlayAnalysisView";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Parlay analysis" };

export default function AnalyzePage() {
  return (
    <>
      <PageHeader title="Parlay analysis" backHref="/build" />
      <ParlayAnalysisView />
    </>
  );
}
