import type { ReactNode } from "react";
import { CTAButton } from "./CTAButton";
import { HeroActions } from "./hero/HeroActions";
import { HeroEyebrow } from "./hero/HeroEyebrow";
import { HeroSupportPanel } from "./hero/HeroSupportPanel";
import type { HeroSupportCardData } from "./hero/HeroSupportCard";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { SpectrumBackground } from "./visual/SpectrumBackground";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  primaryCta?: string;
  secondaryCta?: string;
  primaryAction?: "quote" | "whatsapp";
  primaryHref?: string;
  secondaryHref?: string;
  supportingCards?: HeroSupportCardData[];
  actions?: ReactNode;
  microcopy?: ReactNode;
  supportVisual?: ReactNode;
  animateBackground?: boolean;
};

const defaultSupportingCards = [
  {
    title: "Every support request starts with scope.",
    description:
      "Share your file, deadline, word count, subject, and academic level so WriteX can confirm the right support pathway before quoting."
  },
  {
    title: "Confidential by default.",
    description:
      "Your brief, draft, profile notes, and conversation stay within the enquiry and delivery workflow."
  }
];

export function PageHero({
  eyebrow,
  title,
  description,
  primaryCta = "Get Quote",
  secondaryCta = "Send Brief on WhatsApp",
  primaryAction = "quote",
  primaryHref,
  secondaryHref,
  supportingCards = defaultSupportingCards,
  actions,
  microcopy,
  supportVisual,
  animateBackground = false
}: PageHeroProps) {
  return (
    <SpectrumBackground
      variant="hero"
      overlayStrength="hero"
      position="center bottom"
      animate={animateBackground}
      className="text-wxIndigo900"
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-spectrum" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(232,56,116,0.12),transparent_30%),radial-gradient(circle_at_62%_78%,rgba(85,22,242,0.10),transparent_36%)]"
      />
      <div
        data-page-hero
        className="relative mx-auto grid max-w-7xl items-center gap-7 px-4 py-9 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(25rem,0.96fr)] lg:gap-10 lg:px-8 lg:py-12"
      >
        <div className="relative max-w-[42rem]">
          <HeroEyebrow>{eyebrow}</HeroEyebrow>
          <h1 className="mt-5 max-w-[42rem] text-4xl font-semibold leading-tight text-wxIndigo900 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-[38rem] text-base leading-8 text-wxIndigo500">
            {description}
          </p>
          <HeroActions>
            {actions ?? (
              <>
                {primaryHref ? (
                  <CTAButton href={primaryHref}>{primaryCta}</CTAButton>
                ) : primaryAction === "whatsapp" ? (
                  <WhatsAppCTA label={primaryCta} />
                ) : (
                  <CTAButton href="/pricing#quote">{primaryCta}</CTAButton>
                )}
                {secondaryHref ? (
                  <CTAButton href={secondaryHref} variant="secondary">
                    {secondaryCta}
                  </CTAButton>
                ) : (
                  <WhatsAppCTA label={secondaryCta} variant="secondary" />
                )}
              </>
            )}
          </HeroActions>
          {microcopy ? (
            <div className="mt-4 max-w-[36rem] text-sm font-semibold leading-6 text-wxIndigo500">
              {microcopy}
            </div>
          ) : null}
        </div>
        <HeroSupportPanel cards={supportingCards}>
          {supportVisual}
        </HeroSupportPanel>
      </div>
    </SpectrumBackground>
  );
}
