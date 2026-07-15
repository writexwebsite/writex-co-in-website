"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, type ReactNode } from "react";
import {
  motionDurations,
  motionEase,
  motionViewport,
  visibleRevealEnd,
  visibleRevealStart
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type StaggerElement = "div" | "ul" | "ol";

type StaggerProps = {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  as?: StaggerElement;
  delay?: number;
  stagger?: number;
};

const motionElements = {
  div: motion.div,
  ul: motion.ul,
  ol: motion.ol
};

export function Stagger({
  children,
  className,
  itemClassName,
  as = "div",
  delay = 0,
  stagger = 0.045
}: StaggerProps) {
  const shouldReduceMotion = useReducedMotion();
  const Component = motionElements[as];
  const items = Children.toArray(children);

  if (shouldReduceMotion) {
    return (
      <Component className={cn("wx-stagger", className)}>
        {items.map((child) =>
          isValidElement(child) ? (
            <div key={child.key} className={itemClassName}>
              {child}
            </div>
          ) : (
            child
          )
        )}
      </Component>
    );
  }

  return (
    <Component
      className={cn("wx-stagger", className)}
      initial="hidden"
      whileInView="visible"
      viewport={motionViewport}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: stagger
          }
        }
      }}
    >
      {items.map((child) =>
        isValidElement(child) ? (
          <motion.div
            key={child.key}
            className={itemClassName}
            variants={{
              hidden: visibleRevealStart,
              visible: visibleRevealEnd
            }}
            transition={{ duration: motionDurations.slow, ease: motionEase }}
          >
            {child}
          </motion.div>
        ) : (
          child
        )
      )}
    </Component>
  );
}
