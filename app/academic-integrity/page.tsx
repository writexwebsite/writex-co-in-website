import type { Metadata } from "next";
import Link from "next/link";
import { Ban, BookOpenCheck, Compass, FileCheck2, GraduationCap, SearchCheck, ShieldCheck, UserCheck } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { SectionHeader } from "@/components/SectionHeader";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { breadcrumbSchema } from "@/lib/schema";
import { academicIntegrityDisclaimer, buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Academic Integrity Policy",
  description:
    "How WriteX approaches research guidance, editing, referencing, originality review, model solutions for learning, and student academic responsibility.",
  path: "/academic-integrity"
});

const principles = [
  {
    title: "Guidance and review",
    description: "Support is positioned around research guidance, structure review, editing, proofreading, formatting, referencing, and document improvement.",
    icon: BookOpenCheck
  },
  {
    title: "Student responsibility",
    description: "Students remain responsible for understanding and following their institution's assessment, authorship, citation, and submission policies.",
    icon: UserCheck
  },
  {
    title: "Learning-focused examples",
    description: "Where model solutions are provided, they are intended to support learning, planning, and understanding rather than misrepresent authorship.",
    icon: GraduationCap
  },
  {
    title: "Source attribution",
    description: "Referencing support focuses on accurate citation, consistent formatting, and clear acknowledgement of source material.",
    icon: FileCheck2
  },
  {
    title: "Originality review",
    description: "Similarity and AI review are used to identify areas requiring human judgement, clearer attribution, or language improvement without guaranteeing platform outcomes.",
    icon: SearchCheck
  },
  {
    title: "Responsible scope",
    description: "WriteX may clarify, limit, or decline requests that do not fit a responsible academic support pathway.",
    icon: ShieldCheck
  },
  {
    title: "Prohibited requests",
    description: "WriteX does not support exam impersonation, guaranteed outcomes, misrepresentation of authorship, or requests to bypass institutional rules.",
    icon: Ban
  },
  {
    title: "Responsible use guidance",
    description: "Students should use feedback, examples, and reviewed documents to learn, revise, cite accurately, and meet their institution's requirements.",
    icon: Compass
  }
];

export default function AcademicIntegrityPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Academic Integrity", path: "/academic-integrity" }
        ])}
      />
      <PageHero
        eyebrow="Academic integrity"
        title="Responsible Support With Clear Boundaries"
        description="WriteX supports learning, document improvement, research clarity, and responsible academic practice while students retain responsibility for institutional compliance."
        primaryCta="Discuss Your Requirement"
        secondaryCta="Read Terms of Service"
        primaryAction="whatsapp"
        secondaryHref="/terms"
      />
      <SpectrumBackground variant="section" overlayStrength="strong" intensity={0.2} className="py-10 sm:py-12">
        <div className="premium-container">
          <SectionHeader
            eyebrow="Policy"
            title="How WriteX Approaches Academic Responsibility"
            description={academicIntegrityDisclaimer}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {principles.map((principle) => {
              const Icon = principle.icon;
              return (
                <article key={principle.title} className="rounded-md border border-wxBorder bg-white p-6 shadow-sm">
                  <Icon className="h-5 w-5 text-wxViolet700" aria-hidden />
                  <h2 className="mt-4 text-lg font-semibold text-wxIndigo900">{principle.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-wxIndigo500">{principle.description}</p>
                </article>
              );
            })}
          </div>
          <p className="mt-7 text-sm leading-7 text-wxIndigo500">
            Questions about a specific requirement can be discussed through the <Link href="/contact" className="font-semibold text-wxViolet700 hover:text-wxPink500">contact page</Link>. Service-specific conditions are also explained in the <Link href="/terms" className="font-semibold text-wxViolet700 hover:text-wxPink500">Terms of Service</Link>.
          </p>
        </div>
      </SpectrumBackground>
    </>
  );
}
