import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";

export function ToolPageIntro({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <>
    <SpectrumBackground variant="hero" overlayStrength="light" intensity={0.4} className="py-10 sm:py-14">
      <div className="premium-container max-w-5xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-wxViolet700">{eyebrow}</p><h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-wxIndigo900 sm:text-4xl lg:text-5xl">{title}</h1><p className="mt-4 max-w-3xl text-base leading-7 text-wxIndigo500 sm:text-lg">{description}</p><p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-wxIndigo700"><ShieldCheck className="h-4 w-4 text-wxGreen500" /> Learning-focused. Private session. No invented outcomes.</p></div>
    </SpectrumBackground>
    <section className="bg-wxBg py-8 sm:py-10"><div className="premium-container">{children}</div></section>
  </>;
}

