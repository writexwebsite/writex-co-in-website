import type { Metadata } from "next";
import { FinalCTA } from "@/components/FinalCTA";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { PageAnalytics } from "@/components/PageAnalytics";
import { SampleExplorer } from "@/components/SampleExplorer";
import { SectionHeader } from "@/components/SectionHeader";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";
import { quoteTrackingEvents } from "@/lib/tracking";

export const metadata: Metadata = buildMetadata({
  title: "Samples & Work Quality",
  description:
    "Anonymised sample categories showing WriteX support quality across coursework structure, dissertation editing, SOP improvement, referencing, and proposals.",
  path: "/samples",
  keywords: [
    "academic samples",
    "work quality",
    "SOP sample",
    "dissertation editing sample"
  ]
});

export default function SamplesPage() {
  return (
    <>
      <PageAnalytics event={quoteTrackingEvents.sampleViewed} pagePath="/samples" />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Samples", path: "/samples" }
        ])}
      />
      <PageHero
        eyebrow="Work quality"
        title="See the kind of improvement, without exposing student identities."
        description="Explore anonymised sample categories that show how WriteX scopes structure, editing, referencing, admissions documents, and research review."
        primaryCta="Request Sample-Aligned Quote"
        secondaryCta="Discuss Quality Needs"
      />

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.3}
        className="py-10 sm:py-12"
      >
        <div className="premium-container">
          <SectionHeader
            eyebrow="Samples"
            title="What a quality review can cover"
            description="Use these categories to understand how WriteX scopes structure, editing, referencing, admissions documents, and research proposals."
          />
          <SampleExplorer />
        </div>
      </SpectrumBackground>

      <FinalCTA
        title="Want support matched to your brief?"
        description="Share the instructions, draft condition, and deadline so WriteX can recommend the right review path."
      />
    </>
  );
}
