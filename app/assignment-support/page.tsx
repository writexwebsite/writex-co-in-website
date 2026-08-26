import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { ServicePageTemplate } from "@/components/ServicePageTemplate";
import { servicePages } from "@/lib/content";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";

const page = servicePages.assignment;

export const metadata: Metadata = buildMetadata({
  title: "Coursework Support for University Students",
  description:
    "Get academic support for coursework briefs, research guidance, structure review, editing, referencing, and model solutions for learning.",
  path: page.path,
  keywords: [
    "university assignment support",
    "coursework support",
    "academic support",
    "research guidance",
    "referencing support",
    "model solutions for learning"
  ]
});

export default function AssignmentSupportPage() {
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
      <ServicePageTemplate page={page} showSubjects />
    </>
  );
}
