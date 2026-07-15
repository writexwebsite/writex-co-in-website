import { academicIntegrityDisclaimer, absoluteUrl, siteConfig } from "./site";
import type { FAQItem } from "./content";

type BreadcrumbItem = {
  name: string;
  path: string;
};

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl("/images/original/writex-logo-300.png"),
    email: siteConfig.email,
    telephone: siteConfig.primaryPhone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "42A, Express Tower, Auckland Square",
      addressLocality: "Kolkata",
      addressRegion: "West Bengal",
      postalCode: "700017",
      addressCountry: "IN"
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: siteConfig.primaryPhone,
        contactType: "customer support",
        email: siteConfig.email,
        availableLanguage: ["English"]
      }
    ],
    description: siteConfig.description,
    knowsAbout: [
      "Academic support",
      "Research guidance",
      "Editing and proofreading",
      "Dissertation support",
      "Admissions writing",
      "Referencing",
      "Originality review"
    ],
    ethicsPolicy: academicIntegrityDisclaimer
  };
}

export function aboutPageSchema({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": absoluteUrl("/about-us#about-page"),
    url: absoluteUrl("/about-us"),
    name: title,
    description,
    mainEntity: {
      "@id": absoluteUrl("/#organization")
    },
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: absoluteUrl("/")
    }
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: absoluteUrl("/")
  };
}

export function faqSchema(items: readonly FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}

export function serviceSchema({
  name,
  title,
  description,
  path
}: {
  name?: string;
  title?: string;
  description: string;
  path: string;
}) {
  const serviceName = name || title || siteConfig.name;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: serviceName,
    description,
    serviceType: serviceName,
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url
    },
    areaServed: "Worldwide",
    url: absoluteUrl(path)
  };
}

export function articleSchema({
  title,
  description,
  path,
  datePublished,
  dateModified,
  authorName
}: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished,
    dateModified,
    author: {
      "@type": "Organization",
      name: authorName
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url
    },
    mainEntityOfPage: absoluteUrl(path)
  };
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}
