import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  ShieldCheck,
  UploadCloud
} from "lucide-react";
import type { ServicePage } from "@/lib/content";
import { FAQ } from "./FAQ";
import { FinalCTA } from "./FinalCTA";
import { PageHero } from "./PageHero";
import { PageAnalytics } from "./PageAnalytics";
import { SectionHeader } from "./SectionHeader";
import { SectionReveal } from "./SectionReveal";
import { ServiceSignatureExperience } from "./ServiceSignatureExperience";
import { SubjectGrid } from "./SubjectGrid";
import { SpectrumBackground } from "./visual/SpectrumBackground";
import { quoteTrackingEvents } from "@/lib/tracking";

type ServicePageTemplateProps = {
  page: ServicePage;
  showSubjects?: boolean;
};

const relatedGuideByService: Record<string, { label: string; href: string; description: string }> = {
  "/assignment-support": {
    label: "How to structure university coursework",
    href: "/help/how-to-structure-university-assignment",
    description: "A practical guide to turning a brief and rubric into a clear coursework structure."
  },
  "/dissertation-thesis-support": {
    label: "How to write a dissertation literature review",
    href: "/help/how-to-write-dissertation-literature-review",
    description: "Review theme grouping, source synthesis, argument flow, and chapter structure."
  },
  "/editing-proofreading": {
    label: "How to improve academic writing clarity",
    href: "/help/how-to-improve-academic-writing-clarity",
    description: "Use a focused checklist for clarity, tone, paragraph logic, and sentence-level review."
  },
  "/sop-admissions-writing": {
    label: "SOP writing mistakes to avoid",
    href: "/help/sop-writing-mistakes",
    description: "Understand common narrative, specificity, structure, and authenticity problems."
  },
  "/plagiarism-ai-review": {
    label: "How to reduce plagiarism ethically",
    href: "/help/how-to-reduce-plagiarism-ethically",
    description: "Learn how citation, attribution, and responsible paraphrasing address similarity concerns."
  },
  "/formatting-referencing": {
    label: "Harvard referencing guide",
    href: "/help/harvard-referencing-guide",
    description: "Review common in-text citation and reference-list conventions before final formatting."
  }
};

