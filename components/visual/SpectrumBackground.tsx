"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

type SpectrumVariant = "hero" | "section" | "login" | "subtle" | "none";
type OverlayStrength = "hero" | "mobileHero" | "section" | "strong" | "light" | "none";

type SpectrumBackgroundProps = {
  as?: "section" | "div";
  variant?: SpectrumVariant;
  className?: string;
  children: ReactNode;
  intensity?: number;
  position?: string;
  animate?: boolean;
  overlayStrength?: OverlayStrength;
};

const desktopAsset = "/images/backgrounds/writex-spectrum-bg-desktop.webp";
const mobileAsset = "/images/backgrounds/writex-spectrum-bg-mobile.webp";
const sectionAsset = "/images/backgrounds/writex-spectrum-bg-section.webp";
const loginAsset = "/images/backgrounds/writex-spectrum-bg-login.webp";

function assetsForVariant(variant: SpectrumVariant) {
  if (variant === "login") {
    return { desktop: loginAsset, mobile: mobileAsset };
  }

  if (variant === "section" || variant === "subtle") {
    return { desktop: sectionAsset, mobile: sectionAsset };
  }

  return { desktop: desktopAsset, mobile: mobileAsset };
}

function overlayClass(overlayStrength: OverlayStrength) {
  switch (overlayStrength) {
    case "hero":
      return "bg-[linear-gradient(90deg,rgba(255,255,255,.94)_0%,rgba(255,255,255,.84)_43%,rgba(255,255,255,.32)_72%,rgba(255,255,255,.08)_100%)] max-md:bg-[linear-gradient(180deg,rgba(255,255,255,.78)_0%,rgba(255,255,255,.54)_100%)]";
    case "mobileHero":
      return "bg-[linear-gradient(180deg,rgba(255,255,255,.78)_0%,rgba(255,255,255,.50)_100%)]";
    case "section":
      return "bg-white/70";
    case "strong":
      return "bg-white/[0.82]";
    case "light":
      return "bg-white/[0.42]";
    case "none":
      return "";
    default:
      return "bg-white/70";
  }
}

export function SpectrumBackground({
  as = "section",
  variant = "section",
  className,
  children,
  intensity,
  position,
  animate = false,
  overlayStrength = variant === "hero" ? "hero" : "section"
}: SpectrumBackgroundProps) {
  const shouldReduceMotion = useReducedMotion();
  const [desktopMotion, setDesktopMotion] = useState(false);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [-6, 6]);
  const x = useTransform(scrollYProgress, [0, 1], [-4, 4]);
  const Component = as;
  const assets = assetsForVariant(variant);
  const opacity = intensity ?? (variant === "hero" ? 1 : variant === "subtle" ? 0.22 : 0.38);
  const mediaStyle: CSSProperties = {
    objectPosition: position || (variant === "hero" ? "center bottom" : "center center"),
    opacity
  };
  const canAnimate = animate && desktopMotion && !shouldReduceMotion;

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktopMotion(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <Component className={cn("relative isolate overflow-hidden", className)}>
      {variant !== "none" ? (
        <motion.div
          aria-hidden
          className="wx-spectrum-media pointer-events-none absolute inset-0 z-0"
          style={canAnimate ? { x, y } : undefined}
        >
          <picture>
            <source media="(min-width: 768px)" srcSet={assets.desktop} />
            <img
              alt=""
              src={assets.mobile}
              className="h-full w-full object-cover"
              draggable={false}
              loading={variant === "hero" || variant === "login" ? "eager" : "lazy"}
              fetchPriority={variant === "hero" ? "high" : "auto"}
              style={mediaStyle}
            />
          </picture>
        </motion.div>
      ) : null}
      {overlayStrength !== "none" ? (
        <div
          aria-hidden
          className={cn("wx-spectrum-overlay pointer-events-none absolute inset-0 z-0", overlayClass(overlayStrength))}
        />
      ) : null}
      <div className="relative z-10">{children}</div>
    </Component>
  );
}
