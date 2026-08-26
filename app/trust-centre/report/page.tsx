import type { Metadata } from "next";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { SectionHeader } from "@/components/SectionHeader";
import { SuspiciousActivityReportForm } from "@/components/trust/SuspiciousActivityReportForm";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { breadcrumbSchema } from "@/lib/schema";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Report Suspicious Activity | WriteX Trust Centre™",
  description:
    "Report suspicious WriteX representatives, invoices, payment requests, QR codes, emails, or brand impersonation securely.",
  robots: { index: false, follow: false },
  alternates: { canonical: absoluteUrl("/trust-centre/report") }
};

export default function TrustCentreReportPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "WriteX Trust Centre™", path: "/trust-centre" },
          { name: "Report Suspicious Activity", path: "/trust-centre/report" }
        ])}
      />
      <PageHero
        eyebrow="WriteX Trust Centre™"
        title="Report suspicious activity securely."
        description="Send suspicious contact details, invoice or enquiry references, and optional evidence to the WriteX management team."
        primaryCta="Start Secure Report"
        primaryHref="#report-form"
        secondaryCta="Return to Trust Centre"
        secondaryHref="/trust-centre"
        supportingCards={[
          {
            title: "Private evidence",
            description:
              "Attachments are stored privately and are never given a public URL."
          },
          {
            title: "Tracked reference",
            description:
              "A unique WriteX fraud-report reference is issued after acceptance."
          }
        ]}
      />

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.25}
        className="py-10 sm:py-12"
      >
        <section id="report-form" className="premium-container scroll-mt-24">
          <SectionHeader
            eyebrow="Secure report"
            title="Share what happened"
            description="Provide only information relevant to the suspicious activity. Do not include passwords, OTPs, banking credentials, or card details."
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
            <SuspiciousActivityReportForm />
            <aside className="grid gap-4">
              <div className="rounded-md border border-sageBorder bg-white p-5 shadow-sm">
                <LockKeyhole
                  className="h-6 w-6 text-wxViolet700"
                  aria-hidden
                />
                <h2 className="mt-4 text-lg font-semibold text-wxIndigo900">
                  Evidence protection
                </h2>
                <p className="mt-2 text-sm leading-6 text-wxIndigo500">
                  Supported evidence is validated, stored in private S3, and
                  accessible only through expiring internal access.
                </p>
              </div>
              <div className="rounded-md border border-sageBorder bg-white p-5 shadow-sm">
                <ShieldCheck
                  className="h-6 w-6 text-wxGreen500"
                  aria-hidden
                />
                <h2 className="mt-4 text-lg font-semibold text-wxIndigo900">
                  Immediate safety
                </h2>
                <p className="mt-2 text-sm leading-6 text-wxIndigo500">
                  Do not make a payment or share additional information while
                  the request is being verified.
                </p>
              </div>
              <a
                href="mailto:business@writex.co.in"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-wxBorder bg-white px-4 text-sm font-semibold text-wxIndigo900"
              >
                <Mail className="h-4 w-4" aria-hidden />
                business@writex.co.in
              </a>
            </aside>
          </div>
        </section>
      </SpectrumBackground>
    </>
  );
}
