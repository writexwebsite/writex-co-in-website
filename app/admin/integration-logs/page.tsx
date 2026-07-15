import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getIntegrationLogs } from "@/lib/admin/audit";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Integration Logs | WriteX Admin",
  robots: { index: false, follow: false }
};

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function IntegrationLogsPage() {
  const session = await requireAdminSession();
  const logs = await getIntegrationLogs();

  return (
    <AdminShell session={session} eyebrow="System visibility" title="Integration logs">
      <section className="overflow-hidden rounded-lg border border-sageBorder bg-white shadow-soft">
        {logs.length ? (
          <div className="divide-y divide-sageBorder">
            {logs.map((log) => (
              <article
                key={log.id}
                className="grid gap-3 p-5 text-sm lg:grid-cols-[0.6fr_1fr_0.7fr_1fr]"
              >
                <div>
                  <p className="font-bold">{log.system}</p>
                  <p className="mt-1 text-slateText">{formatDate(log.created_at)}</p>
                </div>
                <div>
                  <p className="font-semibold">{log.endpoint}</p>
                  <p className="mt-1 text-slateText">{log.request_id || "No request ID"}</p>
                </div>
                <span className="h-fit rounded-full bg-paleSage px-3 py-1 font-bold capitalize">
                  {log.status}
                </span>
                <p className="text-slateText">{log.error_message || "No error summary"}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-slateText">
            No integration logs are available yet.
          </p>
        )}
      </section>
    </AdminShell>
  );
}
