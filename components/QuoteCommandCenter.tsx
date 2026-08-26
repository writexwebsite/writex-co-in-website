"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  GraduationCap,
  Layers3,
  Microscope,
  PenLine,
  ShieldCheck,
  TimerReset,
  UploadCloud
} from "lucide-react";
import { useEffect, useState } from "react";
import { pricingFaqs } from "@/lib/content";
import { motionDurations, motionEase } from "@/lib/motion";
import { getWhatsAppUrl } from "@/lib/site";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { FAQ } from "./FAQ";
import { PageHero } from "./PageHero";
import { QuoteForm } from "./QuoteForm";
import { TermPlanInterest } from "./pricing/TermPlanInterest";
import { SectionReveal } from "./SectionReveal";
import { ScopeCard } from "./ScopeCard";
import { SpectrumBackground } from "./visual/SpectrumBackground";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

const heroVisualCards = [
  {
    label: "Brief",
    detail: "Files and deadline",
    className: "left-6 top-7 w-44",
    accent: "#0B81F7"
  },
  {
    label: "Scope Review",
    detail: "Requirement checked",
    className: "left-1/2 top-24 z-10 w-44 -translate-x-1/2",
    accent: "#5516F2"
  },
  {
    label: "Expert Match",
    detail: "Subject-aware routing",
    className: "right-6 top-2 w-48",
    accent: "#B42CE0"
  },
  {
    label: "QA Check",
    detail: "Review path planned",
    className: "left-8 bottom-10 w-44",
    accent: "#E83874"
  },
  {
    label: "Quote",
    detail: "Shared after review",
    className: "bottom-2 right-2 w-40",
    accent: "#1ECC6F"
  }
];

const trustStripItems = [
  {
    title: "Confidential File Handling",
    icon: ShieldCheck,
    description:
      "Briefs, drafts, rubrics, and instructions stay within the support workflow."
  },
  {
    title: "Human Academic Review",
    icon: Brain,
    description:
      "Requests are reviewed by subject-aware academic support professionals."
  },
  {
    title: "Scope-Based Quote",
    icon: Layers3,
    description:
      "Pricing depends on service type, deadline, level, word count, and document condition."
  },
  {
    title: "WhatsApp Fast Path",
    icon: WhatsAppIcon,
    description:
      "Urgent students can send the same brief directly on WhatsApp."
  },
  {
    title: "QA-Reviewed Workflow",
    icon: CheckCircle2,
    description:
      "Support is checked for clarity, structure, references, formatting, and agreed instructions."
  }
];

const workflowSteps = [
  {
    title: "Brief received",
    description:
      "You share the brief, rubric, draft, SOP prompt, dissertation chapter, or instructions."
  },
  {
    title: "Requirements checked",
    description:
      "WriteX checks word count, deadline, academic level, subject, referencing style, and missing details."
  },
  {
    title: "Missing details requested",
    description:
      "If the brief is incomplete, the team asks for the information needed to scope accurately."
  },
  {
    title: "Scope confirmed",
    description:
      "The support pathway is mapped: academic editing, research guidance, dissertation support, formatting, originality review, or admissions support."
  },
  {
    title: "Quote shared",
    description:
      "You receive a scope-based quote and the next step."
  },
  {
    title: "Support starts after approval",
    description:
      "Work begins only after scope, timeline, and support expectations are confirmed."
  }
];

