import { CTAButton } from "@/components/CTAButton";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";

export default function NotFound() {
  return (
    <SpectrumBackground
      variant="section"
      overlayStrength="strong"
      intensity={0.26}
    >
      <div className="premium-container flex min-h-[52vh] flex-col justify-center py-10">
        <p className="text-sm font-semibold uppercase text-softTeal">Page not found</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-charcoalInk sm:text-5xl">
          This page is not part of the new WriteX support flow
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slateText">
          The rebuilt site focuses on academic support, quote requests,
          WhatsApp enquiries, samples, and verified contact paths.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <CTAButton href="/" variant="dark">
            Go Home
          </CTAButton>
          <CTAButton href="/assignment-support" variant="secondary">
            Explore Services
          </CTAButton>
          <WhatsAppCTA label="Ask on WhatsApp" variant="outline" />
        </div>
      </div>
    </SpectrumBackground>
  );
}
