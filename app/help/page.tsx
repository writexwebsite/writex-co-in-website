import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { SectionReveal } from "@/components/SectionReveal";
import { helpSeoPages } from "@/lib/seo-content";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Academic Support Resources & Guides",
  description:
    "Evergreen WriteX guides for academic structure, dissertation planning, referencing, originality, academic clarity, admissions documents, and deadline preparation.",
  path: "/help",
  keywords: [
    "academic support help",
    "Harvard referencing guide",
    "APA referencing guide",
    "dissertation proposal checklist"
  ]
});

export default function HelpPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Resources", path: "/help" }
        ])}
      />
      <PageHero
        eyebrow="Resources"
        title="Practical academic guides built for lasting value"
        description="Evergreen guidance on structure, referencing, dissertation planning, originality, clarity, admissions documents, and realistic deadline preparation."
      />

      <section className="bg-paleSage py-10 sm:py-12">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-2 xl:grid-cols-3 lg:px-8">
          {helpSeoPages.map((page, index) => (
            <SectionReveal key={page.slug} delay={index * 0.03}>
              <Link
                href={page.path}
                className="group flex h-full flex-col rounded-md border border-sageBorder bg-white p-5 shadow-sm transition hover:border-softTeal hover:bg-warmIvory"
              >
                <h2 className="text-xl font-semibold leading-tight text-charcoalInk">
                  {page.h1}
                </h2>
                <p className="mt-4 flex-1 text-sm leading-7 text-slateText">
                  {page.intro}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-charcoalInk group-hover:text-softTeal">
                  Read guide
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            </SectionReveal>
          ))}
        </div>
      </section>
    </>
  );
}
