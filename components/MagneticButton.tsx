"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { ReactNode } from "react";

type MagneticButtonProps = {
  children: ReactNode;
  className?: string;
};

export function MagneticButton({ children, className }: MagneticButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 240, damping: 26 });
  const springY = useSpring(y, { stiffness: 240, damping: 26 });

  return (
    <motion.span
      className={className}
      style={{ x: springX, y: springY }}
      onPointerMove={(event) => {
        if (shouldReduceMotion) return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - rect.left - rect.width / 2) * 0.035);
        y.set((event.clientY - rect.top - rect.height / 2) * 0.045);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}
