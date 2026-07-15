import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { ServicePageTemplate } from "@/components/ServicePageTemplate";
import { servicePages } from "@/lib/content";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";

const page = servicePages.plagiarism;

export const metadata: Metadata = buildMetadata({
  title: "Originality & AI Review Support",
  description:
    "Similarity review, citation correction, originality guidance, and human academic review for learning-focused academic integrity support.",
  path: page.path,
  keywords: [
    "originality review",
    "AI review",
    "similarity review",
    "citation correction",
    "source attribution guidance"
  ]
});

export default function OriginalityAiReviewPage() {
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