const scopeCards = [
  {
    title: "Academic Editing & Proofreading Review",
    icon: PenLine,
    bestFor:
      "Students who already have a draft and need clarity, grammar, structure, academic tone, citation, and formatting review.",
    factors: [
      "Draft length",
      "Editing depth",
      "Referencing style",
      "Academic level",
      "Deadline"
    ],
    cta: "Send Brief for Editing Review",
    serviceValue: "Academic Editing & Proofreading"
  },
  {
    title: "Coursework & Brief Support",
    icon: BookOpenCheck,
    bestFor:
      "Coursework briefs where students need research guidance, structure planning, referencing support, editing, or model solutions for learning.",
    factors: [
      "Subject complexity",
      "Word count",
      "Brief clarity",
      "Deadline",
      "Research depth"
    ],
    cta: "Send Coursework Brief",
    serviceValue: "Coursework & Brief Support"
  },
  {
    title: "Dissertation & Thesis Support",
    icon: Microscope,
    bestFor:
      "Research proposals, literature reviews, methodology clarity, chapter editing, supervisor-comment response, formatting, and referencing.",
    factors: [
      "Chapter type",
      "Research level",
      "Word count",
      "Supervisor comments",
      "Methodology or data complexity"
    ],
    cta: "Send Dissertation Brief",
    serviceValue: "Dissertation & Thesis Support"
  },
  {
    title: "SOP & Admissions Support",
    icon: GraduationCap,
    bestFor:
      "SOPs, personal statements, LOR editing, CV polishing, and profile positioning for university applications.",
    factors: [
      "Target country",
      "Programme type",
      "Number of documents",
      "Profile notes",
      "Draft condition"
    ],
    cta: "Send SOP Requirement",
    serviceValue: "SOP & Admissions Support"
  },
  {
    title: "Urgent Deadline Review",
    icon: TimerReset,
    bestFor:
      "Short-deadline requests where WriteX must first check expert availability, file condition, word count, and realistic support scope.",
    factors: [
      "Time available",
      "File completeness",
      "Word count",
      "Subject complexity",
      "Required review depth"
    ],
    cta: "Check Urgent Availability",
    serviceValue: "Urgent Deadline Review"
  }
];

const quoteFactors = [
  {
    title: "Service type",
    description:
      "Academic editing, dissertation support, SOP work, formatting, and originality review require different workflows and expert involvement."
  },
  {
    title: "Academic level",
    description:
      "Undergraduate, postgraduate, MBA, doctoral, and admissions documents require different levels of academic judgement."
  },
  {
    title: "Subject complexity",
    description:
      "Technical, legal, data-heavy, or specialised subjects may require deeper review or subject-specific expertise."
  },
  {
    title: "Word count",
    description:
      "Longer documents require more time for reading, editing, referencing, structure review, and QA."
  },
  {
    title: "Deadline urgency",
    description:
      "Short deadlines affect expert availability, review depth, and coordination. Urgent requests are scoped carefully before commitment."
  },
  {
    title: "Draft condition",
    description:
      "A polished draft, rough notes, partial outline, supervisor comments, or rubric-only request each needs a different support pathway."
  },
  {
    title: "Referencing style",
    description:
      "Harvard, APA, MLA, Chicago, OSCOLA, and university-specific referencing styles require different checks."
  },
  {
    title: "Data or technical complexity",
    description:
      "Dissertations or assignments involving analysis, tables, coding, statistics, or technical material may require additional review."
  },
  {
    title: "File quality and instruction clarity",
    description:
      "Clear briefs, rubrics, marking criteria, and drafts help WriteX quote faster and reduce back-and-forth."
  },
  {
    title: "Revision expectations",
    description:
      "Revision terms depend on the original brief, agreed scope, and whether new instructions are added later."
  }
];

const quoteIncludes = [
  {
    title: "Scope review",
    description:
      "Review of service type, word count, subject, level, deadline, and document condition."
  },
  {
    title: "Expert matching",
    description:
      "Assessment of which academic support specialist, editor, researcher, or reviewer profile is needed."
  },
  {
    title: "Timeline assessment",
    description:
      "Checking whether the deadline allows realistic support and QA."
  },
  {
    title: "File and rubric review",
    description:
      "Review of uploaded briefs, rubrics, drafts, supervisor comments, or SOP prompts."
  },
  {
    title: "Support pathway recommendation",
    description:
      "Clarification of whether the need is editing, research guidance, formatting, referencing, dissertation support, or admissions writing."
  },
  {
    title: "Academic integrity-safe support path",
    description:
      "Support is positioned around guidance, editing, review, formatting, referencing, and learning-focused assistance."
  },
  {
    title: "Revision terms",
    description:
      "Revision expectations are based on the original brief and agreed instructions."
  },
  {
    title: "Clear next step",
    description:
      "The quote should make it clear what happens after approval."
  }
];

