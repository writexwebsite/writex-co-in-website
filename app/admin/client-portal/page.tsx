import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ClientPortalOperations } from "@/components/admin/ClientPortalOperations";
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
  title: "Client Portal Operations | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function ClientPortalOperationsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await requireAdminSession();
  if (!canManageClientPortal(session)) notFound();
  const { search = "" } = await searchParams;
  await enforceDisabledClientPortalTestAccess();
  const summary = await getClientPortalOperationsSummary();
  const testAccessEnabled =
    process.env.CLIENT_PORTAL_TEST_ACCESS_ENABLED === "true";
  const initialTestAccessRecords =
    testAccessEnabled &&
    summary.databaseReady &&
    summary.testAccessDatabaseReady
      ? await listClientPortalTestAccess()
      : [];
  const initialTestAccessSummary: ClientTestAccessSummary =
    testAccessEnabled && summary.testAccessDatabaseReady
      ? await getClientPortalTestAccessSummary(initialTestAccessRecords)
      : { active: 0, used: 0, expired: 0, revoked: 0, activeSessions: 0 };
  return (
    <AdminShell
      session={session}
      eyebrow="Client Operations"
      title="Client Portal operations"
      description="Search approved client access, inspect sanitised provider health, control sessions and manage the client-facing view without altering source-system truth."
      nextAction={
        summary.failedLogins24h
          ? {
              label: "Review failed sign-ins",
              reason: `${summary.failedLogins24h} failed attempt${summary.failedLogins24h === 1 ? "" : "s"} were recorded in the last 24 hours.`,
              href: "/admin/client-portal/sessions"
            }
          : undefined
      }
    >
      <ClientPortalOperations
        summary={summary}
        testAccessEnabled={testAccessEnabled}
        initialTestAccessRecords={initialTestAccessRecords}
        initialTestAccessSummary={initialTestAccessSummary}
        initialSearch={search}
      />
    </AdminShell>
  );
}
