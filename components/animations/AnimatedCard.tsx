"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { motionDurations, motionEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

export function AnimatedCard({
  children,
  className,
  hover = true
}: AnimatedCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("wx-card-hover", className)}
      whileHover={hover && !shouldReduceMotion ? { y: -3 } : undefined}
      whileFocus={hover && !shouldReduceMotion ? { y: -2 } : undefined}
      transition={{ duration: motionDurations.normal, ease: motionEase }}
    >
      {children}
    </motion.div>
  );
}
