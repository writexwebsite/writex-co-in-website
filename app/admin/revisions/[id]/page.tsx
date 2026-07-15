import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminFileButton } from "@/components/admin/AdminFileButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { RevisionStatusForm } from "@/components/admin/RevisionStatusForm";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { getAdminRevision } from "@/lib/admin/revisions";
import { requireAdminSession } from "@/lib/admin/session";
import { getWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Revision Detail | WriteX Admin",
  robots: { index: false, follow: false }
};

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function AdminRevisionDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const { id } = await params;
  const revision = await getAdminRevision(id);

  if (!revision) notFound();

  return (
    <AdminShell
      session={session}
      eyebrow="Revision detail"
      title={`Invoice ${revision.invoice_id}`}
    >
      <div className="mb-5">
        <Link href="/admin/revisions" className="text-sm font-bold text-mutedCopper hover:underline">
          Back to revisions
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-bold">{revision.request_type}</h2>
                <p className="mt-1 text-sm text-slateText">
                  Submitted {formatDate(revision.created_at)}
                </p>
              </div>
              <a
                href={getWhatsAppUrl(
                  `Hi WriteX, I am reviewing revision request ${revision.id} for invoice ${revision.invoice_id}.`
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-mutedCopper px-4 py-2 text-sm font-bold text-white"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp contact
              </a>
            </div>
            <dl className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                ["Issue category", revision.issue_category],
                ["Related section", revision.related_section],
                ["Priority", revision.priority],
                ["Status", revision.status.replace(/_/g, " ")],
                ["Client", revision.client_name],
                ["WhatsApp", revision.whatsapp],
                ["LTS sync", revision.lts_event_id || "Deferred/not available"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-paleSage p-3">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slateText">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-charcoalInk">
                    {value || "Not provided"}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 rounded-md border border-sageBorder p-4">
              <h3 className="text-sm font-bold">Client message</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slateText">
                {revision.message}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Attachment</h2>
            {revision.file_asset_id ? (
              <div className="mt-4 grid gap-3 rounded-md border border-sageBorder p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-bold">{revision.file_name || "Revision attachment"}</p>
                  <p className="mt-1 text-sm text-slateText">
                    {revision.mime_type || "Unknown file type"}
                  </p>
                </div>
                <AdminFileButton fileAssetId={revision.file_asset_id} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-slateText">
                No attachment was uploaded with this request.
              </p>
            )}
          </section>
        </div>
        <aside>
          <RevisionStatusForm
            revisionId={revision.id}
            currentStatus={revision.status}
            currentNote={revision.internal_note}
          />
        </aside>
      </div>
    </AdminShell>
  );
}
