import type { Metadata } from "next";
import { FAQ } from "@/components/FAQ";
import { CommandProtocol } from "@/components/CommandProtocol";
import { FinalCTA } from "@/components/FinalCTA";
import { Hero } from "@/components/Hero";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeader } from "@/components/SectionHeader";
import { ServiceCards } from "@/components/ServiceCards";
import { TrustBar } from "@/components/TrustBar";
import { WhyWriteX } from "@/components/WhyWriteX";
import { Reveal } from "@/components/animations/Reveal";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { homeFaqs } from "@/lib/content";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Academic Support & Review",
  brandFirst: true,
  description:
    "Confidential academic support, dissertation guidance, editing, SOP support, originality review, formatting, and referencing for university students.",
  path: "/",
  keywords: [
    "premium academic support",
    "academic support and review",
    "coursework support",
    "dissertation thesis support",
    "SOP admissions support",
    "academic editing"
  ]
});

const compactHomeFaqs = homeFaqs.slice(0, 4);

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([{ name: "Home", path: "/" }]),
          serviceSchema({
            name: "WriteX Academic Support & Review",
            description:
              "Confidential academic support, research guidance, academic editing, dissertation support, SOP/admissions support, originality review, formatting, and referencing handled through a QA-led workflow.",
            path: "/"
          }),
          faqSchema(compactHomeFaqs)
        ]}
      />
      <Hero />
      <TrustBar />
      <CommandProtocol />

      <SpectrumBackground variant="section" overlayStrength="section" intensity={0.34} className="py-12">
      <Reveal as="div" variant="fade">
        <div className="premium-container">
          <SectionHeader
            eyebrow="Services"
            title="Our Academic Support Services"
            description="End-to-end academic support for every stage of your journey."
          />
          <ServiceCards />
        </div>
      </Reveal>
      </SpectrumBackground>

      <WhyWriteX />

      <SpectrumBackground variant="section" overlayStrength="section" intensity={0.3} className="py-12">
      <Reveal as="div" variant="fade">
        <div className="premium-container grid gap-6 lg:grid-cols-[0.8fr_1fr]">
          <SectionHeader
            eyebrow="FAQ"
            title="Common quote questions"
            description="Quick answers before sharing your brief."
          />
          <FAQ items={compactHomeFaqs} />
        </div>
      </Reveal>
      </SpectrumBackground>

      <FinalCTA />
    </>
  );
}
