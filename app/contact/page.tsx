import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { CTAButton } from "@/components/CTAButton";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { SectionHeader } from "@/components/SectionHeader";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata, getPhoneUrl, getWhatsAppUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Contact WriteX for Academic Support",
  description:
    "Contact WriteX for academic support, quote requests, WhatsApp enquiries, academic editing, dissertation support, SOP admissions support, and originality review.",
  path: "/contact",
  keywords: ["contact WriteX", "academic support contact", "WhatsApp quote"]
});

const contactCards = [
  {
    title: "Email",
    links: [
      { label: siteConfig.email, href: `mailto:${siteConfig.email}` },
      { label: siteConfig.supportEmail, href: `mailto:${siteConfig.supportEmail}` }
    ],
    icon: Mail
  },
  {
    title: "WhatsApp & Phone",
    links: [
      { label: `WhatsApp: ${siteConfig.primaryPhone}`, href: getWhatsAppUrl(), external: true },
      { label: `Call: ${siteConfig.primaryPhone}`, href: getPhoneUrl(siteConfig.primaryPhone) },
      ...siteConfig.supportPhones.map((phone) => ({ label: `Call: ${phone}`, href: getPhoneUrl(phone) }))
    ],
    icon: Phone
  },
  {
    title: "Office",
    text: siteConfig.address,
    icon: MapPin
  },
  {
    title: "Support hours",
    text: siteConfig.supportHours,
    icon: WhatsAppIcon
  }
];

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" }
        ])}
      />
      <PageHero
        eyebrow="Contact WriteX"
        title="Choose the right path. Reach the right team."
        description="Use the intent selector for quote requests, existing-client help, payment questions, revisions, partnerships, or general academic support enquiries."
        primaryCta="Get Quote"
        secondaryCta="WhatsApp WriteX"
      />

      <SpectrumBackground
        variant="section"
        overlayStrength="section"
        intensity={0.32}
        className="py-10 sm:py-12"
      >
        <div className="premium-container">
          <SectionHeader
            eyebrow="Contact options"
            title="Verified ways to reach WriteX"
            description="Choose WhatsApp for fast brief review, email for documents, or the form below to route your message."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {contactCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="rounded-md border border-sageBorder bg-white p-6 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxViolet700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h2 className="mt-5 text-lg font-semibold text-charcoalInk">
                    {card.title}
                  </h2>
                  {card.links ? (
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-slateText">
                      {card.links.map((link) => (
                        <li key={`${card.title}-${link.href}`}>
                          <a
                            href={link.href}
                            target={link.external ? "_blank" : undefined}
                            rel={link.external ? "noreferrer" : undefined}
                            className="inline-flex min-h-9 items-center rounded-sm font-medium underline decoration-wxViolet700/25 underline-offset-4 transition hover:text-wxViolet700 hover:decoration-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-wxViolet700"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-slateText">{card.text}</p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </SpectrumBackground>

      <SpectrumBackground
        variant="section"
        overlayStrength="strong"
        intensity={0.18}
        className="py-10 sm:py-12"
      >
        <div className="premium-container grid gap-7 lg:grid-cols-[0.8fr_1fr]">
          <div>
            <SectionHeader
              eyebrow="Message"
              title="Route your enquiry before sending"
              description="Select the closest intent so WriteX can point you to the right next step without adding unnecessary fields."
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <WhatsAppCTA label="Send Brief on WhatsApp" />
              <CTAButton href="/pricing#quote" variant="outline">
                Get Quote
              </CTAButton>
            </div>
          </div>
          <ContactForm />
        </div>
      </SpectrumBackground>
    </>
  );
}
