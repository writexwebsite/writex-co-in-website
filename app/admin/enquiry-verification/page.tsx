import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminProviderState } from "@/components/admin/AdminProviderState";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageRepresentativeDirectory } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Enquiry Verification | WriteX Admin",
  robots: { index: false, follow: false }
};

export default async function EnquiryVerificationPage() {
  const session = await requireAdminSession();
  if (!canManageRepresentativeDirectory(session)) notFound();
  return (
    <AdminShell
      session={session}
      eyebrow="Trust & Verification"
      title="Enquiry verification"
      description="Prepared public verification for official enquiry references, with internal notes and commercial data kept private."
    >
      <AdminProviderState
        title="LTS enquiry provider"
        status={process.env.TRUST_ENQUIRY_PROVIDER || "awaiting_connection"}
        description="The future provider will expose only received, assigned, converted or closed state and a safe update timestamp."
        requirements={[
          "Approved LTS enquiry verification contract",
          "Reference and mobile ownership rules",
          "Assigned, converted and closed status mappings",
          "No employee IDs, lead scores or internal commercial notes"
        ]}
        actions={[
          { label: "View required API contract", href: "/admin/help" },
          { label: "Open CRM", href: "/admin/crm" }
        ]}
      />
    </AdminShell>
  );
}
