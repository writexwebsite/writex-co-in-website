"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  LockKeyhole,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { SpectrumBackground } from "./visual/SpectrumBackground";

const whyPoints = [
  {
    title: "Brief alignment",
    copy: "The request is checked against the brief, rubric, and support need.",
    icon: FileSearch
  },
  {
    title: "Rubric and structure review",
    copy: "Instructions, structure, headings, and argument flow are reviewed.",
    icon: UserCheck
  },
  {
    title: "Citation and language clarity",
    copy: "References, academic tone, readability, and formatting are checked.",
    icon: ShieldCheck
  },
  {
    title: "Confidential file handling",
    copy: "Briefs, drafts, prompts, and conversations stay inside the workflow.",
    icon: LockKeyhole
  }
];

export function WhyWriteX() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <SpectrumBackground variant="section" overlayStrength="strong" intensity={0.22} className="py-12" as="section">
      <div className="premium-container grid gap-7 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <motion.div
          id="about-us"
          initial={false}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-sm font-semibold uppercase text-softTeal">
            Quality
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
            Reviewed before it reaches you.
          </h2>
          <p className="mt-4 text-base leading-7 text-slateText">
            WriteX checks brief alignment, structure, citations, language, and
            file handling through one confidential review sequence.
          </p>
        </motion.div>

        <motion.div
          className="relative rounded-md border border-sageBorder bg-warmIvory p-5 shadow-soft"
          initial={false}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            aria-hidden
            className="absolute inset-0 rounded-md bg-[radial-gradient(circle_at_18%_16%,rgba(11,129,247,0.08),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(232,56,116,0.1),transparent_30%)]"
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-4 border-b border-sageBorder pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-softTeal">
                  QA snapshot
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-charcoalInk">
                  Review, clarify, protect
                </h3>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxViolet700">
                <ClipboardCheck className="h-5 w-5" aria-hidden />
              </span>
            </div>

            <div className="relative mt-5">
              <div className="absolute left-5 top-5 hidden h-[calc(100%-2.5rem)] w-px bg-sageBorder sm:block" />
              <motion.div
                className="absolute left-5 top-5 hidden h-[calc(100%-2.5rem)] w-px origin-top bg-softTeal sm:block"
                initial={shouldReduceMotion ? false : { scaleY: 0 }}
                whileInView={shouldReduceMotion ? undefined : { scaleY: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {whyPoints.map((point, index) => {
                  const Icon = point.icon;

                  return (
                    <motion.div
                      key={point.title}
                      className="relative grid gap-3 rounded-md border border-sageBorder bg-white p-4 shadow-sm sm:grid-cols-[2.25rem_1fr]"
                      initial={false}
                      whileInView={
                        shouldReduceMotion ? undefined : { opacity: 1, x: 0 }
                      }
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1],
                        delay: index * 0.055
                      }}
                    >
                      <motion.span
                        className="relative z-10 flex h-10 w-10 items-center justify-center rounded-md bg-softTeal/10 text-softTeal ring-4 ring-white"
                        whileInView={
                          shouldReduceMotion
                            ? undefined
                            : { scale: [1, 1.08, 1], color: "#0E9FBA" }
                        }
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{
                          duration: 0.55,
                          ease: [0.22, 1, 0.36, 1],
                          delay: 0.1 + index * 0.06
                        }}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </motion.span>
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-semibold text-charcoalInk">
                            {point.title}
                          </h4>
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-softTeal"
                            aria-hidden
                          />
                        </div>
                        <p className="mt-1.5 text-sm leading-6 text-slateText">
                          {point.copy}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </SpectrumBackground>
  );
}
