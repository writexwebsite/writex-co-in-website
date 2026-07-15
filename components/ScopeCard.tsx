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
      className={cn(
        "group flex h-full flex-col rounded-md border p-5 text-left shadow-sm transition duration-200",
        active
          ? "border-violet-200 bg-white text-wxIndigo900 shadow-[0_14px_36px_rgba(118,39,218,0.10)] ring-2 ring-wxViolet700/10"
          : "border-sageBorder bg-white text-charcoalInk hover:-translate-y-1 hover:border-mutedCopper hover:shadow-soft"
      )}
      style={
        active
          ? {
              background:
                "linear-gradient(135deg, #faf7ff 0%, #ffffff 52%, #fff8fb 100%)"
            }
          : undefined
      }
      initial={shouldReduceMotion ? false : { opacity: 0.9, y: 12 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: motionDurations.slow, ease: motionEase, delay: index * 0.04 }}
      aria-pressed={active}
      onClick={onClick}
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-md",
          active ? "bg-white text-wxViolet700 ring-1 ring-violet-200 shadow-sm" : "bg-wxSurfaceSoft text-wxViolet700"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p
        className={cn(
          "mt-4 text-sm font-semibold",
          active ? "text-wxViolet700" : "text-softTeal"
        )}
      >
        Best for:
      </p>
      <p
        className={cn(
          "mt-2 text-sm leading-7",
          active ? "text-wxIndigo700" : "text-slateText"
        )}
      >
        {bestFor}
      </p>
      <p
        className={cn(
          "mt-5 text-sm font-semibold",
          active ? "text-wxViolet700" : "text-softTeal"
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
              active ? "text-wxIndigo700" : "text-slateText"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                active ? "bg-wxViolet700" : "bg-softTeal"
              )}
              aria-hidden
            />
            {factor}
          </li>
        ))}
      </ul>
      <span
        className={cn(
          "mt-6 inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold transition group-hover:translate-y-[-2px]",
          active
            ? "border-violet-200 bg-white/85 text-wxIndigo900 shadow-sm group-hover:border-wxViolet700/50 group-hover:bg-white"
            : "border-sageBorder bg-paleSage text-charcoalInk group-hover:border-mutedCopper group-hover:bg-warmIvory"
        )}
      >
        {cta}
      </span>
    </motion.button>
  );
}
