import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ClientPortalChrome } from "@/components/client/ClientPortalChrome";
import { ClientEmptyState } from "@/components/client/ClientPortalPanels";
import { getClientInvoices } from "@/lib/client/portal-data";
import { requireClientSession } from "@/lib/client/session";

export const metadata: Metadata = {
  title: "Billing & Orders | WriteX",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function ClientInvoicesPage() {
  const session = await requireClientSession();
  const result = await getClientInvoices(session);

  return (
    <ClientPortalChrome
      session={session}
      eyebrow="Billing & Order Overview"
      title="Invoices"
    >
      {result.state !== "available" ? (
        <ClientEmptyState
          title={
            result.state === "unavailable"
              ? "Billing is being connected"
              : "No invoices available"
          }
          message={result.message || "No billing records are available."}
        />
      ) : (
        <div className="grid gap-4">
          {result.invoices.map((invoice) => (
            <article
              key={invoice.invoiceReference}
              className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    {session.testSession
                      ? "Sanitized test invoice"
                      : "Verified by WriteX Trust Centre\u2122"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {invoice.invoiceReference}
                  </h2>
                  <p className="mt-1 text-sm text-wxIndigo500">
                    {invoice.serviceDescription || "WriteX order"}
                  </p>
                </div>
                <Link
                  href={`/client/invoices/${encodeURIComponent(invoice.invoiceReference)}`}
                  className="inline-flex min-h-11 items-center gap-2 self-start rounded-md border border-wxBorder px-4 text-sm font-semibold"
                >
                  View invoice <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </ClientPortalChrome>
  );
}
