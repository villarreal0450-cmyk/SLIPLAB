import { MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Analyst" };

export default function Page() {
  return (
    <>
      <PageHeader title="Analyst" />
      <EmptyState icon={<MessageSquareText />} title="Analyst is on the way" description="Ask questions about your parlay and get straight answers grounded in your actual picks." />
    </>
  );
}
