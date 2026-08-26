import type { MetadataRoute } from "next";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";
import { helpSeoPages } from "@/lib/seo-content";
import { absoluteUrl } from "@/lib/site";

const routes = [
  "/",
  "/about-us",
  "/trust-centre",
  "/assignment-support",
  "/dissertation-thesis-support",
  "/sop-admissions-writing",
  "/editing-proofreading",
  "/plagiarism-ai-review",
  "/formatting-referencing",
  "/samples",
  "/reviews",
  "/help",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
  "/academic-integrity",
  "/tools",
  "/tools/cv-builder",
  "/tools/sop-builder",
  "/templates",
  ...(isHiringFeatureEnabled("applications") ? [
    "/careers",
    "/careers/subject-matter-expert",
    "/careers/sales-executive"
  ] : []),
  ...helpSeoPages.map((page) => page.path)
];

export default function sitemap(): MetadataRoute.Sitemap {
  const uniqueRoutes = Array.from(new Set(routes));

  return uniqueRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date("2026-07-27"),
    changeFrequency: route === "/" || route === "/help" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route.startsWith("/help/") ? 0.7 : 0.8
  }));
}
