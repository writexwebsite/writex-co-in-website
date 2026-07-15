"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { motionDurations, motionEase } from "@/lib/motion";

type AnimatedTextProps = {
  children: ReactNode;
  className?: string;
  as?: "p" | "span" | "div" | "h1" | "h2";
  delay?: number;
};

export function AnimatedText({
  children,
  className,
  as = "div",
  delay = 0
}: AnimatedTextProps) {
  const shouldReduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0.98, y: 14 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: motionDurations.slow, ease: motionEase, delay }}
    >
      {children}
    </Component>
  );
}
