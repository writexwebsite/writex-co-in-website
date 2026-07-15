import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { getAdminLeadList, leadStatuses } from "@/lib/admin/leads";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Quote Leads | WriteX Admin",
  robots: { index: false, follow: false }
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | Date | null) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function buildUrl({
  page,
  status,
  search
}: {
  page?: number;
  status?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (page && page > 1) params.set("page", String(page));
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  const query = params.toString();
  return `/admin/leads${query ? `?${query}` : ""}`;
}

function buildLeadWhatsAppUrl(whatsapp: string, message: string) {
  const phone = whatsapp.replace(/[^\d]/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default async function AdminLeadsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const resolvedParams = await searchParams;
  const page = Number(getParam(resolvedParams, "page") || 1);
  const status = getParam(resolvedParams, "status");
  const search = getParam(resolvedParams, "search");
  const data = await getAdminLeadList({ page, pageSize: 20, status, search });

  return (
    <AdminShell session={session} eyebrow="Lead intake" title="Quote leads">
      <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
        <form className="flex flex-col gap-3 md:flex-row" action="/admin/leads">
          <label className="sr-only" htmlFor="search">
            Search leads
          </label>
          <input
            id="search"
            name="search"
            defaultValue={data.search}
            placeholder="Search name, WhatsApp, email, service, or subject"
            className="min-h-11 flex-1 rounded-md border border-sageBorder px-3 py-2 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
          />
          {data.status ? (
            <input type="hidden" name="status" value={data.status} />
          ) : null}
          <button
            type="submit"
            className="rounded-md bg-academicEmerald px-4 py-2 text-sm font-bold text-white"
          >
            Search
          </button>
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={buildUrl({ search: data.search })}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              data.status
                ? "bg-paleSage text-charcoalInk"
                : "bg-mutedCopper text-white"
            }`}
          >
            All
          </Link>
          {leadStatuses.map((item) => (
            <Link
              key={item}
              href={buildUrl({ status: item, search: data.search })}
              className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${
                data.status === item
                  ? "bg-mutedCopper text-white"
                  : "bg-paleSage text-charcoalInk"
              }`}
            >
              {item}
            </Link>
          ))}
          <Link
            href="/api/admin/leads/export.csv"
            className="ml-auto rounded-md border border-sageBorder bg-white px-3 py-2 text-sm font-semibold text-charcoalInk"
          >
            Export CSV
          </Link>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-sageBorder bg-white shadow-soft">
        <div className="grid grid-cols-1 divide-y divide-sageBorder">
          {data.leads.length ? (
            data.leads.map((lead) => (
              <article
                key={lead.id}
                className="wx-row-hover grid gap-3 p-5 hover:bg-paleSage/70 lg:grid-cols-[1.1fr_1fr_0.8fr_0.8fr]"
              >
                <div>
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="font-bold text-charcoalInk hover:underline"
                  >
                    {lead.name}
                  </Link>
                  <p className="mt-1 text-sm text-slateText">{lead.whatsapp}</p>
                  {lead.email ? (
                    <p className="text-sm text-slateText">{lead.email}</p>
                  ) : null}
                  <a
                    href={buildLeadWhatsAppUrl(
                      lead.whatsapp,
                      `Hi ${lead.name}, this is WriteX. We are reviewing your quote request for ${lead.service_required}.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-md bg-mutedCopper px-3 py-2 text-xs font-bold text-white"
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                </div>
                <div>
                  <p className="text-sm font-bold">{lead.service_required}</p>
                  <p className="mt-1 text-sm text-slateText">
                    {lead.subject || "Subject not provided"}
                  </p>
                  <p className="text-sm text-slateText">
                    {lead.academic_level || "Level not provided"}
                  </p>
                </div>
                <div className="text-sm text-slateText">
                  <p>Deadline: {formatDate(lead.deadline)}</p>
                  <p>Word count: {lead.word_count || "Not provided"}</p>
                  <p>File: {lead.uploaded_file_name ? "Yes" : "No"}</p>
                  <p>Owner: {lead.assigned_owner || "Unassigned"}</p>
                </div>
                <div className="text-sm">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-academicEmerald px-3 py-1 text-xs font-bold capitalize text-white">
                      {lead.status}
                    </span>
                    <span className="inline-flex rounded-full bg-paleSage px-3 py-1 text-xs font-bold capitalize text-charcoalInk">
                      {lead.lead_priority}
                    </span>
                    <span className="inline-flex rounded-full bg-paleSage px-3 py-1 text-xs font-bold capitalize text-charcoalInk">
                      {lead.lead_quality}
                    </span>
                  </div>
                  {lead.next_follow_up_at ? (
                    <p className="mt-3 text-slateText">
                      Follow-up: {formatDate(lead.next_follow_up_at)}
                    </p>
                  ) : null}
                  <p className="mt-3 text-slateText">{formatDate(lead.created_at)}</p>
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="mt-3 inline-flex rounded-md border border-sageBorder bg-white px-3 py-2 text-xs font-bold text-charcoalInk"
                  >
                    Open lead
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="p-6 text-sm text-slateText">
              No quote leads match this view.
            </div>
          )}
        </div>
      </section>

      {data.totalPages > 1 ? (
        <nav
          aria-label="Lead pagination"
          className="mt-6 flex items-center justify-between gap-3"
        >
          <Link
            href={buildUrl({
              page: Math.max(1, data.page - 1),
              status: data.status,
              search: data.search
            })}
            className="rounded-md border border-sageBorder bg-white px-4 py-2 text-sm font-bold text-charcoalInk"
          >
            Previous
          </Link>
          <p className="text-sm text-slateText">
            Page {data.page} of {data.totalPages}
          </p>
          <Link
            href={buildUrl({
              page: Math.min(data.totalPages, data.page + 1),
              status: data.status,
              search: data.search
            })}
            className="rounded-md border border-sageBorder bg-white px-4 py-2 text-sm font-bold text-charcoalInk"
          >
            Next
          </Link>
        </nav>
      ) : null}
    </AdminShell>
  );
}
