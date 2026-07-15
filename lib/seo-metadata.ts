import type { Metadata } from "next";
import type { SeoContentPage } from "./seo-content";
import { absoluteUrl, siteConfig } from "./site";

export function buildSeoContentMetadata(page: SeoContentPage): Metadata {
  return {
    title: page.seoTitle,
    description: page.metaDescription,
    alternates: {
      canonical: absoluteUrl(page.path)
    },
    openGraph: {
      title: page.seoTitle,
      description: page.metaDescription,
      url: absoluteUrl(page.path),
      siteName: siteConfig.name,
      images: [
        {
          url: absoluteUrl("/images/original/writex-ideas.png"),
          width: 775,
          height: 749,
          alt: "WriteX academic ideas illustration"
        }
      ],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: page.seoTitle,
      description: page.metaDescription,
      images: [absoluteUrl("/images/original/writex-ideas.png")]
    }
  };
}
