import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAuditLogs } from "@/lib/admin/audit";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Audit Logs | WriteX Admin",
  robots: { index: false, follow: false }
};

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function AuditLogsPage() {
  const session = await requireAdminSession();
  const logs = await getAuditLogs();

  return (
    <AdminShell session={session} eyebrow="Security visibility" title="Audit logs">
      <section className="overflow-hidden rounded-lg border border-sageBorder bg-white shadow-soft">
        {logs.length ? (
          <div className="divide-y divide-sageBorder">
            {logs.map((log) => (
              <article
                key={log.id}
                className="grid gap-3 p-5 text-sm lg:grid-cols-[0.75fr_0.7fr_1fr_0.8fr]"
              >
                <div>
                  <p className="font-bold">{formatDate(log.created_at)}</p>
                  <p className="mt-1 text-slateText">{log.ip_address || "No IP"}</p>
                </div>
                <div>
                  <p className="font-semibold capitalize">{log.actor_type}</p>
                  <p className="mt-1 text-slateText">{log.actor_email || "System/client"}</p>
                </div>
                <div>
                  <p className="font-bold">{log.action}</p>
                  <p className="mt-1 text-slateText">
                    {log.entity_type} {log.entity_id || ""}
                  </p>
                </div>
                <pre className="max-h-24 overflow-auto rounded-md bg-paleSage p-2 text-xs text-slateText">
                  {JSON.stringify(log.metadata || {}, null, 2)}
                </pre>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-slateText">No audit logs are available yet.</p>
        )}
      </section>
    </AdminShell>
  );
}
