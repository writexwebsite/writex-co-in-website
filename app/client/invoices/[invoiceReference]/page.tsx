import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientPortalChrome } from "@/components/client/ClientPortalChrome";
import { ClientEmptyState } from "@/components/client/ClientPortalPanels";
import { getClientInvoice } from "@/lib/client/portal-data";
import { requireInvoiceClientSession } from "@/lib/client/session";

export const metadata: Metadata = {
  title: "Invoice Details | WriteX",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function ClientInvoiceDetailPage({
  params
}: {
  params: Promise<{ invoiceReference: string }>;
}) {
  const session = await requireInvoiceClientSession();
  const { invoiceReference } = await params;
  const decodedReference = decodeURIComponent(invoiceReference);
  const invoice = await getClientInvoice(session, decodedReference);
  if (invoice === null) notFound();

  return (
    <ClientPortalChrome
      session={session}
      eyebrow="Billing & Order Overview"
      title={`Invoice ${decodedReference}`}
    >
      {invoice === "unavailable" ? (
        <ClientEmptyState
          title="Billing is being connected"
          message="Invoice details are temporarily unavailable. Your verified access remains active."
        />
      ) : (
        <article className="rounded-lg border border-wxBorder bg-wxSurface p-6 shadow-soft">
          <p
            className={`text-sm font-semibold ${
              session.testSession
                ? "text-orange-800 dark:text-orange-200"
                : "text-green-700 dark:text-green-300"
            }`}
          >
            {session.testSession
              ? "Sanitized test invoice"
              : "Verified by WriteX Trust Centre\u2122"}
          </p>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Invoice date", invoice.invoiceDate],
              ["Service", invoice.serviceDescription],
              ["Payment status", invoice.paymentStatus],
              ["Currency", invoice.currency],
              ["Due date", invoice.dueDate],
              ["Last updated", invoice.updatedAt]
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold text-wxIndigo500">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold">
                  {value || "Not available"}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      )}
    </ClientPortalChrome>
  );
}
