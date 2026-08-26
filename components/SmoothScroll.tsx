"use client";

import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopPointer = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    if (reduceMotion.matches || !desktopPointer.matches) return;

    let disposed = false;
    let frame = 0;
    let destroy: (() => void) | undefined;

    void import("lenis").then(({ default: Lenis }) => {
      if (disposed) return;

      const lenis = new Lenis({
        duration: 0.85,
        lerp: 0.12,
        wheelMultiplier: 0.9
      });
      const raf = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(raf);
      };

      frame = requestAnimationFrame(raf);
      destroy = () => lenis.destroy();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      destroy?.();
    };
  }, []);

  return null;
}
