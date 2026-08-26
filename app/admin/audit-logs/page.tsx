import type { Metadata } from "next";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPanel } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAuditLogs } from "@/lib/admin/audit";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Audit Logs | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const session = await requireAdminSession();
  const logs = await getAuditLogs();
  return (
    <AdminShell
      session={session}
      eyebrow="System"
      title="Audit logs"
      description="Searchable security and operational history. Safe summaries replace raw JSON as the primary presentation."
    >
      <AdminPanel
        title="Recorded activity"
        description="Filter by actor, action or module. Sensitive values are not introduced into this browser view."
      >
        <AdminDataTable
          caption="Administrator audit logs"
          rows={logs.map((log) => ({
            id: log.id,
            timestamp: new Date(log.created_at).toISOString(),
            actor: log.actor_email || log.actor_type || "System",
            action: log.action,
            module: log.entity_type,
            severity:
              /failed|blocked|revoked|denied|deleted/i.test(log.action)
                ? "Action Required"
                : /approved|success|created|updated/i.test(log.action)
                  ? "Recorded"
                  : "Information",
            record: log.entity_id || "Not recorded",
            source: log.ip_address ? "Recorded network" : "System"
          }))}
          columns={[
            { key: "timestamp", label: "Time", type: "date" },
            { key: "actor", label: "Actor", primary: true },
            { key: "action", label: "Action" },
            { key: "module", label: "Module" },
            {
              key: "severity",
              label: "Severity",
              type: "status",
              defaultVisible: false
            },
            { key: "record", label: "Record" },
            { key: "source", label: "Source" }
          ]}
          filters={[
            { key: "module", label: "module" },
            { key: "action", label: "action" },
            { key: "actor", label: "user" },
            { key: "severity", label: "severity" },
            { key: "record", label: "record ID" },
            {
              key: "timestamp",
              label: "date",
              type: "date-range"
            }
          ]}
          searchPlaceholder="Search actor, action, module or record"
          canExport={session.role === "super_admin"}
        />
      </AdminPanel>
    </AdminShell>
  );
}
