import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminProviderState } from "@/components/admin/AdminProviderState";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageRepresentativeDirectory } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Invoice Verification | WriteX Admin",
  robots: { index: false, follow: false }
};

export default async function InvoiceVerificationPage() {
  const session = await requireAdminSession();
  if (!canManageRepresentativeDirectory(session)) notFound();
  return (
    <AdminShell
      session={session}
      eyebrow="Trust & Verification"
      title="Invoice verification"
      description="Operational readiness for customer-safe invoice verification. Public results remain unavailable until the approved LTS contract is active."
    >
      <AdminProviderState
        title="LTS invoice provider"
        status={process.env.TRUST_INVOICE_PROVIDER || "awaiting_connection"}
        description="The website adapter will expose only approved invoice state, date, currency, amount and payment status."
        requirements={[
          "Approved LTS invoice verification endpoint and server-to-server credentials",
          "Invoice and registered-mobile ownership test records",
          "Cancelled and superseded invoice-state mappings",
          "Cross-client denial and privacy tests"
        ]}
        actions={[
          { label: "View required API contract", href: "/admin/help" },
          { label: "Open Trust Centre", href: "/trust-centre" }
        ]}
      />
    </AdminShell>
  );
}
