"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FileText, SearchCheck, ShieldCheck, UserCheck, Waypoints } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const steps: Array<{ title: string; copy: string; icon: LucideIcon; tone: string }> = [
  { title: "Share Brief", copy: "Send the brief, rubric, draft, lecture notes, or formatting requirements.", icon: FileText, tone: "text-wxBlue500 bg-wxBlue500/10" },
  { title: "Scope Review", copy: "Requirements and deadline are checked.", icon: SearchCheck, tone: "text-wxViolet700 bg-wxViolet700/10" },
  { title: "Expert Match", copy: "The right subject capability is selected.", icon: UserCheck, tone: "text-wxMagenta500 bg-wxMagenta500/10" },
  { title: "QA Review", copy: "Quality checks are planned into the workflow.", icon: ShieldCheck, tone: "text-wxPink500 bg-wxPink500/10" },
  { title: "Clear Next Step", copy: "You receive the scope, quote, and timeline.", icon: Waypoints, tone: "text-wxGreen500 bg-wxGreen500/10" }
];

export function CommandProtocol() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-wxSurfaceSoft/60 py-12 sm:py-14">
      <div className="premium-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-wxViolet700">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-wxIndigo900 sm:text-4xl">A structured path from brief to support</h2>
          <p className="mt-3 text-base leading-7 text-wxIndigo500">One clear workflow keeps requirements, responsibility, and timing visible before support begins.</p>
        </div>

        <ol className="relative mt-8 grid gap-3 md:grid-cols-5">
          <div aria-hidden className="absolute left-[10%] right-[10%] top-7 hidden h-0.5 bg-gradient-to-r from-wxBlue500 via-wxViolet700 via-wxPink500 to-wxGreen500 md:block" />
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.li
                key={step.title}
                className="relative flex gap-3 rounded-xl border border-wxViolet700/10 bg-white p-4 shadow-[0_10px_28px_rgba(61,42,140,0.07)] md:block md:min-h-[11.5rem] md:text-center"
                initial={reduceMotion ? false : { opacity: 0.92, y: 14 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-70px" }}
                transition={{ duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={`relative z-10 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${step.tone}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="md:mt-4">
                  <h3 className="text-base font-semibold text-wxIndigo900">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-wxIndigo500">{step.copy}</p>
                </div>
                {index < steps.length - 1 ? <ArrowRight className="absolute -right-2.5 top-6 z-20 hidden h-5 w-5 text-wxViolet700 md:block" aria-hidden /> : null}
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

