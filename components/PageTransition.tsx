"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { motionEase } from "@/lib/motion";

export function PageTransition() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 bg-gradient-to-r from-wxViolet700 via-wxPink500 to-wxOrange500"
        initial={{ scaleX: 0, opacity: 0.9 }}
        animate={{ scaleX: 1, opacity: [0.9, 0.72, 0] }}
        exit={{ opacity: 0 }}
        style={{ transformOrigin: "left" }}
        transition={{ duration: 0.38, ease: motionEase }}
        aria-hidden
      />
    </AnimatePresence>
  );
}
