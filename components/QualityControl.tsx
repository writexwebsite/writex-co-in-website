"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  AlignLeft,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileSearch,
  ListChecks,
  PenLine,
  Rows3,
  ShieldCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const qaCheckpoints: Array<{
  title: string;
  copy: string;
  icon: LucideIcon;
}> = [
  {
    title: "Brief alignment",
    copy: "Checks whether the support matches the actual instructions and marking criteria.",
    icon: FileSearch
  },
  {
    title: "Rubric review",
    copy: "Highlights assessment requirements, learning outcomes, or supervisor notes where provided.",
    icon: ClipboardCheck
  },
  {
    title: "Structure review",
    copy: "Reviews logical flow, sectioning, headings, and argument progression.",
    icon: Rows3
  },
  {
    title: "Research logic",
    copy: "Checks whether the document follows a clear academic direction.",
    icon: BookOpenCheck
  },
  {
    title: "Citation and referencing check",
    copy: "Reviews citation consistency, missing references, and formatting style.",
    icon: ListChecks
  },
  {
    title: "Language clarity",
    copy: "Improves readability, academic tone, grammar, and sentence-level clarity.",
    icon: PenLine
  },
  {
    title: "Formatting review",
    copy: "Checks layout, headings, spacing, tables, figures, and university-style requirements where provided.",
    icon: AlignLeft
  },
  {
    title: "Final QA",
    copy: "Confirms the file follows agreed instructions before delivery.",
    icon: ShieldCheck
  }
];

export function QualityControl() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative">
      <motion.div
        className="relative overflow-hidden rounded-md border border-wxBorder bg-white/90 p-5 text-wxIndigo900 shadow-soft backdrop-blur"
        initial={false}
        whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          aria-hidden
          className="absolute inset-0 rounded-md bg-[radial-gradient(circle_at_18%_12%,rgba(11,129,247,0.12),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(232,56,116,0.12),transparent_30%)]"
        />
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-spectrum" />

        <div className="relative">
          <div className="flex flex-col gap-5 border-b border-wxBorder pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-wxViolet700">
                QA dashboard
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-wxIndigo900">
                Review checkpoints before delivery
              </h3>
            </div>
            <div className="grid gap-2 text-sm text-wxIndigo500 sm:grid-cols-3">
              {["Brief", "Review", "QA"].map((item, index) => (
                <motion.div
                  key={item}
                  className="rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 py-3"
                  initial={false}
                  whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    duration: 0.45,
                    ease: [0.22, 1, 0.36, 1],
                    delay: index * 0.08
                  }}
                >
                  <span className="block text-xs uppercase tracking-[0.14em] text-wxBlue500">
                    Stage {index + 1}
                  </span>
                  <span className="mt-1 block font-semibold text-wxIndigo900">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative mt-6">
            <div className="absolute left-5 top-5 hidden h-[calc(100%-2.5rem)] w-px bg-wxBorder lg:block" />
            <motion.div
              className="absolute left-5 top-5 hidden h-[calc(100%-2.5rem)] w-px origin-top bg-gradient-to-b from-wxBlue500 via-wxViolet700 to-wxGreen500 lg:block"
              initial={shouldReduceMotion ? false : { scaleY: 0 }}
              whileInView={shouldReduceMotion ? undefined : { scaleY: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
            />

            <div className="grid gap-4 lg:grid-cols-2 lg:pl-14">
              {qaCheckpoints.map((checkpoint, index) => {
                const Icon = checkpoint.icon;
                const active = index === 0 || index === 7;

                return (
                  <motion.article
                    key={checkpoint.title}
                    className="relative rounded-md border border-wxBorder bg-white p-5 shadow-sm transition duration-500 hover:-translate-y-1 hover:border-wxViolet700 hover:bg-wxSurfaceSoft"
                    initial={false}
                    whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{
                      duration: 0.52,
                      ease: [0.22, 1, 0.36, 1],
                      delay: index * 0.045
                    }}
                  >
                    <motion.span
                      className="absolute -left-[3.55rem] top-5 hidden h-3 w-3 rounded-full bg-wxBlue500 shadow-[0_0_0_6px_rgba(11,129,247,0.12)] lg:block"
                      whileInView={
                        shouldReduceMotion
                          ? undefined
                          : {
                              scale: [1, 1.35, 1],
                              backgroundColor: active ? "#5516F2" : "#0B81F7"
                            }
                      }
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{
                        duration: 0.58,
                        ease: [0.22, 1, 0.36, 1],
                        delay: 0.12 + index * 0.05
                      }}
                    />

                    <div className="flex items-start gap-4">
                      <motion.span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${
                          active ? "bg-wxViolet700 text-white" : "bg-softTeal/10 text-softTeal"
                        }`}
                        whileInView={
                          shouldReduceMotion ? undefined : { scale: [1, 1.08, 1] }
                        }
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{
                          duration: 0.5,
                          ease: [0.22, 1, 0.36, 1],
                          delay: index * 0.04
                        }}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </motion.span>
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-wxIndigo500">
                              Check {String(index + 1).padStart(2, "0")}
                            </p>
                            <h4 className="mt-2 text-lg font-semibold text-wxIndigo900">
                              {checkpoint.title}
                            </h4>
                          </div>
                          <CheckCircle2
                            className={`mt-1 h-5 w-5 shrink-0 ${
                              active ? "text-mutedCopper" : "text-softTeal"
                            }`}
                            aria-hidden
                          />
                        </div>
                        <p className="mt-3 text-sm leading-7 text-wxIndigo500">
                          {checkpoint.copy}
                        </p>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>

          <motion.div
            className="mt-6 rounded-md border border-wxBorder bg-wxSurfaceSoft p-5"
            initial={false}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-wxViolet700 text-white">
                <FileCheck2 className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-wxIndigo900">
                  This is not random writing. This is reviewed support.
                </p>
                <p className="mt-1 text-sm leading-6 text-wxIndigo500">
                  QA is planned around the original brief and the support path
                  agreed before work starts.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
