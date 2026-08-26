import { FileText, ShieldCheck } from "lucide-react";
import { CTAButton } from "./CTAButton";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { Reveal } from "./animations/Reveal";
import { SpectrumBackground } from "./visual/SpectrumBackground";

type FinalCTAProps = { title?: string; description?: string };

export function FinalCTA({
  title = "Bring the brief. Get a clear next step.",
  description = "Share your brief, rubric, draft, or deadline instructions. WriteX will review the scope before quoting."
}: FinalCTAProps) {
  return (
    <SpectrumBackground variant="section" overlayStrength="light" intensity={0.58} className="border-t border-wxViolet700/10 py-10 sm:py-12">
      <Reveal className="premium-container">
        <div className="relative overflow-hidden rounded-xl border border-white/80 bg-white/[0.72] p-6 shadow-[0_20px_60px_rgba(85,22,242,0.10)] backdrop-blur sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-spectrum" />
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-wxIndigo700">Ready when you are</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-wxIndigo900 sm:text-4xl">{title}</h2>
            <p className="mt-3 text-base leading-7 text-wxIndigo500">{description}</p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-wxIndigo500"><ShieldCheck className="h-4 w-4 text-wxGreen500" aria-hidden />Confidential review. Clear scope. QA-led support.</p>
          </div>
          <div className="mt-6 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
            <WhatsAppCTA label="Get Quote on WhatsApp" />
            <CTAButton href="/pricing#quote" variant="secondary" icon={FileText}>Share Brief for Review</CTAButton>
          </div>
        </div>
      </Reveal>
    </SpectrumBackground>
  );
}
