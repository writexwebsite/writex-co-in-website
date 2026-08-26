import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CareersRolePage } from "@/components/hiring/CareersRolePage";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";

export const metadata: Metadata = {
  title: "Sales Executive Careers | WriteX",
  description:
    "Explore the full-time Sales Executive role, fair selection process and secure application experience at WriteX.",
  alternates: {
    canonical: "https://www.writex.co.in/careers/sales-executive"
  },
  robots: { index: true, follow: true }
};

export default function SalesExecutiveCareersPage() {
  if (!isHiringFeatureEnabled("applications")) notFound();
  return <CareersRolePage role="sales_executive" />;
}
