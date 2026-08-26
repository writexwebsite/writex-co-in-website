import type { Metadata } from "next";
import {
  Building2,
  CheckCircle2,
  FileWarning,
  Mail,
  ShieldCheck,
  ShieldX
} from "lucide-react";
import { CTAButton } from "@/components/CTAButton";
import { FinalCTA } from "@/components/FinalCTA";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { SectionHeader } from "@/components/SectionHeader";
import { RepresentativeVerificationForm } from "@/components/trust/RepresentativeVerificationForm";
import { TrustActionGrid } from "@/components/trust/TrustActionGrid";
import { TrustSystemVerificationForms } from "@/components/trust/TrustSystemVerificationForms";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { breadcrumbSchema } from "@/lib/schema";
import { absoluteUrl } from "@/lib/site";

const pageTitle =
  "WriteX Trust Centre™ | Verify Representatives, Invoices & Payments";
const pageDescription =
  "Verify official WriteX representatives, review invoice and payment guidance, confirm enquiries, and report suspicious activity securely.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: absoluteUrl("/trust-centre") },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: absoluteUrl("/trust-centre"),
    siteName: "WriteX",
    type: "website",
    images: [
      {
        url: absoluteUrl("/images/og/writex-home-og.png"),
        width: 1200,
        height: 630,
        alt: "WriteX Trust Centre"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [absoluteUrl("/images/og/writex-home-og.png")]
  }
};

const paymentChecks = [
  "The invoice was issued by WriteX.",
  "The invoice number and payable amount are correct.",
  "The beneficiary details exactly match the details printed on the invoice.",
  "The beneficiary reflects the WriteX company name or an expressly authorised Founder or Management account stated on the invoice.",
  "The payment request came through an official WriteX communication channel."
];

const neverPay = [
  "An employee’s personal bank account",
  "An employee’s personal UPI ID",
  "A QR code not printed on the invoice",
  "Payment details shared only through WhatsApp",
  "Changed payment instructions that have not been verified with WriteX"
];

const trustProtocol = [
  {
    title: "Representative",
    description: "Verify the exact mobile number before sharing information."
  },
  {
    title: "Official record",
    description: "Use verified invoice, payment, and enquiry records."
  },
  {
    title: "Protection",
    description: "Report suspicious activity through a secure WriteX channel."
  }
];

