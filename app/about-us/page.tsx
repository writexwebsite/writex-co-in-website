import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Layers3,
  LockKeyhole,
  MessageCircleMore,
  Network,
  PenLine,
  SearchCheck,
  ShieldCheck,
  UsersRound,
  Workflow
} from "lucide-react";
import { AnimatedCard } from "@/components/animations/AnimatedCard";
import { Reveal } from "@/components/animations/Reveal";
import { Stagger } from "@/components/animations/Stagger";
import { CTAButton } from "@/components/CTAButton";
import { FinalCTA } from "@/components/FinalCTA";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { PageAnalytics } from "@/components/PageAnalytics";
import { SectionHeader } from "@/components/SectionHeader";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { aboutPageSchema, breadcrumbSchema } from "@/lib/schema";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { quoteTrackingEvents } from "@/lib/tracking";

const pageTitle = "About WriteX | 10+ Years of Academic Support & Review";
const pageDescription =
  "Learn about WriteX, a 10+ year academic support and review company with research, editing, QA, project coordination, and confidential student-support capabilities.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: absoluteUrl("/about-us") },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: absoluteUrl("/about-us"),
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: absoluteUrl("/images/og/writex-home-og.png"),
        width: 1200,
        height: 630,
        alt: "WriteX academic support and review"
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

const teamCapabilities = [
  { label: "Research capability", icon: SearchCheck },
  { label: "Writing and editing", icon: PenLine },
  { label: "Quality review", icon: BadgeCheck },
  { label: "Project coordination", icon: Workflow },
  { label: "Internal software systems", icon: Network },
  { label: "AI-enabled internal workflows", icon: BrainCircuit }
];

const capabilityCards = [
  {
    title: "10+ Years",
    description: "Operating experience in research-led academic support.",
    icon: Layers3,
    accent: "text-wxOrange500 bg-wxOrange500/10"
  },
  {
    title: "150+ Team Capability",
    description: "Researchers, writers, editors, QA, and project coordination.",
    icon: UsersRound,
    accent: "text-wxBlue500 bg-wxBlue500/10"
  },
  {
    title: "QA-Led Workflow",
    description: "Structured review for clarity, references, formatting, and instructions.",
    icon: ClipboardCheck,
    accent: "text-wxGreen500 bg-wxGreen500/10"
  },
  {
    title: "Internal Systems",
    description: "Software and AI-enabled processes supporting coordination and quality control.",
    icon: BrainCircuit,
    accent: "text-wxPink500 bg-wxPink500/10"
  }
];

const workflowSteps = [
  {
    title: "Brief Review",
    description: "The requirement, deadline, files, and academic context are checked.",
    icon: FileSearch
  },
  {
    title: "Scope Clarity",
    description: "The available support and next steps are explained.",
    icon: SearchCheck
  },
  {
    title: "Capability Match",
    description: "The request is routed to the relevant team or specialist.",
    icon: UsersRound
  },
  {
    title: "Review and Quality Control",
    description: "The support is checked against the agreed scope.",
    icon: ShieldCheck
  },
  {
    title: "Clear Communication",
    description: "Updates, questions, and next actions are shared through the support process.",
    icon: MessageCircleMore
  }
];

const principles = [
  {
    title: "Clarity Before Commitment",
    description: "The scope should be understood before timelines or next steps are confirmed.",
    icon: SearchCheck
  },
  {
    title: "Confidential Handling",
    description: "Client files and personal information stay within the support workflow.",
    icon: LockKeyhole
  },
  {
    title: "Human Review",
    description: "Internal systems may support the process, but human review remains essential.",
    icon: UsersRound
  },
  {
    title: "Responsible Academic Support",
    description: "Students remain responsible for following their institution's academic integrity policies.",
    icon: ShieldCheck
  }
];

const structuredReasons = [
  "One coordinated support system",
  "Broader subject and service capability",
  "Defined review stages",
  "Clear communication",
  "Confidential handling",
  "Multiple support pathways",
  "Deadline-aware coordination"
];

