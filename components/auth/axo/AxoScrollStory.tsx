"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { BrandLogo } from "@/components/BrandLogo";
import { AXO_AUTH_SUCCESS_EVENT } from "@/lib/auth/axoLoginTransition";
import { getAxoStoryIndex, type AxoStoryVariant } from "@/lib/auth/axoStoryConfig";
import { useWebGLCapability } from "@/lib/auth/useWebGLCapability";
import { AxoStaticFallback } from "./AxoStaticFallback";
import { AxoStoryCopy } from "./AxoStoryCopy";

const AxoWebGLScene = dynamic(() => import("./AxoWebGLScene"), {
  ssr: false,
  loading: () => <AxoStaticFallback priority />
});

export function AxoScrollStory({ variant }: { variant: AxoStoryVariant }) {
  const storyRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const { capable, checked } = useWebGLCapability();
  const { scrollYProgress } = useScroll({ target: storyRef, offset: ["start start", "end end"] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 520, damping: 48, mass: 0.12 });

  useMotionValueEvent(smoothProgress, "change", (value) => setProgress(Math.max(0, Math.min(1, value))));
  useMotionValueEvent(scrollYProgress, "change", (value) => setStoryIndex(getAxoStoryIndex(value)));

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    const onSuccess = () => setTransitioning(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(AXO_AUTH_SUCCESS_EVENT, onSuccess);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(AXO_AUTH_SUCCESS_EVENT, onSuccess);
    };
  }, []);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!capable || transitioning || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
      y: -(((event.clientY - bounds.top) / bounds.height - 0.5) * 2)
    });
  }

  return (
    <div ref={storyRef} className="relative h-[180svh]" onPointerMove={handlePointerMove} onPointerLeave={() => setPointer({ x: 0, y: 0 })}>
      <div className="sticky top-0 h-[100svh] overflow-hidden border-r border-wxBorder">
        <div aria-hidden className="absolute inset-0 bg-hero-spectrum" />
        <div aria-hidden className={`absolute inset-[12%] rounded-full bg-brand-spectrum opacity-[0.09] blur-3xl transition-opacity duration-700 ${transitioning ? "opacity-20" : ""}`} />
        <div className="absolute left-[7%] top-[6%] z-20"><BrandLogo markClassName="h-14 w-52 2xl:h-16 2xl:w-60" /></div>
        <div className={`absolute inset-0 transition-transform duration-700 ${transitioning ? "scale-[1.025]" : ""}`}>
          {checked && capable ? (
            <AxoWebGLScene variant={variant} progress={progress} pointer={pointer} active={visible} transitioning={transitioning} />
          ) : (
            <AxoStaticFallback priority variant={variant} />
          )}
        </div>
        <AxoStoryCopy variant={variant} activeIndex={storyIndex} />
      </div>
    </div>
  );
}
