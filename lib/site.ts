import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.writex.co.in";
const whatsappNumber =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "918100977068";

export const siteConfig = {
  name: "WriteX",
  url: siteUrl,
  description:
    "WriteX helps students review, structure, edit, reference, and improve academic documents through confidential research guidance, academic editing, originality review, formatting, referencing, and QA-led support.",
  whatsappNumber,
  whatsappDisplay: "+91 81009 77068",
  primaryPhone: "+91 81009 77068",
  supportPhones: ["+91 81007 45556", "+91 70038 82237"],
  email: process.env.NEXT_PUBLIC_PRIMARY_EMAIL || "info@writex.co.in",
  supportEmail:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "business@writex.co.in",
  address: "Kolkata, India",
  supportHours: "Monday to Saturday, 10:00 AM - 8:00 PM IST",
  defaultWhatsAppMessage:
    "Hi WriteX, I need academic support. I want to share my brief for a quote."
};

export const academicIntegrityDisclaimer =
  "WriteX provides academic support, academic review, research guidance, editing, proofreading, formatting, originality review, and model solutions for learning purposes. Students are responsible for following their institution's academic integrity policies.";

export const brochureFallbackMessage =
  "Thanks for sharing the details. For the fastest response, please send your brief and files on WhatsApp. WriteX will review the scope before quoting.";

export const navItems = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/assignment-support" },
  { label: "Dissertation", href: "/dissertation-thesis-support" },
  { label: "Editing", href: "/editing-proofreading" },
  { label: "SOP", href: "/sop-admissions-writing" },
  { label: "Originality Review", href: "/plagiarism-ai-review" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" }
];

export const serviceNavItems = [
  { label: "Coursework & Brief Support", href: "/assignment-support" },
  { label: "Dissertation & Thesis Support", href: "/dissertation-thesis-support" },
  { label: "Academic Editing & Proofreading", href: "/editing-proofreading" },
  { label: "SOP & Admissions Support", href: "/sop-admissions-writing" },
  { label: "Originality & AI Review", href: "/plagiarism-ai-review" },
  { label: "Formatting & Referencing Support", href: "/formatting-referencing" }
];

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url.replace(/\/$/, "")}${normalizedPath}`;
}

export function getWhatsAppUrl(message = siteConfig.defaultWhatsAppMessage) {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
    message
  )}`;
}

export function getPhoneUrl(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

type MetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  brandFirst?: boolean;
};

export function buildMetadata({
  title,
  description,
  path,
  brandFirst = false
}: MetadataInput): Metadata {
  const resolvedTitle =
    title === siteConfig.name
      ? title
      : brandFirst
        ? `${siteConfig.name} | ${title}`
        : `${title} | ${siteConfig.name}`;

  return {
    title: resolvedTitle,
    description,
    alternates: {
      canonical: absoluteUrl(path)
    },
    openGraph: {
      title: resolvedTitle,
      description,
      url: absoluteUrl(path),
      siteName: siteConfig.name,
      images: [
        {
          url: absoluteUrl("/images/og/writex-home-og.png"),
          width: 1200,
          height: 630,
          alt: "WriteX premium academic support and review"
        }
      ],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
      images: [absoluteUrl("/images/og/writex-home-og.png")]
    }
  };
}
