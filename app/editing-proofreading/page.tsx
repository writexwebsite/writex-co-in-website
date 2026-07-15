import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { ServicePageTemplate } from "@/components/ServicePageTemplate";
import { servicePages } from "@/lib/content";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";

const page = servicePages.editing;

export const metadata: Metadata = buildMetadata({
  title: "Academic Editing & Proofreading Services",
  description:
    "Improve grammar, clarity, academic tone, structure, formatting, citations, and final-readiness with WriteX academic editing support.",
  path: page.path,
  keywords: [
    "academic proofreading",
    "academic editing",
    "editing proofreading",
    "academic tone editing",
    "referencing correction"
  ]
});

export default function EditingProofreadingPage() {
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