function Checklist({
  items,
  iconTone = "teal"
}: {
  items: string[];
  iconTone?: "teal" | "copper";
}) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-slateText">
          <CheckCircle2
            className={
              iconTone === "copper"
                ? "mt-0.5 h-4 w-4 shrink-0 text-mutedCopper"
                : "mt-0.5 h-4 w-4 shrink-0 text-softTeal"
            }
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ServicePageTemplate({
  page,
  showSubjects = false
}: ServicePageTemplateProps) {
  const relatedGuide = relatedGuideByService[page.path];

  return (
    <>
      <PageAnalytics event={quoteTrackingEvents.servicePageView} pagePath={page.path} />
      <PageHero
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        primaryCta={page.primaryCta}
        secondaryCta={page.secondaryCta}
      />

      <ServiceSignatureExperience page={page} />

      <section className="bg-white py-10 sm:py-12">
        <div className="premium-container grid gap-6 lg:grid-cols-2">
          <SectionReveal>
            <article className="h-full rounded-md border border-sageBorder bg-paleSage p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-softTeal/10 text-softTeal">
                <ClipboardCheck className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-2xl font-semibold leading-tight text-charcoalInk">
                Who this is for
              </h2>
              <div className="mt-5">
                <Checklist items={page.whoThisIsFor} />
              </div>
            </article>
          </SectionReveal>

          <SectionReveal delay={0.05}>
            <article className="h-full rounded-md border border-sageBorder bg-warmIvory p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-mutedCopper/10 text-mutedCopper">
                <FileCheck2 className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-2xl font-semibold leading-tight text-charcoalInk">
                What WriteX can help with
              </h2>
              <div className="mt-5">
                <Checklist items={page.helpWith} iconTone="copper" />
              </div>
            </article>
          </SectionReveal>
        </div>
      </section>

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.3}
        className="py-10 sm:py-12"
      >
        <div className="premium-container">
          <div className="mb-7 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-wxViolet700">
              Process
            </p>
            <h2 className="text-3xl font-semibold leading-tight text-wxIndigo900 sm:text-4xl">
              How the support process works
            </h2>
            <p className="mt-4 text-base leading-8 text-wxIndigo500">
              Each service request is reviewed against the brief, files,
              academic level, deadline, and support requirement before a
              scope-based quote is confirmed.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {page.process.map((step, index) => (
              <SectionReveal key={step.title} delay={index * 0.05}>
                <article className="h-full rounded-md border border-wxBorder bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-wxViolet700">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-wxViolet700 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    {index < page.process.length - 1 ? (
                      <ArrowRight className="h-4 w-4 text-wxBlue500" aria-hidden />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-wxGreen500" aria-hidden />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-wxIndigo900">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-wxIndigo500">
                    {step.description}
                  </p>
                </article>
              </SectionReveal>
            ))}
          </div>
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.22}
        className="py-10 sm:py-12"
      >
        <div className="premium-container grid gap-6 lg:grid-cols-2">
          <SectionReveal>
            <article className="h-full rounded-md border border-sageBorder bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-softTeal/10 text-softTeal">
                <UploadCloud className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-2xl font-semibold leading-tight text-charcoalInk">
                What to upload
              </h2>
              <p className="mt-3 text-sm leading-7 text-slateText">
                Complete files help WriteX scope timing, feasibility, and review
                depth before a quote is shared.
              </p>
              <div className="mt-5">
                <Checklist items={page.uploadItems} />
              </div>
            </article>
          </SectionReveal>

          <SectionReveal delay={0.05}>
            <article className="h-full rounded-md border border-sageBorder bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-mutedCopper/10 text-mutedCopper">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-2xl font-semibold leading-tight text-charcoalInk">
                Quality checks
              </h2>
              <p className="mt-3 text-sm leading-7 text-slateText">
                QA is planned around the original brief, agreed scope, academic
                context, and supplied style instructions.
              </p>
              <div className="mt-5">
                <Checklist items={page.qualityChecks} iconTone="copper" />
              </div>
            </article>
          </SectionReveal>
        </div>
      </SpectrumBackground>

      <section className="bg-white py-10 sm:py-12">
        <div className="premium-container">
          <SectionHeader
            eyebrow="Related services"
            title="Support paths often reviewed together"
            description="Students often combine related support paths when a brief includes research, editing, formatting, referencing, or integrity-review needs."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {page.relatedServices.map((service, index) => (
              <SectionReveal key={service.href} delay={index * 0.05}>
                <Link
                  href={service.href}
                  className="group flex h-full flex-col rounded-md border border-sageBorder bg-paleSage p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-mutedCopper hover:bg-warmIvory hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mutedCopper"
                >
                  <h3 className="text-lg font-semibold text-charcoalInk">
                    {service.label}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-slateText">
                    {service.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-softTeal transition group-hover:text-charcoalInk">
                    Explore service
                    <ArrowRight
                      className="h-4 w-4 transition group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </Link>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {relatedGuide ? (
        <SpectrumBackground variant="section" overlayStrength="strong" intensity={0.18} className="py-8 sm:py-10">
          <div className="premium-container grid gap-5 rounded-md border border-wxBorder bg-white p-6 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-wxViolet700">Relevant guide</p>
              <h2 className="mt-3 text-2xl font-semibold text-wxIndigo900">{relatedGuide.label}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-wxIndigo500">{relatedGuide.description}</p>
            </div>
            <Link
              href={relatedGuide.href}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxBorder px-4 py-2 text-sm font-semibold text-wxIndigo700 transition hover:border-wxViolet700 hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wxViolet700"
            >
              Read guide <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </SpectrumBackground>
      ) : null}

      {showSubjects ? (
        <SpectrumBackground
          variant="section"
          overlayStrength="section"
          intensity={0.26}
          className="py-10 sm:py-12"
        >
          <div className="premium-container">
            <SectionHeader
              eyebrow="Subject coverage"
              title="University subjects supported"
              description="A focused academic support menu for coursework, research, editing, and referencing needs."
            />
            <SubjectGrid />
          </div>
        </SpectrumBackground>
      ) : null}

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.28}
        className="py-10 sm:py-12"
      >
        <div className="premium-container grid gap-7 lg:grid-cols-[0.8fr_1fr]">
          <SectionHeader
            eyebrow="FAQ"
            title="Before you request a quote"
            description="These answers reduce uncertainty before you share your brief, draft, deadline, or support requirement."
          />
          <FAQ items={page.faqs} />
        </div>
      </SpectrumBackground>

      <FinalCTA
        title={page.ctaTitle || `Ready to discuss ${page.title.toLowerCase()}?`}
        description={
          page.ctaDescription ||
          "Send your brief, deadline, and current draft so WriteX can scope the support clearly and confidentially."
        }
      />
    </>
  );
}
