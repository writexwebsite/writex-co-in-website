"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { FAQItem } from "@/lib/content";
import { motionDurations, motionEase } from "@/lib/motion";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";

type FAQProps = {
  items: readonly FAQItem[];
};

export function FAQ({ items }: FAQProps) {
  const [active, setActive] = useState(0);
  const accordionId = useId();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="divide-y divide-wxViolet700/10 rounded-xl border border-wxViolet700/10 bg-white shadow-[0_12px_34px_rgba(61,42,140,0.07)]">
      {items.map((item, index) => {
        const open = active === index;
        const buttonId = `${accordionId}-button-${index}`;
        const panelId = `${accordionId}-panel-${index}`;

        return (
          <div key={item.question}>
            <button
              id={buttonId}
              type="button"
              className="group flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-wxIndigo900 transition hover:bg-wxSurfaceSoft/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wxViolet700 sm:px-6"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => {
                setActive(open ? -1 : index);
                if (!open) {
                  trackQuoteEvent(quoteTrackingEvents.faqOpened, {
                    question: item.question,
                    index
                  });
                }
              }}
            >
              <span className="leading-7">{item.question}</span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-wxViolet700 transition duration-300 group-hover:translate-y-0.5",
                  open && "rotate-180"
                )}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="px-5 pb-5 text-sm leading-7 text-wxIndigo500 sm:px-6"
                  initial={shouldReduceMotion ? false : { opacity: 0.94, y: -4 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0.94, y: -3 }}
                  transition={{ duration: motionDurations.normal, ease: motionEase }}
                >
                  {item.answer}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
