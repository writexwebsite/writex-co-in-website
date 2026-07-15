"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 24,
    restDelta: 0.001
  });

  if (shouldReduceMotion) return null;

  return (
    <motion.div
      aria-hidden
      className="fixed left-0 top-0 z-[70] h-1 w-full origin-left bg-gradient-to-r from-softTeal via-mutedCopper to-white"
      style={{ scaleX }}
    />
  );
}
