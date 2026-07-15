import { CTAButton } from "./CTAButton";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { SpectrumBackground } from "./visual/SpectrumBackground";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta?: string;
  secondaryCta?: string;
  primaryAction?: "quote" | "whatsapp";
  secondaryHref?: string;
  supportingCards?: Array<{ title: string; description: string }>;
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
  secondaryHref,
  supportingCards = defaultSupportingCards
}: PageHeroProps) {
  return (
    <SpectrumBackground
      variant="hero"
      overlayStrength="hero"
      position="center bottom"
      className="text-wxIndigo900"
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-spectrum" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(232,56,116,0.12),transparent_30%),radial-gradient(circle_at_62%_78%,rgba(85,22,242,0.10),transparent_36%)]"
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-12">
        <div className="relative">
          <p className="inline-flex rounded-full border border-wxBorder bg-white/90 px-3 py-2 text-sm font-semibold uppercase text-wxViolet700 shadow-sm backdrop-blur">{eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-wxIndigo500">
            {description}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {primaryAction === "whatsapp" ? (
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
          </div>
        </div>
        <div className="relative grid content-end gap-4">
          {supportingCards.map((card) => (
            <div key={card.title} className="rounded-md border border-wxBorder bg-white/90 p-5 shadow-sm backdrop-blur">
              <p className="text-sm font-semibold text-wxViolet700">{card.title}</p>
              <p className="mt-3 text-sm leading-7 text-wxIndigo500">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </SpectrumBackground>
  );
}
