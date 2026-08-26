import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientPortalTestAccess } from "@/components/admin/ClientPortalTestAccess";
import { AdminProviderState } from "@/components/admin/AdminProviderState";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageClientPortal } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getClientPortalOperationsSummary } from "@/lib/client/admin-operations";
import {
  getClientPortalTestAccessSummary,
  listClientPortalTestAccess
} from "@/lib/client/test-access";
import type { ClientTestAccessSummary } from "@/lib/client/test-access-types";
import { enforceDisabledClientPortalTestAccess } from "@/lib/client/test-access-state";

export const metadata: Metadata = {
  title: "Temporary Client Testing | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function TemporaryTestingPage() {
  const session = await requireAdminSession();
  if (!canManageClientPortal(session)) notFound();
  await enforceDisabledClientPortalTestAccess();
  const summary = await getClientPortalOperationsSummary();
  const enabled = process.env.CLIENT_PORTAL_TEST_ACCESS_ENABLED === "true";
  const records =
    enabled && summary.databaseReady && summary.testAccessDatabaseReady
      ? await listClientPortalTestAccess()
      : [];
  const testSummary: ClientTestAccessSummary =
    enabled && summary.testAccessDatabaseReady
      ? await getClientPortalTestAccessSummary(records)
      : { active: 0, used: 0, expired: 0, revoked: 0, activeSessions: 0 };
  return (
    <AdminShell
      session={session}
      eyebrow="Client Operations"
      title="Temporary portal testing"
      description="Generate short-lived, single-use internal access for an approved test profile. This control is never shown on the public Client Login page."
      nextAction={
        enabled
          ? {
              label: "Launch a controlled test",
              reason: "Create access only for a documented internal QA purpose.",
              href: "#temporary-access"
            }
          : undefined
      }
    >
      {enabled ? (
        <div id="temporary-access">
          <ClientPortalTestAccess
            enabled
            databaseReady={
              summary.databaseReady && summary.testAccessDatabaseReady
            }
            initialRecords={records}
            initialSummary={testSummary}
          />
        </div>
      ) : (
        <AdminProviderState
          title="Temporary test access"
          status="inactive"
          description="Internal temporary access is disabled by production configuration."
          requirements={[
            "Explicit Super Admin approval",
            "Prepared test-access database migration",
            "A documented expiry and single-use policy"
          ]}
        />
      )}
    </AdminShell>
  );
}