const quoteReadinessItems = [
  "Service type, deadline, and brief clarity",
  "Word count, academic level, and subject context",
  "File readiness and WhatsApp fallback for urgent handling"
];

export function QuoteCommandCenter() {
  const shouldReduceMotion = useReducedMotion();
  const [activeScope, setActiveScope] = useState(scopeCards[1].title);
  const [prefillService, setPrefillService] = useState(
    scopeCards[1].serviceValue
  );

  useEffect(() => {
    trackQuoteEvent(quoteTrackingEvents.pricingPageViewed, {
      path: "/pricing"
    });
  }, []);

  return (
    <div className="overflow-hidden bg-wxBg">
      <PageHero
        eyebrow="WriteX Quote Workflow"
        title="Get a Scope-Based Quote for Your Academic Brief"
        description="Share your service type, deadline, academic level, word count, and files. WriteX reviews the scope before confirming the quote."
        animateBackground
        actions={
          <>
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  {
                    trackQuoteEvent(quoteTrackingEvents.heroWhatsappClicked, {
                      source: "pricing_hero_primary"
                    });
                    trackQuoteEvent(quoteTrackingEvents.whatsappQuoteClicked, {
                      source: "pricing_hero_primary"
                    });
                  }
                }
                className="wx-gradient-action inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wxViolet700"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Send Brief on WhatsApp
              </a>
              <Link
                href="/pricing#quote"
                onClick={() =>
                  trackQuoteEvent(quoteTrackingEvents.heroQuoteClicked, {
                    source: "pricing_hero_secondary"
                  })
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-wxBorder bg-white px-5 text-sm font-semibold text-wxIndigo900 shadow-sm transition hover:-translate-y-0.5 hover:border-wxViolet700 hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wxViolet700"
              >
                Get Quote
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
          </>
        }
        microcopy="Confidential review. No fake fixed pricing. Academic integrity-safe support."
        supportVisual={
          <QuoteJourneyVisual shouldReduceMotion={Boolean(shouldReduceMotion)} />
        }
      />

      <section className="border-y border-wxBorder bg-wxSurfaceSoft text-wxIndigo900">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold text-wxViolet700">
              Need faster handling?
            </p>
            <p className="mt-2 text-sm leading-6 text-wxIndigo500">
              For urgent deadlines, send your brief, deadline, word count,
              academic level, and files directly on WhatsApp.
            </p>
          </div>
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              trackQuoteEvent(quoteTrackingEvents.whatsappQuoteClicked, {
                source: "pricing_near_hero_urgent_fallback"
              })
            }
            className="wx-gradient-action inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Send Brief on WhatsApp
          </a>
        </div>
      </section>

      <SpectrumBackground
        variant="subtle"
        overlayStrength="section"
        intensity={0.24}
        className="border-y border-sageBorder"
      >
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-5 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:px-8">
          {trustStripItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.article
                key={item.title}
                className="rounded-md border border-sageBorder bg-white/80 p-4 shadow-sm transition duration-500 hover:-translate-y-1 hover:border-mutedCopper hover:bg-white hover:shadow-soft"
                initial={false}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-charcoalInk">
                  <Icon className="h-4 w-4 shrink-0 text-softTeal" aria-hidden />
                  <p className="text-base font-semibold">{item.title}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slateText">
                  {item.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.18}
        className="py-10 sm:py-12"
      >
        <div className="premium-container">
          <SectionReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-mutedCopper">
                Quote workflow
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
                What happens after you share your brief?
              </h2>
              <p className="mt-5 text-base leading-8 text-slateText">
                WriteX reviews your files and requirements before confirming
                the support pathway and quote.
              </p>
            </div>
          </SectionReveal>

          <div className="relative mt-6">
            <div
              aria-hidden
              className="absolute bottom-0 left-5 top-0 w-px bg-sageBorder lg:hidden"
            />
            <motion.div
              aria-hidden
              className="absolute bottom-0 left-5 top-0 w-px origin-top bg-softTeal lg:hidden"
              initial={shouldReduceMotion ? false : { scaleY: 0 }}
              whileInView={shouldReduceMotion ? undefined : { scaleY: 1 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
            <div
              aria-hidden
              className="absolute left-0 right-0 top-1/2 hidden h-px bg-sageBorder lg:block"
            />
            <motion.div
              aria-hidden
              className="absolute left-0 right-0 top-1/2 hidden h-px origin-left bg-softTeal lg:block"
              initial={shouldReduceMotion ? false : { scaleX: 0 }}
              whileInView={shouldReduceMotion ? undefined : { scaleX: 1 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />

            <div className="grid gap-5 lg:grid-cols-6 lg:gap-4">
            {workflowSteps.map((step, index) => (
              <motion.article
                key={step.title}
                className={`relative z-10 ml-12 h-full overflow-hidden rounded-md border border-sageBorder bg-white p-5 shadow-sm transition duration-500 hover:-translate-y-1 hover:border-mutedCopper hover:shadow-soft lg:ml-0 ${
                  index % 2 === 1 ? "lg:mt-14" : ""
                }`}
                initial={false}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <span
                  aria-hidden
                  className="absolute -left-12 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-softTeal/35 bg-white shadow-[0_0_0_6px_rgba(14,159,186,0.08)] lg:left-1/2 lg:top-auto lg:-translate-x-1/2 lg:-translate-y-[calc(100%+1.9rem)]"
                >
                  <motion.span
                    className="h-3 w-3 rounded-full bg-wxViolet700 shadow-[0_0_20px_rgba(85,22,242,0.32)]"
                    animate={
                      shouldReduceMotion
                        ? undefined
                        : { opacity: [0.68, 1, 0.86], scale: [1, 1.12, 1] }
                    }
                    transition={{
                      duration: motionDurations.slow,
                      ease: motionEase,
                      delay: index * 0.18
                    }}
                  />
                </span>
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-mutedCopper via-softTeal to-transparent"
                />
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-wxSurfaceSoft text-sm font-semibold text-wxViolet700">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-charcoalInk">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slateText">
                  {step.description}
                </p>
              </motion.article>
            ))}
            </div>
          </div>
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.32}
        className="py-10 sm:py-12"
      >
        <div className="premium-container">
          <SectionReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-mutedCopper">
                Scope cards
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
                Choose the support path closest to your brief
              </h2>
              <p className="mt-4 text-base leading-8 text-slateText">
                You do not need to know the exact category. Pick the closest
                option and WriteX will review the scope.
              </p>
            </div>
          </SectionReveal>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {scopeCards.map((card, index) => {
              const active = activeScope === card.title;

              return (
                <ScopeCard
                  key={card.title}
                  title={card.title}
                  bestFor={card.bestFor}
                  factors={card.factors}
                  cta={card.cta}
                  icon={card.icon}
                  active={active}
                  index={index}
                  onClick={() => {
                    setActiveScope(card.title);
                    setPrefillService(card.serviceValue);
                    trackQuoteEvent(quoteTrackingEvents.scopeCardClicked, {
                      scope_card: card.title,
                      service: card.serviceValue
                    });
                    document.getElementById("quote")?.scrollIntoView({
                      behavior: shouldReduceMotion ? "auto" : "smooth",
                      block: "start"
                    });
                  }}
                />
              );
            })}
          </div>
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.26}
        className="py-10 sm:py-12"
      >
        <div className="premium-container">
          <SectionReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-mutedCopper">
                Quote variables
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
                What affects your quote?
              </h2>
              <p className="mt-4 text-base leading-8 text-slateText">
                Academic support is scoped based on the actual requirement. A
                complete brief helps WriteX quote more accurately.
              </p>
            </div>
          </SectionReveal>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quoteFactors.map((factor, index) => (
              <motion.article
                key={factor.title}
                className="group relative overflow-hidden rounded-md border border-sageBorder bg-white p-5 shadow-sm transition duration-500 hover:-translate-y-1 hover:border-mutedCopper hover:bg-warmIvory hover:shadow-soft"
                initial={false}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.42, delay: index * 0.03 }}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mutedCopper via-softTeal to-transparent opacity-70 transition group-hover:opacity-100"
                />
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxViolet700 transition group-hover:bg-wxViolet700 group-hover:text-white">
                    <Layers3 className="h-4 w-4" aria-hidden />
                  </span>
                  <h3 className="text-base font-semibold text-charcoalInk">
                    {factor.title}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-slateText">
                  {factor.description}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.24}
        className="py-10 text-wxIndigo900 sm:py-12"
      >
        <div className="premium-container grid gap-7 lg:grid-cols-[0.76fr_1.24fr] lg:items-start">
          <SectionReveal>
            <div className="lg:sticky lg:top-24">
              <p className="text-sm font-semibold uppercase text-mutedCopper">
                Quote review
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
                What your quote review includes
              </h2>
              <p className="mt-5 text-base leading-8 text-wxIndigo500">
                Before a quote is shared, WriteX looks at the support pathway,
                timeline, files, and academic integrity-safe options.
              </p>
              <div className="mt-7 rounded-md border border-wxBorder bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-wxViolet700" aria-hidden />
                  <p className="text-sm font-semibold text-wxIndigo900">
                    QA-style review before price
                  </p>
                </div>
                <p className="mt-3 text-sm leading-7 text-wxIndigo500">
                  The review helps prevent random pricing by checking files,
                  feasibility, expert fit, and support boundaries before the
                  team shares a quote.
                </p>
              </div>
            </div>
          </SectionReveal>
          <div className="rounded-md border border-wxBorder bg-white/90 p-4 shadow-soft sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-4 rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mutedCopper">
                  Verification checklist
                </p>
                <p className="mt-1 text-sm text-wxIndigo500">
                  Scope, files, timeline, and QA readiness
                </p>
              </div>
              <span className="rounded-md bg-wxViolet700 px-3 py-2 text-xs font-semibold text-white">
                Review
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
            {quoteIncludes.map((item, index) => (
              <motion.article
                key={item.title}
                className="group rounded-md border border-wxBorder bg-white p-5 transition duration-500 hover:-translate-y-1 hover:border-wxViolet700 hover:bg-wxSurfaceSoft"
                initial={false}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-softTeal/35 bg-softTeal/10 text-softTeal transition group-hover:border-wxViolet700 group-hover:bg-wxViolet700 group-hover:text-white">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-wxIndigo900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-wxIndigo500">
                  {item.description}
                </p>
                  </div>
                </div>
              </motion.article>
            ))}
            </div>
          </div>
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.2}
        className="py-8 sm:py-10"
      >
        <span id="quote-panel" className="sr-only" aria-hidden />
        <div className="premium-container grid gap-7 lg:grid-cols-[0.76fr_1fr] lg:items-start">
          <SectionReveal>
            <div className="lg:sticky lg:top-24">
              <p className="text-sm font-semibold uppercase text-mutedCopper">
                Progressive quote form
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
                Start your quote request
              </h2>
              <p className="mt-5 text-base leading-8 text-slateText">
                A complete brief helps WriteX quote faster and more
                accurately. The form captures the details the team needs to
                qualify the enquiry without forcing everything into one long
                intake screen.
              </p>
              <div className="mt-6 rounded-md border border-sageBorder bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <UploadCloud className="h-5 w-5 text-softTeal" aria-hidden />
                  <h3 className="text-base font-semibold text-charcoalInk">
                    Keep the request easy to review
                  </h3>
                </div>
                <div className="mt-4 grid gap-2">
                  {quoteReadinessItems.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-md bg-paleSage px-3 py-2 text-xs font-semibold text-slateText"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-4 rounded-md border border-sageBorder bg-white px-4 py-3 text-sm font-semibold leading-6 text-charcoalInk">
                Confidential review. Scope-based quote. WhatsApp available for
                urgent files.
              </p>
            </div>
          </SectionReveal>
          <SectionReveal delay={0.08}>
            <QuoteForm prefillService={prefillService} />
          </SectionReveal>
        </div>
      </SpectrumBackground>

      {process.env.NEXT_PUBLIC_TERM_PLAN_INTEREST_ENABLED === "true" ? <TermPlanInterest /> : null}

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.24}
        className="py-8 sm:py-10"
      >
        <div className="premium-container grid gap-7 lg:grid-cols-[0.8fr_1fr]">
          <SectionReveal>
            <p className="text-sm font-semibold uppercase text-mutedCopper">FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
              Quote request FAQ
            </h2>
            <p className="mt-5 text-base leading-8 text-slateText">
              Practical answers before you share an academic brief, draft,
              rubric, deadline, or admissions document.
            </p>
          </SectionReveal>
          <SectionReveal delay={0.08}>
            <FAQ items={pricingFaqs} />
          </SectionReveal>
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.18}
        className="py-8 sm:py-10"
      >
        <div className="premium-container">
          <SectionReveal>
            <div className="relative overflow-hidden rounded-md border border-wxBorder bg-white p-6 text-wxIndigo900 shadow-lift sm:p-8">
              <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-spectrum" />
              <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
                <div>
                  <p className="text-sm font-semibold uppercase text-wxViolet700">
                    Final step
                  </p>
                  <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-wxIndigo900 sm:text-5xl">
                    Ready to understand the scope before your deadline?
                  </h2>
                  <p className="mt-5 max-w-2xl text-base leading-8 text-wxIndigo500">
                    Share your brief, files, academic level, word count, and
                    deadline. WriteX will review the support pathway before
                    quoting.
                  </p>
                  <p className="mt-4 text-sm font-semibold text-wxViolet700">
                    Confidential review. Scope-based quote. Academic
                    integrity-safe support.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    trackQuoteEvent(quoteTrackingEvents.finalCtaClicked, {
                      cta: "whatsapp",
                      source: "pricing_final_cta"
                    });
                    trackQuoteEvent(quoteTrackingEvents.whatsappQuoteClicked, {
                      source: "pricing_final_cta"
                    });
                  }}
                  className="wx-gradient-action inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition hover:-translate-y-0.5"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Send Brief on WhatsApp
                </a>
                <Link
                  href="/pricing#quote"
                  onClick={() =>
                    trackQuoteEvent(quoteTrackingEvents.finalCtaClicked, {
                      cta: "quote_request",
                      source: "pricing_final_cta"
                    })
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-wxBorder bg-white px-5 text-sm font-semibold text-wxIndigo900 transition hover:-translate-y-0.5 hover:border-wxViolet700 hover:text-wxViolet700"
                >
                  Get Quote
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </SpectrumBackground>
    </div>
  );
}

