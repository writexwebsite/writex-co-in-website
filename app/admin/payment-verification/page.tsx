import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminProviderState } from "@/components/admin/AdminProviderState";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageRepresentativeDirectory } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Payment Verification | WriteX Admin",
  robots: { index: false, follow: false }
};

export default async function PaymentVerificationPage() {
  const session = await requireAdminSession();
  if (!canManageRepresentativeDirectory(session)) notFound();
  return (
    <AdminShell
      session={session}
      eyebrow="Trust & Verification"
      title="Payment verification"
      description="Safe payment-state verification without exposing bank details, proof files or settlement payloads."
    >
      <AdminProviderState
        title="LTS payment provider"
        status={process.env.TRUST_PAYMENT_PROVIDER || "awaiting_connection"}
        description="The configured adapter will provide customer-safe payment status, paid amount, balance, currency and last recorded payment date."
        requirements={[
          "Approved LTS payment-status endpoint and credentials",
          "Pending, partial, paid, cancelled, refunded and review mappings",
          "Invoice ownership and cross-client denial tests",
          "No bank, instrument or payment-proof fields in the public response"
        ]}
        actions={[
          { label: "View required API contract", href: "/admin/help" },
          { label: "Review payment proofs", href: "/admin/payments" }
        ]}
      />
    </AdminShell>
  );
}
