import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminButton } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { RepresentativeDirectoryControl } from "@/components/admin/RepresentativeDirectoryControl";
import { canManageRepresentativeDirectory } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { listRepresentativesForAdmin } from "@/lib/trust/representative-admin";
import { getRepresentativeSyncStatus } from "@/lib/trust/representative-sync-status";

export const metadata: Metadata = {
  title: "Representative Directory | WriteX Admin",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function AdminRepresentativesPage() {
  const session = await requireAdminSession();
  if (!canManageRepresentativeDirectory(session)) notFound();

  const [status, representatives] = await Promise.all([
    getRepresentativeSyncStatus(),
    listRepresentativesForAdmin()
  ]);

  return (
    <AdminShell
      session={session}
      eyebrow="Trust & Verification"
      title="Representative directory"
      description="Synchronise approved LTS representatives, review public display names and manage masked official-number status without exposing employee data."
      actions={
        <AdminButton href="/trust-centre" tone="primary">
          Open public verification
        </AdminButton>
      }
      nextAction={
        status.safeFailureReason
          ? {
              label: "Retry failed sync",
              reason: "The last successful directory remains active while the source issue is reviewed.",
              href: "#representative-directory"
            }
          : undefined
      }
    >
      <div id="representative-directory">
        <RepresentativeDirectoryControl
          initialStatus={status}
          initialRepresentatives={representatives}
        />
      </div>
    </AdminShell>
  );
}
