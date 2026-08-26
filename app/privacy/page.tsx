import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { SectionHeader } from "@/components/SectionHeader";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy and Data Handling",
  description:
    "Privacy policy for WriteX academic support enquiries, quote requests, file handling, contact details, and communication preferences.",
  path: "/privacy"
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy" }
        ])}
      />
      <PageHero
        eyebrow="Privacy"
        title="Privacy policy for academic support enquiries"
        description="A practical privacy page for quote requests, uploaded briefs, contact details, and service communication."
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
            title="How enquiry information is handled"
            description="WriteX uses enquiry details to review scope, communicate clearly, and handle academic support requests through a private workflow."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              [
                "Information collected",
                "Name, email, WhatsApp number, country, academic level, service type, subject, deadline, uploaded files, and instructions submitted for quote scoping."
              ],
              [
                "Quote-form data",
                "Quote details are used to assess scope, feasibility, timing, specialist requirements, and the next appropriate support step."
              ],
              [
                "WhatsApp and contact data",
                "Messages and contact details are used to respond to enquiries, clarify requirements, and maintain service communication."
              ],
              [
                "File uploads",
                "Briefs, rubrics, drafts, and supporting files are handled for scope review, delivery, quality checks, and authorised support communication."
              ],
              [
                "Client Portal data",
                "Workspace records may include service status, files, payment state, revision requests, updates, and support correspondence linked to the client account."
              ],
              [
                "Employee Login data",
                "Employee authentication and activity records may be processed to control role-based access, protect internal systems, and maintain operational accountability."
              ],
              [
                "Careers and hiring data",
                "Candidate applications may include contact details, qualifications, work history, availability, role answers, relationship disclosures, private files, interview records, assessment responses, and consent records. These are used for human-reviewed recruitment and security operations."
              ],
              [
                "Assessment monitoring",
                "Candidate-specific assessments may record autosave, timing, copy or paste attempts, focus changes, reconnects, and similar integrity events. These signals support human review and do not cause automatic rejection by themselves."
              ],
              [
                "Candidate verification",
                "With appropriate consent, authorised reviewers may assess identity, education, employment, reference, or background evidence. A manual review is not presented as electronic, police, or government verification unless an approved provider supplies that exact result."
              ],
              [
                "Hiring retention and deletion",
                "Candidate records receive an operational review date based on whether the application is active, selected, joined, rejected, withdrawn, expired, or held in the talent pool. Eligible deletion requests are processed subject to identity checks, security records, documented legal holds, and applicable obligations."
              ],
              [
                "Cookies",
                "Essential cookies may be used for secure sessions, preferences, and core site operation. Optional measurement tools should be used only where configured and permitted."
              ],
              [
                "Analytics",
                "WriteX may measure tool starts, step completion, previews, downloads, and support interest to improve usability. Full CV or SOP text, phone numbers, email addresses, and document content are not sent to analytics providers."
              ],
              [
                "Free-tool sessions",
                "The CV Builder, SOP Builder, and template library may record an anonymous session identifier, completion progress, preview and download events, and limited planning context. Full working text is retained only temporarily where needed to generate an unlocked download."
              ],
              [
                "Tool downloads and follow-up",
                "When a user requests a download, WriteX records the provided contact details, consent, tool or template used, and relevant support context so the file can be unlocked and an appropriate team may offer relevant support."
              ],
              [
                "Retention",
                "Records are retained only as long as reasonably needed for service delivery, security, quality review, legal obligations, and operational record keeping. Temporary generated-document payloads use expiring download access and should be removed under the configured retention process."
              ],
              [
                "Data security",
                "Access controls, private workflows, and appropriate technical safeguards are used to reduce unauthorised access, loss, alteration, or disclosure."
              ],
              [
                "Third-party processors",
                "Vetted providers may support hosting, storage, email, analytics, payments, or communication. They receive only the access needed for their configured function."
              ],
              [
                "Your rights",
                "You may ask WriteX to review, correct, or delete eligible personal information, subject to identity verification and applicable record-keeping obligations."
              ],
              [
                "Contact",
                "Privacy questions and eligible data requests can be sent to info@writex.co.in."
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
        </div>
      </SpectrumBackground>
    </>
  );
}
