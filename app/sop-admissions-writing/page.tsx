import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { ServicePageTemplate } from "@/components/ServicePageTemplate";
import { servicePages } from "@/lib/content";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";

const page = servicePages.sop;

export const metadata: Metadata = buildMetadata({
  title: "SOP & Admissions Support",
  description:
    "Support for SOPs, personal statements, LOR editing, CV polishing, and profile positioning for university applications.",
  path: page.path,
  keywords: [
    "SOP editing",
    "admissions support",
    "personal statement editing",
    "LOR editing",
    "CV polish"
  ]
});

export default function SopAdmissionsWritingPage() {
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
