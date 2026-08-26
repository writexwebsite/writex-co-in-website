"use client";

import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { motionDurations, motionEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ScopeCardProps = {
  title: string;
  bestFor: string;
  factors: string[];
  cta: string;
  icon: LucideIcon;
  active?: boolean;
  index?: number;
  onClick?: () => void;
};

export function ScopeCard({
  title,
  bestFor,
  factors,
  cta,
  icon: Icon,
  active = false,
  index = 0,
  onClick
}: ScopeCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      data-state={active ? "selected" : "default"}
      className={cn(
        "wx-interactive-state group flex h-full flex-col rounded-md border p-5 text-left shadow-sm transition duration-200",
        !active && "hover:-translate-y-1 hover:shadow-soft"
      )}
      initial={shouldReduceMotion ? false : { opacity: 0.9, y: 12 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: motionDurations.slow, ease: motionEase, delay: index * 0.04 }}
      aria-pressed={active}
      onClick={onClick}
    >
      <span
        className="wx-state-icon-surface flex h-11 w-11 items-center justify-center rounded-md"
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p
        className={cn(
          "mt-4 text-sm font-semibold",
          active ? "wx-state-accent" : "text-softTeal"
        )}
      >
        Best for:
      </p>
      <p
        className={cn(
          "mt-2 text-sm leading-7",
          active ? "wx-state-muted" : "text-slateText"
        )}
      >
        {bestFor}
      </p>
      <p
        className={cn(
          "mt-5 text-sm font-semibold",
          active ? "wx-state-accent" : "text-softTeal"
        )}
      >
        What affects quote:
      </p>
      <ul className="mt-3 grid gap-2">
        {factors.map((factor) => (
          <li
            key={factor}
            className={cn(
              "flex items-center gap-2 text-sm",
              active ? "wx-state-muted" : "text-slateText"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                active ? "wx-state-dot" : "bg-softTeal"
              )}
              aria-hidden
            />
            {factor}
          </li>
        ))}
      </ul>
      <span
        className={cn(
          "wx-state-action mt-6 inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold transition group-hover:translate-y-[-2px]",
          !active &&
            "border-sageBorder bg-paleSage text-charcoalInk group-hover:border-mutedCopper group-hover:bg-warmIvory"
        )}
      >
        {cta}
      </span>
    </motion.button>
  );
}
