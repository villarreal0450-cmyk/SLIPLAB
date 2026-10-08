import { PageHeader } from "@/components/layout/PageHeader";
import { ScanView } from "@/components/scan/ScanView";
import { scanAvailable } from "@/lib/scan/service";

export const metadata = { title: "Scan betslip" };

export default function ScanPage() {
  return (
    <>
      <PageHeader title="Scan your betslip" description="Upload a screenshot, check what was read, then analyze it." backHref="/" />
      <ScanView visionEnabled={scanAvailable()} />
    </>
  );
}