export default function TrustCentrePage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "WriteX Trust Centre™", path: "/trust-centre" }
        ])}
      />

      <PageHero
        eyebrow="WriteX Trust Centre™"
        title={
          <>
            Every Representative.
            <br />
            Every Invoice.
            <br />
            Every Payment.
            <br />
            Verified.
          </>
        }
        description="Verify who you are speaking with, confirm official records, review safe payment guidance, and report suspicious activity through one trusted WriteX hub."
        primaryCta="Verify Representative"
        primaryHref="#verify-representative"
        secondaryCta="Report Suspicious Activity"
        secondaryHref="/trust-centre/report"
        supportingCards={trustProtocol}
      />

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.24}
        className="py-10 sm:py-12"
      >
        <section className="premium-container">
          <SectionHeader
            eyebrow="Trust Hub quick actions"
            title="Choose what you need to verify"
            description="Use one focused check at a time. Services that are still being connected are labelled clearly and never return a fabricated result."
          />
          <TrustActionGrid />
        </section>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.2}
        className="border-t border-wxViolet700/10 py-10 sm:py-12"
      >
        <section
          id="verify-representative"
          className="premium-container scroll-mt-24"
        >
          <SectionHeader
            eyebrow="Live official directory check"
            title="Verify an Official WriteX Representative"
            description="Before sharing documents, project information, personal details, or making any payment, confirm the exact mobile number that contacted you."
          />
          <RepresentativeVerificationForm />
        </section>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.26}
        className="border-t border-wxViolet700/10 py-10 sm:py-12"
      >
        <section className="premium-container">
          <SectionHeader
            eyebrow="Official record checks"
            title="Invoice, payment, and enquiry verification"
            description="The public interfaces are ready, but they remain unavailable until their approved live LTS endpoints and credentials are connected."
          />
          <TrustSystemVerificationForms />
        </section>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.22}
        className="border-t border-wxViolet700/10 py-10 sm:py-12"
      >
        <section className="premium-container">
          <div className="grid gap-6 rounded-md border border-sageBorder bg-white p-6 shadow-soft lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-wxSurfaceSoft text-wxOrange500">
                <FileWarning className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-wxOrange500">
                  Secure reporting
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-wxIndigo900">
                  Something does not look right?
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-wxIndigo500">
                  Report an unknown representative, changed payment details,
                  fake invoice or QR code, brand impersonation, or suspicious
                  WhatsApp or email. Evidence is stored privately.
                </p>
              </div>
            </div>
            <CTAButton
              href="/trust-centre/report"
              icon={FileWarning}
              showArrow={false}
            >
              Report Suspicious Activity
            </CTAButton>
          </div>
        </section>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.2}
        className="border-t border-wxViolet700/10 py-10 sm:py-12"
      >
        <section
          id="payment-protection"
          className="premium-container scroll-mt-24"
        >
          <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
              <SectionHeader
                eyebrow="Payment protection"
                title="No Official Invoice. No Official Payment. No Exception."
                description="Only make payment using the bank account, UPI ID, payment link, QR code, or other payment instructions printed on your official WriteX invoice."
              />
              <CTAButton
                href="#verify-representative"
                variant="secondary"
                icon={ShieldCheck}
              >
                Verify Before You Pay
              </CTAButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-md border border-sageBorder bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxGreen500">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-charcoalInk">
                  Before paying, confirm that:
                </h3>
                <ul className="mt-4 grid gap-3 text-sm leading-6 text-slateText">
                  {paymentChecks.map((item) => (
                    <li key={item} className="flex gap-3">
                      <CheckCircle2
                        className="mt-1 h-4 w-4 shrink-0 text-wxGreen500"
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-md border border-wxOrange500/25 bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxOrange500">
                  <ShieldX className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-charcoalInk">
                  Never transfer money to:
                </h3>
                <ul className="mt-4 grid gap-3 text-sm leading-6 text-slateText">
                  {neverPay.map((item) => (
                    <li key={item} className="flex gap-3">
                      <ShieldX
                        className="mt-1 h-4 w-4 shrink-0 text-wxOrange500"
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-wxOrange500/25 bg-white p-5 shadow-sm">
            <p className="font-semibold leading-7 text-charcoalInk">
              If the payment details are not printed on your official WriteX
              invoice, do not make the payment.
            </p>
            <p className="mt-2 text-sm leading-7 text-slateText">
              If anyone asks you to pay to a different account after an invoice
              has been issued, stop immediately and verify with WriteX.
            </p>
          </div>
        </section>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.28}
        className="border-t border-wxViolet700/10 py-10 sm:py-12"
      >
        <div className="premium-container">
          <SectionHeader
            eyebrow="Verified contact"
            title="Official communication and brand protection"
            description="Use published WriteX channels and verify any representative or payment request before proceeding."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <section
              id="official-channels"
              className="scroll-mt-24 rounded-md border border-sageBorder bg-white p-6 shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxBlue500">
                <Building2 className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-5 text-2xl font-semibold text-charcoalInk">
                Official Communication Channels
              </h2>
              <dl className="mt-5 divide-y divide-wxBorder text-sm">
                <Channel
                  label="Website"
                  href="https://www.writex.co.in"
                  text="www.writex.co.in"
                />
                <Channel
                  label="Business enquiries"
                  href="mailto:business@writex.co.in"
                  text="business@writex.co.in"
                />
                <Channel
                  label="General enquiries"
                  href="mailto:info@writex.co.in"
                  text="info@writex.co.in"
                />
              </dl>
              <p className="mt-4 border-t border-wxBorder pt-4 text-sm leading-7 text-slateText">
                A number, email, QR code, payment request, or profile should not
                be treated as official merely because it displays the WriteX
                name or logo.
              </p>
            </section>

            <section className="rounded-md border border-sageBorder bg-white p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxPink500">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-5 text-2xl font-semibold text-charcoalInk">
                WriteX Brand Protection
              </h2>
              <p className="mt-3 text-sm leading-7 text-slateText">
                WriteX™ is a protected trademark. Unauthorised use of the
                WriteX name, logo, identity, representative status, invoices,
                or communication assets may result in investigation and legal
                action.
              </p>
              <blockquote className="mt-6 border-l-4 border-wxViolet700 bg-wxSurfaceSoft p-5 text-lg font-semibold leading-8 text-charcoalInk">
                Trust should never depend on assumptions.
                <br />
                Verification should never require guesswork.
              </blockquote>
              <CTAButton
                href="mailto:business@writex.co.in"
                variant="outline"
                icon={Mail}
                className="mt-6"
                showArrow={false}
              >
                business@writex.co.in
              </CTAButton>
            </section>
          </div>
        </div>
      </SpectrumBackground>

      <FinalCTA
        title="Verify before you share, approve, or pay."
        description="Use the official directory, published WriteX channels, and secure reporting whenever a conversation or payment instruction needs confirmation."
      />
    </>
  );
}

function Channel({
  label,
  href,
  text
}: {
  label: string;
  href: string;
  text: string;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="font-semibold text-charcoalInk">{label}</dt>
      <dd>
        <a
          href={href}
          className="font-medium text-wxViolet700 underline decoration-wxViolet700/25 underline-offset-4"
        >
          {text}
        </a>
      </dd>
    </div>
  );
}
