import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminRevisions } from "@/lib/admin/revisions";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Revision Requests | WriteX Admin",
  robots: { index: false, follow: false }
};

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function AdminRevisionsPage() {
  const session = await requireAdminSession();
  const revisions = await getAdminRevisions();

  return (
    <AdminShell session={session} eyebrow="Operations queue" title="Revision requests">
      <section className="overflow-hidden rounded-lg border border-sageBorder bg-white shadow-soft">
        {revisions.length ? (
          <div className="divide-y divide-sageBorder">
            {revisions.map((revision) => (
              <Link
                key={revision.id}
                href={`/admin/revisions/${revision.id}`}
                className="wx-row-hover grid gap-3 p-5 hover:bg-paleSage/70 lg:grid-cols-[1fr_1fr_0.7fr_0.7fr]"
              >
                <div>
                  <p className="font-bold">{revision.request_type}</p>
                  <p className="mt-1 text-sm text-slateText">
                    Invoice {revision.invoice_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{revision.issue_category}</p>
                  <p className="mt-1 text-sm text-slateText">
                    {revision.related_section || "No section provided"}
                  </p>
                </div>
                <div className="text-sm">
                  <span className="rounded-full bg-paleSage px-3 py-1 font-bold capitalize text-charcoalInk">
                    {revision.priority}
                  </span>
                  <p className="mt-3 text-slateText">
                    File: {revision.file_asset_id ? "Yes" : "No"}
                  </p>
                </div>
                <div className="text-sm">
                  <span className="rounded-full bg-academicEmerald px-3 py-1 font-bold capitalize text-white">
                    {revision.status.replace(/_/g, " ")}
                  </span>
                  <p className="mt-3 text-slateText">{formatDate(revision.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-6 text-sm text-slateText">
            No revision requests have been submitted yet. Client review
            requests will appear here once submitted.
          </div>
        )}
      </section>
    </AdminShell>
  );
}
