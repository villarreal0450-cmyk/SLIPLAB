import { UserRound } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Profile" };

export default function Page() {
  return (
    <>
      <PageHeader title="Profile" />
      <EmptyState icon={<UserRound />} title="Profile is on the way" description="Account, bankroll settings and responsible-betting controls." />
    </>
  );
}
