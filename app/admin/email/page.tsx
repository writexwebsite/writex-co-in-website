import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminProviderState } from "@/components/admin/AdminProviderState";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/lib/admin/session";
import { isEmailConfigured } from "@/lib/notifications";

export const metadata: Metadata = {
  title: "Email Delivery | WriteX Admin",
  robots: { index: false, follow: false }
};

export default async function EmailPage() {
  const session = await requireAdminSession();
  if (session.role !== "super_admin") notFound();
  const configured = isEmailConfigured();
  return (
    <AdminShell
      session={session}
      eyebrow="System"
      title="Email delivery"
      description="Sanitised Amazon SES readiness for customer acknowledgements and operational notifications."
    >
      <AdminProviderState
        title="Amazon SES"
        status={configured ? "configured" : "awaiting_connection"}
        description="Sender identities, recipient addresses and message payloads are not displayed on this status page."
        requirements={[
          "Verified sender domain and production SES access",
          "Protected SMTP credentials in the shared production environment",
          "Delivery, bounce and complaint monitoring",
          "Contact, quote and suspicious-report delivery tests"
        ]}
        actions={[
          { label: "Open integration logs", href: "/admin/integration-logs" },
          { label: "Open system health", href: "/admin/system-health" }
        ]}
      />
    </AdminShell>
  );
}
