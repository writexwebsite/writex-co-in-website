"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
  motionDurations,
  motionEase,
  motionViewport,
  visibleRevealEnd,
  visibleRevealStart
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type RevealElement = "div" | "section" | "article" | "footer" | "li" | "span";
type RevealVariant = "up" | "fade" | "image";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: RevealElement;
  variant?: RevealVariant;
  once?: boolean;
};

const motionElements = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  footer: motion.footer,
  li: motion.li,
  span: motion.span
};

const variants = {
  up: {
    hidden: visibleRevealStart,
    visible: visibleRevealEnd
  },
  fade: {
    hidden: { opacity: 0.9 },
    visible: { opacity: 1 }
  },
  image: {
    hidden: { opacity: 0.88, y: 14, scale: 0.99, filter: "blur(5px)" },
    visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
  }
};

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  variant = "up",
  once = true
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const Component = motionElements[as];

  if (shouldReduceMotion) {
    return <Component className={cn("wx-reveal", className)}>{children}</Component>;
  }

  return (
    <Component
      className={cn(
        "wx-reveal",
        variant === "up" && "wx-reveal-up",
        variant === "fade" && "wx-fade-in",
        variant === "image" && "wx-image-reveal",
        className
      )}
      initial="hidden"
      whileInView="visible"
      viewport={{ ...motionViewport, once }}
      variants={variants[variant]}
      transition={{ duration: motionDurations.slow, ease: motionEase, delay }}
    >
      {children}
    </Component>
  );
}
