import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  getAdminPaymentEvents,
  paymentVerificationStatuses
} from "@/lib/admin/payments";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Payment Proof Review | WriteX Admin",
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

function formatAmount(value: string | number | null, currency?: string | null) {
  if (value === null || value === undefined || value === "") return "Not provided";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0
  }).format(Number(value));
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
  return `/admin/payments${query ? `?${query}` : ""}`;
}

export default async function AdminPaymentsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const resolvedParams = await searchParams;
  const page = Number(getParam(resolvedParams, "page") || 1);
  const status = getParam(resolvedParams, "status");
  const search = getParam(resolvedParams, "search");
  const data = await getAdminPaymentEvents({ page, pageSize: 20, status, search });

  return (
    <AdminShell
      session={session}
      eyebrow="Accounts workflow"
      title="Payment proof review"
    >
      <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
        <form className="flex flex-col gap-3 md:flex-row" action="/admin/payments">
          <label className="sr-only" htmlFor="search">
            Search payment proofs
          </label>
          <input
            id="search"
            name="search"
            defaultValue={data.search}
            placeholder="Search invoice, client, WhatsApp, or reference"
            className="min-h-11 flex-1 rounded-md border border-sageBorder px-3 py-2 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
          />
          {data.status ? <input type="hidden" name="status" value={data.status} /> : null}
          <button
            type="submit"
            className="rounded-md bg-academicEmerald px-4 py-2 text-sm font-bold text-white"
          >
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={buildUrl({ search: data.search })}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              data.status ? "bg-paleSage text-charcoalInk" : "bg-mutedCopper text-white"
            }`}
          >
            All
          </Link>
          {paymentVerificationStatuses.map((item) => (
            <Link
              key={item}
              href={buildUrl({ status: item, search: data.search })}
              className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${
                data.status === item
                  ? "bg-mutedCopper text-white"
                  : "bg-paleSage text-charcoalInk"
              }`}
            >
              {item.replace(/_/g, " ")}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-sageBorder bg-white shadow-soft">
        <div className="grid divide-y divide-sageBorder">
          {data.payments.length ? (
            data.payments.map((payment) => (
              <Link
                key={payment.id}
                href={`/admin/payments/${payment.id}`}
                className="wx-row-hover grid gap-3 p-5 hover:bg-paleSage/70 lg:grid-cols-[0.9fr_1fr_0.8fr_0.8fr]"
              >
                <div>
                  <p className="font-bold">{payment.invoice_id}</p>
                  <p className="mt-1 text-sm text-slateText">
                    {payment.client_name || "Client name unavailable"}
                  </p>
                  <p className="text-sm text-slateText">
                    {payment.whatsapp || "WhatsApp unavailable"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {formatAmount(payment.amount, payment.currency)}
                  </p>
                  <p className="mt-1 text-sm text-slateText">
                    {payment.payment_method || "Method not provided"}
                  </p>
                  <p className="text-sm text-slateText">
                    Ref: {payment.payment_reference || "Not provided"}
                  </p>
                </div>
                <div className="text-sm text-slateText">
                  <p>Submitted {formatDate(payment.created_at)}</p>
                  <p>Proof file: {payment.proof_file_asset_id ? "Yes" : "No"}</p>
                </div>
                <div>
                  <span className="inline-flex rounded-full bg-academicEmerald px-3 py-1 text-xs font-bold capitalize text-white">
                    {(payment.verification_status || "pending").replace(/_/g, " ")}
                  </span>
                  <p className="mt-3 text-sm text-slateText">
                    PMT: {payment.pmt_payment_status || "Unavailable"}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-6 text-sm text-slateText">
              No payment proof submissions match this view. New proofs will
              appear here after clients submit payment details.
            </div>
          )}
        </div>
      </section>

      {data.totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Payment pagination">
          <Link
            href={buildUrl({
              page: Math.max(1, data.page - 1),
              status: data.status,
              search: data.search
            })}
            className="rounded-md border border-sageBorder bg-white px-4 py-2 text-sm font-bold"
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
            className="rounded-md border border-sageBorder bg-white px-4 py-2 text-sm font-bold"
          >
            Next
          </Link>
        </nav>
      ) : null}
    </AdminShell>
  );
}
