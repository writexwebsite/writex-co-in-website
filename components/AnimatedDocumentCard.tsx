"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileText } from "lucide-react";
import { motionDurations, motionEase, motionViewport } from "@/lib/motion";
import { cn } from "@/lib/utils";

type AnimatedDocumentCardProps = {
  title: string;
  eyebrow?: string;
  detail?: string;
  className?: string;
};

export function AnimatedDocumentCard({
  title,
  eyebrow = "Brief file",
  detail = "Requirements, rubric, deadline, and review notes",
  className
}: AnimatedDocumentCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.article
      className={cn(
        "rounded-md border border-sageBorder bg-white p-5 shadow-soft",
        className
      )}
      initial={shouldReduceMotion ? false : { opacity: 0.9, y: 12 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0, rotate: 0 }}
      viewport={motionViewport}
      transition={{ duration: motionDurations.slow, ease: motionEase }}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxViolet700">
          <FileText className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mutedCopper">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-charcoalInk">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slateText">{detail}</p>
        </div>
      </div>
    </motion.article>
  );
}
