import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { ServicePageTemplate } from "@/components/ServicePageTemplate";
import { servicePages } from "@/lib/content";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";

const page = servicePages.dissertation;

export const metadata: Metadata = buildMetadata({
  title: "Dissertation & Thesis Support",
  description:
    "Research proposal, literature review, methodology, chapter editing, formatting, and referencing support through a confidential academic workflow.",
  path: page.path,
  keywords: [
    "dissertation support",
    "thesis support",
    "dissertation editing",
    "literature review editing",
    "methodology clarity"
  ]
});

export default function DissertationThesisSupportPage() {
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
