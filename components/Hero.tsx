"use client";

import { CheckCircle2, FileText, LockKeyhole, SearchCheck, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AcademicCommandVisual } from "./AcademicCommandVisual";
import { AnimatedText } from "./AnimatedText";
import { CTAButton } from "./CTAButton";
import { MagneticButton } from "./MagneticButton";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { SpectrumBackground } from "./visual/SpectrumBackground";

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  const animation = shouldReduceMotion
    ? {}
    : {
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const }
      };

  return (
    <SpectrumBackground
      variant="hero"
      overlayStrength="hero"
      animate
      position="center bottom"
      className="text-wxIndigo900"
    >
      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:min-h-[37rem] lg:grid-cols-[1.12fr_0.88fr] lg:px-8 lg:py-14">
        <motion.div className="max-w-3xl" {...animation}>
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-wxViolet700/15 bg-white/80 px-3 py-2 text-sm font-semibold text-wxIndigo700 shadow-sm backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-wxViolet700" aria-hidden />
            Academic Support &amp; Review
          </div>
          <AnimatedText
            as="h1"
            className="max-w-[43rem] text-4xl font-semibold leading-[1.06] text-wxIndigo900 sm:text-5xl lg:text-[3.75rem]"
            delay={0.04}
          >
            Academic Support for Complex Briefs and Tight Deadlines.
          </AnimatedText>
          <AnimatedText
            as="p"
            className="mt-5 max-w-2xl text-base leading-7 text-wxIndigo500 sm:text-lg"
            delay={0.12}
          >
            WriteX helps university students structure, review, edit, reference, and
            improve academic documents through confidential, QA-led academic
            support.
          </AnimatedText>

          <motion.div
            className="mt-6 flex flex-col gap-3 sm:flex-row"
            initial={shouldReduceMotion ? false : { opacity: 0.92, y: 10 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: 0.34,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.18
            }}
          >
            <MagneticButton>
              <WhatsAppCTA label="Get Quote on WhatsApp" />
            </MagneticButton>
            <MagneticButton>
              <CTAButton
                href="/pricing#quote"
                variant="secondary"
                icon={FileText}
              >
                Share Brief for Review
              </CTAButton>
            </MagneticButton>
          </motion.div>

          <motion.ul
            className="mt-5 grid max-w-2xl grid-cols-2 gap-x-4 gap-y-2 text-sm font-semibold leading-6 text-wxIndigo500 sm:flex sm:flex-wrap"
            initial={shouldReduceMotion ? false : { opacity: 0.92, y: 8 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: 0.32,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.28
            }}
          >
            {[
              { label: "Clear Scope", icon: SearchCheck },
              { label: "Confidential Handling", icon: LockKeyhole },
              { label: "Human Review", icon: CheckCircle2 },
              { label: "QA-Led Support", icon: ShieldCheck }
            ].map(({ label, icon: Icon }) => (
              <li key={label} className="inline-flex items-center gap-2 sm:mr-3">
                <Icon className="h-4 w-4 text-wxViolet700" aria-hidden />
                {label}
              </li>
            ))}
          </motion.ul>

        </motion.div>
        <AcademicCommandVisual />
      </div>
    </SpectrumBackground>
  );
}
