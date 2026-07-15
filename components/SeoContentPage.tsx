import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  UploadCloud,
  UserCheck
} from "lucide-react";
import { helpSeoPages, type SeoContentPage as SeoContentPageContent } from "@/lib/seo-content";
import { CTAButton } from "./CTAButton";
import { FAQ } from "./FAQ";
import { PageHero } from "./PageHero";
import { PageAnalytics } from "./PageAnalytics";
import { SectionReveal } from "./SectionReveal";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { SpectrumBackground } from "./visual/SpectrumBackground";
import { quoteTrackingEvents } from "@/lib/tracking";

type SeoContentPageProps = {
  page: SeoContentPageContent;
};

export function SeoContentPage({ page }: SeoContentPageProps) {
  const relatedGuides = helpSeoPages
    .filter((guide) => guide.path !== page.path)
    .slice(0, 2);

  return (
    <>
      <PageAnalytics event={quoteTrackingEvents.guideViewed} pagePath={page.path} />
      <PageHero
        eyebrow={page.heroEyebrow}
        title={page.h1}
        description={page.intro}
        primaryCta="Get Quote"
        secondaryCta="Send Brief on WhatsApp"
      />

      {page.article ? (
        <section className="border-b border-sageBorder bg-warmIvory py-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-slateText sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-md border border-sageBorder bg-white px-3 py-2 font-semibold text-charcoalInk">
                <UserCheck className="h-4 w-4 text-softTeal" aria-hidden />
                WriteX academic support resource
              </span>
              <span className="inline-flex items-center gap-2 rounded-md border border-sageBorder bg-white px-3 py-2 font-semibold text-charcoalInk">
                <CalendarCheck className="h-4 w-4 text-mutedCopper" aria-hidden />
                Last reviewed {page.article.dateModified}
              </span>
            </div>
            <p className="max-w-xl leading-6">
              Educational guidance for responsible academic support, editing,
              referencing, and learning-focused review.
            </p>
          </div>
        </section>
      ) : null}

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.22}
        className="py-10 sm:py-12"
      >
        <div className="mx-auto grid max-w-7xl gap-7 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <SectionReveal>
            <h2 className="text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
              {page.serviceExplanation.h2}
            </h2>
            <p className="mt-5 text-base leading-8 text-slateText">
              {page.serviceExplanation.body}
            </p>
          </SectionReveal>

          <SectionReveal delay={0.08}>
            <div className="rounded-md border border-sageBorder bg-paleSage p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxViolet700">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-charcoalInk">
                    Academic integrity
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slateText">
                    {page.academicIntegrityDisclaimer}
                  </p>
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.26}
        className="py-10 sm:py-12"
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          {page.commonChallenges ? (
            <SectionReveal>
              <ContentList
                title={page.commonChallenges.h2}
                items={page.commonChallenges.items}
              />
            </SectionReveal>
          ) : null}
          <SectionReveal>
            <ContentList
              title={page.whoThisIsFor.h2}
              items={page.whoThisIsFor.items}
            />
          </SectionReveal>
          <SectionReveal delay={0.08}>
            <ContentList
              title={page.whatWriteXCanHelpWith.h2}
              items={page.whatWriteXCanHelpWith.items}
            />
          </SectionReveal>
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.22}
        className="py-10 sm:py-12"
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <SectionReveal>
            <PanelList
              title={page.whatToUpload.h2}
              items={page.whatToUpload.items}
              icon="upload"
            />
          </SectionReveal>
          {page.qualityChecks ? (
            <SectionReveal delay={0.08}>
              <PanelList
                title={page.qualityChecks.h2}
                items={page.qualityChecks.items}
                icon="checks"
              />
            </SectionReveal>
          ) : (
            <SectionReveal delay={0.08}>
              <PanelList
                title="Scope review signals"
                items={[
                  "Service type, academic level, subject, and deadline",
                  "Draft condition, files, rubric, and instruction clarity",
                  "Safe support path before quote confirmation"
                ]}
                icon="checks"
              />
            </SectionReveal>
          )}
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.28}
        className="py-10 sm:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-mutedCopper">
                Process
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
                {page.process.h2}
              </h2>
            </div>
          </SectionReveal>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {page.process.steps.map((step, index) => (
              <SectionReveal key={step} delay={index * 0.03}>
                <div className="h-full rounded-md border border-sageBorder bg-white p-5 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-wxSurfaceSoft text-sm font-semibold text-wxViolet700">
                    {index + 1}
                  </span>
                  <p className="mt-5 text-sm leading-7 text-slateText">{step}</p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </SpectrumBackground>

      <section className="bg-white py-10 sm:py-12">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <SectionReveal>
            <p className="text-sm font-semibold uppercase text-mutedCopper">
              Related support
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
              Useful next pages
            </h2>
            <p className="mt-5 text-base leading-8 text-slateText">
              Continue with the most relevant WriteX support pathway, pricing
              information, or enquiry route.
            </p>
          </SectionReveal>

          <div className="grid gap-3 sm:grid-cols-2">
            {page.internalLinks.map((link, index) => (
              <SectionReveal key={`${link.href}-${link.label}`} delay={index * 0.04}>
                <Link
                  href={link.href}
                  className="flex min-h-20 items-center justify-between gap-4 rounded-md border border-sageBorder bg-paleSage px-5 py-4 text-sm font-semibold text-charcoalInk shadow-sm transition hover:border-softTeal hover:bg-white"
                >
                  <span>{link.label}</span>
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-softTeal" aria-hidden />
                </Link>
              </SectionReveal>
            ))}
            {relatedGuides.map((guide, index) => (
              <SectionReveal key={guide.path} delay={(page.internalLinks.length + index) * 0.04}>
                <Link
                  href={guide.path}
                  className="flex min-h-20 items-center justify-between gap-4 rounded-md border border-wxBorder bg-white px-5 py-4 text-sm font-semibold text-wxIndigo700 shadow-sm transition hover:border-wxViolet700 hover:text-wxViolet700"
                >
                  <span>{guide.h1}</span>
                  <FileText className="h-5 w-5 shrink-0 text-wxViolet700" aria-hidden />
                </Link>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.22}
        className="py-10 sm:py-12"
      >
        <div className="mx-auto grid max-w-7xl gap-7 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <SectionReveal>
            <p className="text-sm font-semibold uppercase text-mutedCopper">FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
              Questions students ask before sharing a brief
            </h2>
            <p className="mt-5 text-base leading-8 text-slateText">
              Clear answers on responsible support, confidentiality, scope,
              and the next step.
            </p>
          </SectionReveal>
          <SectionReveal delay={0.08}>
            <FAQ items={page.faq} />
          </SectionReveal>
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.2}
        className="py-10 sm:py-12"
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_0.75fr] lg:px-8">
          <div className="relative overflow-hidden rounded-md border border-wxBorder bg-white p-6 text-wxIndigo900 shadow-lift sm:p-8 lg:col-span-2 lg:grid lg:grid-cols-[1fr_0.75fr] lg:gap-6">
            <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-spectrum" />
          <div>
            <p className="text-sm font-semibold uppercase text-wxViolet700">
              Next step
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
              {page.cta.title}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-wxIndigo500">
              {page.cta.description}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <WhatsAppCTA />
              <CTAButton href="/pricing#quote" variant="secondary" icon={FileText}>
                Get Quote
              </CTAButton>
            </div>
          </div>
          <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-6">
            <p className="text-sm font-semibold text-wxViolet700">
              What to include
            </p>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-wxIndigo500">
              <li>Brief, rubric, draft files, and supervisor comments.</li>
              <li>Deadline, word count, academic level, subject, and style guide.</li>
              <li>Whether you need editing, guidance, review, or formatting.</li>
            </ul>
          </div>
          </div>
        </div>
      </SpectrumBackground>
    </>
  );
}

function ContentList({
  title,
  items
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <div className="h-full rounded-md border border-sageBorder bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold leading-tight text-charcoalInk">{title}</h2>
      <ul className="mt-6 grid gap-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-7 text-slateText">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-mutedCopper" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanelList({
  title,
  items,
  icon
}: {
  title: string;
  items: readonly string[];
  icon: "upload" | "checks";
}) {
  const Icon = icon === "upload" ? UploadCloud : ClipboardCheck;

  return (
    <div className="h-full rounded-md border border-sageBorder bg-white p-6 shadow-sm">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-softTeal/10 text-softTeal">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="text-2xl font-semibold leading-tight text-charcoalInk">
        {title}
      </h2>
      <ul className="mt-5 grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-slateText">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-softTeal" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
