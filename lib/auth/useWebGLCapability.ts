"use client";

import { useEffect, useState } from "react";

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function useWebGLCapability() {
  const [capable, setCapable] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const memory = (navigator as NavigatorWithMemory).deviceMemory;
      const enoughMemory = memory == null || memory >= 4;
      const enoughCores = navigator.hardwareConcurrency == null || navigator.hardwareConcurrency >= 4;
      setCapable(
        window.innerWidth >= 1200 &&
          !reducedMotion &&
          enoughMemory &&
          enoughCores &&
          canUseWebGL()
      );
      setChecked(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return { capable, checked };
}
