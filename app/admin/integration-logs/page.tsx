import type { Metadata } from "next";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPanel } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { getIntegrationLogs } from "@/lib/admin/audit";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Integrations | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function IntegrationLogsPage() {
  const session = await requireAdminSession();
  const logs = await getIntegrationLogs();
  return (
    <AdminShell
      session={session}
      eyebrow="System"
      title="Integrations"
      description="Sanitised provider activity for LTS, PMT, HRMS, storage, email and Trust Centre workflows."
    >
      <AdminPanel
        title="Provider activity"
        description="Correlation references and safe error summaries are shown without credentials or raw external payloads."
      >
        <AdminDataTable
          caption="Integration activity"
          rows={logs.map((log) => ({
            id: log.id,
            system: log.system,
            endpoint: log.endpoint,
            status: log.status,
            reference: log.request_id || "Not recorded",
            summary: log.error_message || "No error reported",
            timestamp: new Date(log.created_at).toISOString()
          }))}
          columns={[
            { key: "system", label: "System", primary: true },
            { key: "endpoint", label: "Operation" },
            { key: "status", label: "Status", type: "status" },
            { key: "reference", label: "Correlation reference" },
            { key: "summary", label: "Safe summary" },
            { key: "timestamp", label: "Checked", type: "date" }
          ]}
          filterKey="system"
          filterLabel="System"
          searchPlaceholder="Search system, operation or correlation reference"
        />
      </AdminPanel>
    </AdminShell>
  );
}
