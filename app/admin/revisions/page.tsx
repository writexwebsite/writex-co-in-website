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

export default async function AdminRevisionsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await requireAdminSession();
  const revisions = await getAdminRevisions();
  const { search = "" } = await searchParams;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRevisions = normalizedSearch
    ? revisions.filter((revision) =>
        [
          revision.invoice_id,
          revision.request_type,
          revision.issue_category,
          revision.related_section,
          revision.status
        ].some((value) =>
          String(value || "").toLowerCase().includes(normalizedSearch)
        )
      )
    : revisions;

  return (
    <AdminShell session={session} eyebrow="Operations queue" title="Revision requests">
      <form action="/admin/revisions" className="mb-5 flex gap-2 rounded-md border border-wxBorder bg-wxSurface p-4">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search requests or order references</span>
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search invoice, request, issue or status"
            className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900 outline-none focus:border-wxViolet700"
          />
        </label>
        <button type="submit" className="wx-gradient-action min-h-11 rounded-md px-4 text-sm font-semibold text-white">
          Search
        </button>
      </form>
      <section className="overflow-hidden rounded-lg border border-sageBorder bg-white shadow-soft">
        {filteredRevisions.length ? (
          <div className="divide-y divide-sageBorder">
            {filteredRevisions.map((revision) => (
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
            {normalizedSearch
              ? "No request matches this search."
              : "No revision requests have been submitted yet. Client review requests will appear here once submitted."}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
