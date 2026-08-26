import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { SectionHeader } from "@/components/SectionHeader";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { breadcrumbSchema } from "@/lib/schema";
import { academicIntegrityDisclaimer, buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions",
  description:
    "Terms governing WriteX academic support enquiries, scope-based quotes, student responsibilities, revisions, files, and responsible service use.",
  path: "/terms"
});

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Terms & Conditions", path: "/terms" }
        ])}
      />
      <PageHero
        eyebrow="Terms"
        title="Terms for clear, responsible support"
        description="These terms explain scope confirmation, student responsibilities, file accuracy, revisions, pricing, and responsible use of WriteX services."
        primaryCta="Get Quote"
        secondaryCta="Contact Support"
      />
      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.2}
        className="py-10 sm:py-12"
      >
        <div className="premium-container">
          <SectionHeader
            title="Service terms and responsibilities"
            description={academicIntegrityDisclaimer}
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              [
                "Nature of support",
                "WriteX provides academic support, research guidance, editing, proofreading, formatting, referencing, originality review, and learning-focused assistance."
              ],
              [
                "Scope confirmation",
                "Quotes are based on the files, instructions, word count, academic level, service type, and deadline shared by the student."
              ],
              [
                "Student responsibility",
                "Students are responsible for following institutional rules, supervisor instructions, citation requirements, and submission policies."
              ],
              [
                "Quotes and payment",
                "A quote is valid for the stated scope and timing. Work starts only after the required scope and payment arrangements are confirmed."
              ],
              [
                "File accuracy",
                "Students should provide accurate briefs, rubrics, drafts, lectures, information and formatting requirements before work begins."
              ],
              [
                "File delivery and client access",
                "Delivery method, preview access, and download availability depend on the confirmed service workflow and applicable payment state. Access details must be kept private."
              ],
              [
                "Confidentiality",
                "WriteX handles briefs, drafts, account information, and support communications through authorised workflows. Users must also protect their access credentials."
              ],
              [
                "Intellectual property",
                "Users must have the right to share submitted material. Third-party sources, institutional content, and supplied documents remain subject to their existing rights."
              ],
              [
                "Acceptable use",
                "Services and systems must not be used for unlawful activity, impersonation, unauthorised access, abuse, or requests that conflict with responsible academic support."
              ],
              [
                "Limitation of liability",
                "WriteX does not guarantee marks, admissions decisions, institutional acceptance, platform scores, or outcomes controlled by third parties."
              ],
              [
                "Governing law",
                "These terms are governed by applicable laws in India, subject to any mandatory consumer protections that apply to the user."
              ],
              [
                "Contact",
                "Questions about scope, accounts, payments, or these terms can be sent through the WriteX contact page or to info@writex.co.in."
              ]
            ].map(([title, description]) => (
              <article
                key={title}
                className="rounded-md border border-sageBorder bg-paleSage p-6"
              >
                <h2 className="text-lg font-semibold text-charcoalInk">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slateText">
                  {description}
                </p>
              </article>
            ))}
          </div>
          <section id="payment-cancellation-revisions-disputes" className="mt-7 scroll-mt-28 rounded-md border border-wxBorder bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-2xl font-semibold text-wxIndigo900">Payment, Cancellation, Revisions, and Disputes</h2>
            <div className="mt-5 grid gap-5 text-sm leading-7 text-wxIndigo500 md:grid-cols-2">
              <p><strong className="text-wxIndigo700">Payment:</strong> payment timing and any balance requirements are confirmed with the quote or support scope.</p>
              <p><strong className="text-wxIndigo700">Cancellation:</strong> cancellation requests are reviewed against the confirmed scope, work already completed, committed specialist time, and delivery status.</p>
              <p><strong className="text-wxIndigo700">Revisions:</strong> revision requests are assessed against the original brief and agreed instructions. New requirements may need a revised scope and quote.</p>
              <p><strong className="text-wxIndigo700">Disputes:</strong> users should contact WriteX promptly with the invoice or project reference and a clear description so the record can be reviewed.</p>
            </div>
          </section>
          <p className="mt-7 text-sm leading-7 text-wxIndigo500">
            Read the dedicated <Link href="/academic-integrity" className="font-semibold text-wxViolet700 hover:text-wxPink500">Academic Integrity Policy</Link> for responsible-use conditions.
          </p>
        </div>
      </SpectrumBackground>
    </>
  );
}
