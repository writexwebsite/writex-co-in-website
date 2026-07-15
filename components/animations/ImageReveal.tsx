"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { motionDurations, motionEase, motionViewport } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ImageRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function ImageReveal({
  children,
  className,
  delay = 0
}: ImageRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("wx-image-reveal overflow-hidden", className)}
      initial={shouldReduceMotion ? false : { opacity: 0.98, y: 12, scale: 0.99 }}
      whileInView={
        shouldReduceMotion
          ? undefined
          : { opacity: 1, y: 0, scale: 1 }
      }
      viewport={motionViewport}
      transition={{ duration: motionDurations.slow, ease: motionEase, delay }}
    >
      {children}
    </motion.div>
  );
}
