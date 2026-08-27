import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ClientPortalChrome } from "@/components/client/ClientPortalChrome";
import { getClientPortalOverview } from "@/lib/client/portal-data";
import { requireInvoiceClientSession } from "@/lib/client/session";

export const metadata: Metadata = {
  title: "Trust & Safety | WriteX",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function ClientSecurityPage() {
  const session = await requireInvoiceClientSession();
  const overview = await getClientPortalOverview(session);
  return (
    <ClientPortalChrome
      session={session}
      eyebrow="Trust & Verification"
      title="Verified access and safe payment"
    >
      <section className="rounded-lg border border-wxBorder bg-wxSurface p-6 shadow-soft">
        <ShieldCheck className="h-8 w-8 text-wxViolet700" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold">
          {session.testSession ? "Test access active" : "Invoice Verified"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-wxIndigo500">
          {session.testSession
            ? "This temporary session is scoped to one sanitized test client and invoice. It is not an LTS invoice verification."
            : "Your current portal session was created only after WriteX verified the invoice and registered mobile together."}
        </p>
        {overview.trust.verificationReference ? (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-wxIndigo500">
                Verification ID
              </dt>
              <dd className="mt-1 font-semibold">
                {overview.trust.verificationReference}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-wxIndigo500">
                Last verified
              </dt>
              <dd className="mt-1 font-semibold">
                {overview.trust.lastVerifiedAt
                  ? new Date(overview.trust.lastVerifiedAt).toLocaleString(
                      "en-IN"
                    )
                  : "This session"}
              </dd>
            </div>
          </dl>
        ) : null}
        <p className="mt-5 rounded-md border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-900 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
          {overview.trust.safePaymentNotice}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="wx-gradient-action inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold text-white" href="/trust-centre">
            Open Trust Centre
          </Link>
          {!session.testSession ? (
            <Link className="inline-flex min-h-11 items-center rounded-md border border-wxBorder px-4 text-sm font-semibold" href="/trust-centre/report">
              Report Suspicious Activity
            </Link>
          ) : null}
        </div>
      </section>
    </ClientPortalChrome>
  );
}
