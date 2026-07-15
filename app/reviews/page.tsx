import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MessageSquareText, ShieldCheck } from "lucide-react";
import { FinalCTA } from "@/components/FinalCTA";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { SectionHeader } from "@/components/SectionHeader";
import { TrustProof } from "@/components/TrustProof";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Why Students Trust the WriteX Process",
  description:
    "See how confidential handling, clear scope, communication, QA review, and revision handling shape the WriteX academic support process.",
  path: "/reviews"
});

export default function ReviewsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Reviews", path: "/reviews" }
        ])}
      />
      <PageHero
        eyebrow="Trust and reviews"
        title="Why Students Trust the Process"
        description="Trust starts with clear scope, confidential handling, useful communication, and a QA-led review path. WriteX publishes feedback only when its source and use are verified."
        primaryCta="Get a Scope-Based Quote"
        secondaryCta="Explore Services"
        secondaryHref="/assignment-support"
      />

      <SpectrumBackground variant="section" overlayStrength="section" intensity={0.26} className="py-10 sm:py-12">
        <div className="premium-container">
          <SectionHeader
            eyebrow="Process trust"
            title="What students should be able to expect"
            description="These are operating principles, not anonymous testimonials or outcome claims."
          />
          <TrustProof />
        </div>
      </SpectrumBackground>

      <SpectrumBackground variant="section" overlayStrength="strong" intensity={0.2} className="py-10 sm:py-12">
        <div className="premium-container grid gap-5 md:grid-cols-3">
          {[
            [ShieldCheck, "Confidential handling", "Briefs, drafts, access details, and support communication stay within the authorised workflow."],
            [MessageSquareText, "Clear communication", "Scope questions, progress updates, and revision expectations are handled against the agreed requirement."],
            [BadgeCheck, "Verified feedback only", "No invented names, star ratings, university identities, or unverified claims are used on this page."]
          ].map(([Icon, title, description]) => {
            const CardIcon = Icon as typeof ShieldCheck;
            return (
              <article key={title as string} className="rounded-md border border-wxBorder bg-white p-6 shadow-sm">
                <CardIcon className="h-5 w-5 text-wxViolet700" aria-hidden />
                <h2 className="mt-4 text-lg font-semibold text-wxIndigo900">{title as string}</h2>
                <p className="mt-3 text-sm leading-7 text-wxIndigo500">{description as string}</p>
              </article>
            );
          })}
        </div>
        <div className="premium-container mt-6 text-sm text-wxIndigo500">
          Explore <Link href="/samples" className="font-semibold text-wxViolet700 hover:text-wxPink500">anonymised sample categories</Link> or review the <Link href="/academic-integrity" className="font-semibold text-wxViolet700 hover:text-wxPink500">Academic Integrity Policy</Link> before requesting a quote.
        </div>
      </SpectrumBackground>

      <FinalCTA
        title="Share the brief. Understand the process before commitment."
        description="WriteX will review the requirement, files, deadline, and support path before confirming the next step."
      />
    </>
  );
}
