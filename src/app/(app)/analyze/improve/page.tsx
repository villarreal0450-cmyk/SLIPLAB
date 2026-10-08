import { ImproveView } from "@/components/improve/ImproveView";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Improve my parlay" };

export default function ImprovePage() {
  return (
    <>
      <PageHeader title="Improve my parlay" description="Three rebuilt versions of your slip, with a reason for every change." backHref="/analyze" />
      <ImproveView />
    </>
  );
}
