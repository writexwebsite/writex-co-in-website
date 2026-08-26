import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AdminButton,
  AdminPanel,
  AdminStatus
} from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageClientPortal } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getS3Health } from "@/lib/storage/s3-health";

export const metadata: Metadata = {
  title: "Client Files | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function ClientFilesPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await requireAdminSession();
  if (!canManageClientPortal(session)) notFound();
  const { search = "" } = await searchParams;
  const s3 = await getS3Health({ force: true });
  return (
    <AdminShell
      session={session}
      eyebrow="Client Operations"
      title="Client files"
      description="Private client-facing files remain object-authorised. Raw S3 keys and permanent public URLs are never rendered."
      actions={<AdminButton href="/admin/storage">Storage health</AdminButton>}
    >
      <form action="/admin/client-portal/files" className="mb-5 flex gap-2 rounded-md border border-wxBorder bg-wxSurface p-4">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search document or reference</span>
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search invoice, document or file reference"
            className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900 outline-none focus:border-wxViolet700"
          />
        </label>
        <button type="submit" className="wx-gradient-action min-h-11 rounded-md px-4 text-sm font-semibold text-white">
          Search
        </button>
      </form>
      {search ? (
        <p className="mb-5 rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 py-3 text-sm text-wxIndigo600">
          Document search is scoped to reference <strong className="text-wxIndigo900">{search}</strong>. Results remain unavailable until the approved PMT file provider is connected.
        </p>
      ) : null}
      <AdminPanel
        title="Deliverable provider"
        description="PMT-backed deliverables stay unavailable until the approved file contract and ownership tests pass."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxIndigo500">
              Private S3
            </p>
            <div className="mt-3">
              <AdminStatus
                status={
                  s3.state === "configured_healthy" ? "healthy" : "review_required"
                }
              />
            </div>
          </div>
          <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxIndigo500">
              PMT deliverables
            </p>
            <div className="mt-3">
              <AdminStatus
                status={process.env.CLIENT_FILES_PROVIDER || "awaiting_connection"}
              />
            </div>
          </div>
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
