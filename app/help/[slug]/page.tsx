import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { SeoContentPage } from "@/components/SeoContentPage";
import { helpSeoPageBySlug, helpSeoPages } from "@/lib/seo-content";
import { buildSeoContentMetadata } from "@/lib/seo-metadata";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/schema";

type HelpArticleProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return helpSeoPages.map((page) => ({
    slug: page.slug
  }));
}

export async function generateMetadata({ params }: HelpArticleProps) {
  const { slug } = await params;
  const page = helpSeoPageBySlug[slug];

  if (!page) {
    return {};
  }

  return buildSeoContentMetadata(page);
}

export default async function HelpArticlePage({ params }: HelpArticleProps) {
  const { slug } = await params;
  const page = helpSeoPageBySlug[slug];

  if (!page || !page.article) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Resources", path: "/help" },
            { name: page.h1, path: page.path }
          ]),
          articleSchema({
            title: page.h1,
            description: page.metaDescription,
            path: page.path,
            datePublished: page.article.datePublished,
            dateModified: page.article.dateModified,
            authorName: page.article.authorName
          }),
          faqSchema(page.faq)
        ]}
      />
      <SeoContentPage page={page} />
    </>
  );
}
