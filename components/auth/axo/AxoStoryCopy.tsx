"use client";

import { AnimatePresence, motion } from "framer-motion";
import { axoStories, type AxoStoryVariant } from "@/lib/auth/axoStoryConfig";

export function AxoStoryCopy({ variant, activeIndex }: { variant: AxoStoryVariant; activeIndex: number }) {
  const beat = axoStories[variant][activeIndex];
  return (
    <div className="pointer-events-none absolute bottom-[7%] left-[7%] z-20 max-w-[31rem] pr-6">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${variant}-${activeIndex}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-wxViolet700">WriteX secure access</p>
          <h2 className="mt-3 text-[clamp(1.8rem,2.5vw,3.1rem)] font-semibold leading-[1.05] text-wxIndigo900">
            {beat.title}
          </h2>
          <p className="mt-3 max-w-md text-base leading-7 text-wxIndigo500">{beat.description}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
