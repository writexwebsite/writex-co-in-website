import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { QuoteCommandCenter } from "@/components/QuoteCommandCenter";
import { pricingFaqs } from "@/lib/content";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Get a Scope-Based Academic Support Quote",
  description:
    "Share your brief, deadline, academic level, word count, and files to request a confidential scope-based quote from WriteX.",
  path: "/pricing",
  keywords: [
    "scope-based academic support quote",
    "scope-based quote",
    "academic support quote",
    "quote request",
    "send brief for quote"
  ]
});

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Pricing", path: "/pricing" }
          ]),
          serviceSchema({
            name: "Academic Support Quote",
            description:
              "Quote-based pricing for academic support, academic editing, dissertation support, SOP admissions support, formatting, referencing, and originality review.",
            path: "/pricing"
          }),
          faqSchema(pricingFaqs)
        ]}
      />
      <QuoteCommandCenter />
    </>
  );
}
