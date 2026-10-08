import { Camera } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Scan betslip" };

export default function Page() {
  return (
    <>
      <PageHeader title="Scan betslip" />
      <EmptyState icon={<Camera />} title="Scan betslip is on the way" description="Upload a sportsbook screenshot and we will detect the picks for you to review before analysis." />
    </>
  );
}
