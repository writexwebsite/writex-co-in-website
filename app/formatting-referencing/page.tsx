import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { ServicePageTemplate } from "@/components/ServicePageTemplate";
import { servicePages } from "@/lib/content";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";

const page = servicePages.formatting;

export const metadata: Metadata = buildMetadata({
  title: "Formatting & Referencing Support",
  description:
    "Harvard, APA, MLA, Chicago, OSCOLA, and university-specific formatting and referencing support for academic documents.",
  path: page.path,
  keywords: [
    "Harvard referencing support",
    "APA referencing",
    "academic formatting",
    "OSCOLA referencing",
    "reference list consistency"
  ]
});

export default function FormattingReferencingPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: page.title, path: page.path }
          ]),
          serviceSchema(page),
          faqSchema(page.faqs)
        ]}
      />
      <ServicePageTemplate page={page} />
    </>
  );
}
