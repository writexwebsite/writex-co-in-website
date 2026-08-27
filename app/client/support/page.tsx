import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { ClientPortalChrome } from "@/components/client/ClientPortalChrome";
import { requireInvoiceClientSession } from "@/lib/client/session";
import { getWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Client Support | WriteX",
  robots: { index: false, follow: false }
};

export default async function ClientSupportPage() {
  const session = await requireInvoiceClientSession();
  if (session.testSession) {
    return (
      <ClientPortalChrome
        session={session}
        eyebrow="Support"
        title="External actions are disabled"
      >
        <section className="rounded-lg border border-orange-200 bg-orange-50 p-6 text-orange-950 shadow-soft dark:border-orange-900 dark:bg-orange-950/35 dark:text-orange-100">
          <h2 className="text-lg font-semibold">Test-session safeguard</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6">
            WhatsApp, email, suspicious-report notifications, and other real
            customer actions are disabled for temporary Client Portal test
            sessions.
          </p>
          <Link
            href="/trust-centre"
            className="mt-5 inline-flex min-h-11 items-center rounded-md border border-current px-4 text-sm font-semibold"
          >
            Open Trust Centre
          </Link>
        </section>
      </ClientPortalChrome>
    );
  }

  return (
    <ClientPortalChrome
      session={session}
      eyebrow="Support"
      title="How can we help?"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SupportLink
          href={getWhatsAppUrl(
            `Hi WriteX, I need support for invoice ${session.invoiceId}.`
          )}
          label="Contact your representative"
          icon={MessageCircle}
          external
        />
        <SupportLink
          href="mailto:business@writex.co.in"
          label="Email business@writex.co.in"
          icon={Mail}
        />
        <SupportLink
          href="/trust-centre/report"
          label="Report suspicious activity"
          icon={ShieldCheck}
        />
      </div>
    </ClientPortalChrome>
  );
}

function SupportLink({
  href,
  label,
  icon: Icon,
  external = false
}: {
  href: string;
  label: string;
  icon: typeof Mail;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex min-h-36 flex-col justify-between rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft transition hover:border-wxViolet700"
    >
      <Icon className="h-6 w-6 text-wxViolet700" aria-hidden />
      <span className="mt-6 text-sm font-semibold">{label}</span>
    </Link>
  );
}