function QuoteJourneyVisual({
  shouldReduceMotion
}: {
  shouldReduceMotion: boolean;
}) {
  return (
    <motion.div
      className="relative hidden min-h-[22rem] overflow-hidden rounded-md border border-wxBorder bg-white/80 p-4 shadow-lift backdrop-blur md:block"
      initial={shouldReduceMotion ? false : { opacity: 0.94, y: 10 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: motionDurations.slow, ease: motionEase, delay: 0.18 }}
    >
      <div className="absolute inset-0 rounded-md bg-[var(--wx-page-canvas)]" />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-wxViolet700">
            Quote workflow
          </p>
          <p className="mt-2 text-2xl font-semibold text-wxIndigo900">
            Scope review desk
          </p>
        </div>
        <span className="wx-gradient-action rounded-md px-3 py-2 text-xs font-semibold text-white shadow-sm">
          Human review
        </span>
      </div>

      <div className="relative z-10 mt-5 grid gap-3 sm:hidden">
        {heroVisualCards.map((card, index) => (
          <motion.div
            key={card.label}
            className="rounded-md border border-wxBorder bg-white/90 p-4 shadow-sm"
            initial={shouldReduceMotion ? false : { opacity: 0.86, y: 8 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: motionDurations.normal, ease: motionEase, delay: 0.25 + index * 0.08 }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-wxIndigo900">{card.label}</p>
                <p className="mt-1 text-xs text-wxIndigo500">{card.detail}</p>
              </div>
              <StatusPulse color={card.accent} shouldReduceMotion={shouldReduceMotion} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="absolute inset-x-5 bottom-5 top-20 hidden sm:block">
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 520 300"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M70 58 C150 72 204 94 260 134 C315 96 370 76 452 62"
            fill="none"
            stroke="rgba(11,129,247,0.42)"
            strokeWidth="2"
            strokeDasharray="8 10"
            initial={shouldReduceMotion ? false : { pathLength: 0.18, opacity: 0.5 }}
            animate={shouldReduceMotion ? undefined : { pathLength: 1, opacity: 0.82 }}
            transition={{ duration: 0.9, ease: motionEase, delay: 0.42 }}
          />
          <motion.path
            d="M260 134 C206 194 152 226 76 250 M260 134 C318 194 376 226 448 250"
            fill="none"
            stroke="rgba(184,44,224,0.38)"
            strokeWidth="2"
            strokeDasharray="5 12"
            initial={shouldReduceMotion ? false : { pathLength: 0.2, opacity: 0.4 }}
            animate={shouldReduceMotion ? undefined : { pathLength: 1, opacity: 0.72 }}
            transition={{ duration: 0.9, ease: motionEase, delay: 0.68 }}
          />
        </svg>

        {heroVisualCards.map((card, index) => (
          <motion.div
            key={card.label}
            className={`absolute rounded-md border border-wxBorder bg-white/90 px-4 py-3 shadow-soft backdrop-blur ${card.className}`}
            style={{
              boxShadow: `0 18px 42px rgba(28,39,117,0.10), inset 3px 0 0 ${card.accent}`
            }}
            initial={shouldReduceMotion ? false : { opacity: 0.84, y: 8 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: motionDurations.normal,
              ease: motionEase,
              delay: 0.38 + index * 0.08
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-wxIndigo900">{card.label}</p>
                <p className="mt-1 text-xs text-wxIndigo500">{card.detail}</p>
              </div>
              {card.label.startsWith("Scope") ||
              card.label.startsWith("Expert") ||
              card.label.startsWith("QA") ||
              card.label.startsWith("Quote") ? (
                <StatusPulse color={card.accent} shouldReduceMotion={shouldReduceMotion} />
              ) : (
                <span
                  className="mt-1 h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: card.accent }}
                />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function StatusPulse({
  color = "#5516F2",
  shouldReduceMotion
}: {
  color?: string;
  shouldReduceMotion: boolean;
}) {
  return (
    <motion.span
      aria-hidden
      className="mt-1 h-2.5 w-2.5 rounded-full"
      style={{
        backgroundColor: color,
        boxShadow: `0 0 18px ${color}66`
      }}
      animate={
        shouldReduceMotion
          ? undefined
          : { opacity: [0.72, 1, 0.9], scale: [1, 1.14, 1] }
      }
      transition={{ duration: motionDurations.slow, ease: motionEase, delay: 0.9 }}
    />
  );
}
