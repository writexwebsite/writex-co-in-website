import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminFileButton } from "@/components/admin/AdminFileButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { LeadCrmPanel } from "@/components/admin/LeadCrmPanel";
import { LeadNoteForm } from "@/components/admin/LeadNoteForm";
import { LeadStatusForm } from "@/components/admin/LeadStatusForm";
import { LeadWhatsappButton } from "@/components/admin/LeadWhatsappButton";
import { getAdminLeadDetail, getAssignableAdminUsers } from "@/lib/admin/leads";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Lead Detail | WriteX Admin",
  robots: { index: false, follow: false }
};

function formatDateTime(value: string | Date | null) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatFileSize(value: number | null) {
  if (!value) return "Unknown size";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function detailRows(rows: Array<[string, string | number | null | undefined]>) {
  return rows.map(([label, value]) => (
    <div key={label} className="rounded-md bg-paleSage p-3">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slateText">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-charcoalInk">
        {value || "Not provided"}
      </dd>
    </div>
  ));
}

export default async function AdminLeadDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const { id } = await params;
  const [detail, owners] = await Promise.all([
    getAdminLeadDetail(id),
    getAssignableAdminUsers()
  ]);

  if (!detail) notFound();

  const { lead, notes, files, activity } = detail;

  return (
    <AdminShell session={session} eyebrow="Lead detail" title={lead.name}>
      <div className="mb-5">
        <Link
          href="/admin/leads"
          className="text-sm font-bold text-mutedCopper hover:underline"
        >
          Back to leads
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-bold">Client and request details</h2>
                <p className="mt-1 text-sm text-slateText">
                  Created {formatDateTime(lead.created_at)}
                </p>
              </div>
              <LeadWhatsappButton leadId={lead.id} />
            </div>
            <dl className="mt-5 grid gap-3 md:grid-cols-2">
              {detailRows([
                ["Email", lead.email],
                ["WhatsApp", lead.whatsapp],
                ["Country", lead.country],
                ["Service", lead.service_required],
                ["Academic level", lead.academic_level],
                ["Subject", lead.subject],
                ["Word count", lead.word_count],
                ["Deadline", lead.deadline ? formatDateTime(lead.deadline) : null],
                ["Urgency", lead.urgency],
                ["Document condition", lead.document_condition],
                ["Referencing style", lead.referencing_style],
                ["Source", lead.source],
                ["Source channel", lead.source_channel],
                ["Landing page", lead.landing_page],
                ["UTM source", lead.utm_source],
                ["UTM campaign", lead.utm_campaign],
                ["Assigned owner", lead.assigned_owner],
                ["Priority", lead.lead_priority],
                ["Lead quality", lead.lead_quality],
                ["Next follow-up", lead.next_follow_up_at ? formatDateTime(lead.next_follow_up_at) : null],
                ["Quoted amount", lead.quoted_amount ? `${lead.quoted_amount} ${lead.quoted_currency || ""}` : null],
                ["Converted amount", lead.converted_amount ? `${lead.converted_amount} ${lead.converted_currency || ""}` : null],
                ["Loss reason", lead.loss_reason]
              ])}
            </dl>
            <div className="mt-5 rounded-md border border-sageBorder bg-white p-4">
              <h3 className="text-sm font-bold">Instructions</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slateText">
                {lead.instructions || "No instructions provided."}
              </p>
            </div>
          </section>

          {lead.tool_type ? (
            <section className="rounded-lg border border-wxViolet700/20 bg-wxSurface p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-wxViolet700">Sales context</p>
              <h2 className="mt-2 text-xl font-bold text-wxIndigo900">Tool journey and recommended next step</h2>
              <dl className="mt-5 grid gap-3 md:grid-cols-2">
                {detailRows([
                  ["Tool used", lead.tool_type.replace(/_/g, " ")],
                  ["Template", lead.template_id],
                  ["Lead score", lead.lead_score],
                  ["Phone confidence", lead.phone_confidence],
                  ["Queue", lead.queue],
                  ["Download status", lead.download_status],
                  ["Main support need", lead.main_support_need],
                  ["Recommended service", lead.recommended_service],
                  ["SLA due", lead.sla_due_at ? formatDateTime(lead.sla_due_at) : null]
                ])}
              </dl>
              <div className="mt-4 rounded-md bg-wxSurfaceSoft p-4"><h3 className="text-sm font-bold text-wxIndigo900">Suggested first-contact message</h3><p className="mt-2 text-sm leading-6 text-wxIndigo500">{lead.suggested_first_contact_message || "Review the tool context before contacting this lead."}</p><p className="mt-2 text-xs text-wxIndigo400">This suggestion is never sent automatically.</p></div>
            </section>
          ) : null}

          <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Uploaded file metadata</h2>
            <div className="mt-5 space-y-3">
              {files.length ? (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="grid gap-3 rounded-md border border-sageBorder p-4 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="font-bold">{file.file_name}</p>
                      <p className="mt-1 text-sm text-slateText">
                        {file.asset_type} · {file.mime_type || "Unknown type"} ·{" "}
                        {formatFileSize(file.file_size)}
                      </p>
                      <p className="text-sm text-slateText">
                        Uploaded {formatDateTime(file.created_at)}
                      </p>
                    </div>
                    <AdminFileButton fileAssetId={file.id} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-slateText">
                  No S3 file asset is linked to this quote lead.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Lead intelligence</h2>
            <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-charcoalInk p-4 text-xs leading-5 text-white">
              {JSON.stringify(lead.lead_intelligence || {}, null, 2)}
            </pre>
          </section>
        </div>

        <aside className="space-y-6">
          <LeadStatusForm leadId={lead.id} currentStatus={lead.status} />
          <LeadCrmPanel
            leadId={lead.id}
            owners={owners}
            assignedTo={lead.assigned_to_admin_user_id}
            priority={lead.lead_priority}
            quality={lead.lead_quality}
            nextFollowUpAt={lead.next_follow_up_at}
            quotedAmount={lead.quoted_amount}
            quotedCurrency={lead.quoted_currency}
            lossReason={lead.loss_reason}
          />
          <LeadNoteForm leadId={lead.id} />
          <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
            <h2 className="text-lg font-bold">Internal notes</h2>
            <div className="mt-4 space-y-3">
              {notes.length ? (
                notes.map((note) => (
                  <article key={note.id} className="rounded-md bg-paleSage p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {note.note}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-slateText">
                      {note.admin_name || "Admin"} · {note.admin_role || "team"} ·{" "}
                      {formatDateTime(note.created_at)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slateText">No internal notes yet.</p>
              )}
            </div>
          </section>
          <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
            <h2 className="text-lg font-bold">Activity timeline</h2>
            <div className="mt-4 space-y-3">
              {activity.length ? (
                activity.map((item) => (
                  <article key={item.id} className="rounded-md bg-paleSage p-4">
                    <p className="text-sm font-bold capitalize">
                      {item.activity_type.replace(/_/g, " ")}
                    </p>
                    {item.note ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slateText">
                        {item.note}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs font-semibold text-slateText">
                      {item.admin_name || "System"} Â· {formatDateTime(item.created_at)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slateText">No CRM activity logged yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