export default function AboutUsPage() {
  return (
    <>
      <PageAnalytics event={quoteTrackingEvents.aboutPageView} pagePath="/about-us" />
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About WriteX", path: "/about-us" }
          ]),
          aboutPageSchema({ title: pageTitle, description: pageDescription })
        ]}
      />

      <PageHero
        eyebrow="About WriteX"
        title="10+ Years of Structured Academic Support"
        description="WriteX brings together research, writing, editing, quality review, project coordination, internal software, and AI-enabled workflows to support complex academic requirements with clarity and confidentiality."
        primaryCta="Get Quote on WhatsApp"
        secondaryCta="Explore Our Services"
        primaryAction="whatsapp"
        secondaryHref="/assignment-support"
        supportingCards={[
          {
            title: "Built as a coordinated support system.",
            description:
              "Research, editing, QA, and project coordination work through one structured process."
          },
          {
            title: "Confidential and responsibility-led.",
            description:
              "Files and personal information stay within the support workflow, with academic integrity kept clear."
          }
        ]}
      />

      <SpectrumBackground variant="section" overlayStrength="strong" intensity={0.22} className="py-10 sm:py-12">
        <div className="premium-container grid gap-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <SectionHeader
            eyebrow="Who we are"
            title="Built Around Clarity, Review, and Reliable Support"
            description="WriteX is a research-led academic support and document-review company with more than a decade of operating experience."
          />
          <Reveal className="rounded-md border border-wxBorder bg-white p-5 shadow-soft sm:p-6">
            <p className="text-sm leading-7 text-wxIndigo500">
              The operating model combines specialist capability with the systems needed to coordinate complex briefs responsibly.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {teamCapabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex min-h-12 items-center gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft/70 px-4 py-3">
                    <Icon className="h-4 w-4 shrink-0 text-wxViolet700" aria-hidden />
                    <span className="text-sm font-semibold text-wxIndigo700">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </SpectrumBackground>

      <SpectrumBackground variant="section" overlayStrength="section" intensity={0.3} className="py-10 sm:py-12">
        <div className="premium-container">
          <SectionHeader
            eyebrow="Capability"
            title="Company Capability Snapshot"
            description="A concise view of the people, review stages, and operating systems behind WriteX support."
          />
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" itemClassName="h-full">
            {capabilityCards.map((card) => {
              const Icon = card.icon;
              return (
                <AnimatedCard key={card.title} className="h-full">
                  <article className="h-full rounded-md border border-wxBorder bg-white p-5 shadow-sm">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-md ${card.accent}`}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-5 text-xl font-semibold text-wxIndigo900">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-wxIndigo500">{card.description}</p>
                  </article>
                </AnimatedCard>
              );
            })}
          </Stagger>
        </div>
      </SpectrumBackground>

      <SpectrumBackground variant="section" overlayStrength="strong" intensity={0.2} className="py-10 sm:py-12">
        <div className="premium-container">
          <SectionHeader
            eyebrow="How WriteX works"
            title="A Clear Process Before the Work Begins"
            description="Each request moves through a practical sequence designed to establish scope, capability, review, and communication."
          />
          <div className="relative">
            <div aria-hidden className="absolute left-8 right-8 top-6 hidden h-px bg-gradient-to-r from-wxBlue500 via-wxViolet700 to-wxPink500 xl:block" />
            <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" itemClassName="h-full" stagger={0.065}>
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <AnimatedCard key={step.title} className="h-full">
                    <article className="relative h-full rounded-md border border-wxBorder bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-wxViolet700 text-sm font-bold text-white">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <Icon className="h-5 w-5 text-wxBlue500" aria-hidden />
                      </div>
                      <h3 className="mt-5 text-base font-semibold text-wxIndigo900">{step.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-wxIndigo500">{step.description}</p>
                    </article>
                  </AnimatedCard>
                );
              })}
            </Stagger>
          </div>
        </div>
      </SpectrumBackground>

      <SpectrumBackground variant="section" overlayStrength="section" intensity={0.28} className="py-10 sm:py-12">
        <div className="premium-container">
          <SectionHeader
            eyebrow="Principles"
            title="What Guides the WriteX Process"
            description="Four operating principles keep support clear, private, reviewed, and responsibility-led."
          />
          <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" itemClassName="h-full">
            {principles.map((principle) => {
              const Icon = principle.icon;
              return (
                <AnimatedCard key={principle.title} className="h-full">
                  <article className="h-full rounded-md border border-wxBorder bg-white p-5 shadow-sm">
                    <Icon className="h-5 w-5 text-wxViolet700" aria-hidden />
                    <h3 className="mt-4 text-lg font-semibold text-wxIndigo900">{principle.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-wxIndigo500">{principle.description}</p>
                  </article>
                </AnimatedCard>
              );
            })}
          </Stagger>
        </div>
      </SpectrumBackground>

      <SpectrumBackground variant="section" overlayStrength="strong" intensity={0.18} className="py-10 sm:py-12">
        <div className="premium-container grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <SectionHeader
              eyebrow="Why WriteX"
              title="Why Students Choose a Structured Team"
              description="Complex requirements are easier to manage when scope, specialist capability, communication, and review are coordinated through one support system."
            />
            <div className="flex flex-wrap gap-3">
              <CTAButton href="/assignment-support" variant="secondary">Services</CTAButton>
              <CTAButton href="/pricing#quote" variant="secondary">Pricing</CTAButton>
              <CTAButton href="/contact" variant="secondary">Contact</CTAButton>
            </div>
          </div>
          <Reveal className="rounded-md border border-wxBorder bg-white p-5 shadow-soft sm:p-6">
            <ul className="grid gap-3 sm:grid-cols-2" aria-label="Reasons students choose WriteX">
              {structuredReasons.map((reason) => (
                <li key={reason} className="flex items-start gap-3 rounded-md bg-wxSurfaceSoft/70 px-4 py-3 text-sm font-semibold text-wxIndigo700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-wxGreen500" aria-hidden />
                  {reason}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </SpectrumBackground>

      <SpectrumBackground variant="section" overlayStrength="section" intensity={0.26} className="py-10 sm:py-12">
        <Reveal className="premium-container">
          <div className="grid gap-6 rounded-md border border-wxBorder bg-white p-6 shadow-soft lg:grid-cols-[auto_1fr_auto] lg:items-center lg:p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-wxGreen500/10 text-wxGreen500">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-2xl font-semibold text-wxIndigo900">Support With Academic Responsibility</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-wxIndigo500">
                WriteX provides research guidance, structure review, editing, proofreading, formatting, referencing support, originality review, and learning-focused assistance. Students remain responsible for following their institution&apos;s academic integrity requirements.
              </p>
            </div>
            <CTAButton href="/academic-integrity" variant="secondary">Read Our Academic Integrity Policy</CTAButton>
          </div>
        </Reveal>
      </SpectrumBackground>

      <SpectrumBackground variant="section" overlayStrength="strong" intensity={0.2} className="py-10 sm:py-12">
        <div className="premium-container grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <SectionHeader
            eyebrow="Brand story"
            title="From Writing Capability to a Structured Support System"
          />
          <Reveal className="border-l-2 border-wxViolet700 pl-5 sm:pl-7">
            <p className="text-base leading-8 text-wxIndigo500">
              WriteX began by building deep research and writing capability. Over time, that capability expanded into editing, quality review, project coordination, internal software, and AI-enabled operational systems.
            </p>
            <p className="mt-4 text-base leading-8 text-wxIndigo500">
              Today, WriteX operates as a structured academic support platform rather than a single-service writing provider.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold">
              <Link href="/client-login" className="text-wxViolet700 hover:text-wxPink500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wxViolet700">Client Login</Link>
              <Link href="/contact" className="text-wxIndigo700 hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wxViolet700">Contact WriteX</Link>
            </div>
          </Reveal>
        </div>
      </SpectrumBackground>

      <FinalCTA
        title="Bring the Brief. Get a Clear Next Step."
        description="Share your requirement, deadline, files, or academic question. WriteX will review the scope before confirming the next step."
      />
    </>
  );
}
