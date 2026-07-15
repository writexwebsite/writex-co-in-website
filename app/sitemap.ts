import type { MetadataRoute } from "next";
import { helpSeoPages } from "@/lib/seo-content";
import { absoluteUrl } from "@/lib/site";

const routes = [
  "/",
  "/about-us",
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
  ...helpSeoPages.map((page) => page.path)
];

export default function sitemap(): MetadataRoute.Sitemap {
  const uniqueRoutes = Array.from(new Set(routes));

  return uniqueRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date("2026-07-15"),
    changeFrequency: route === "/" || route === "/help" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route.startsWith("/help/") ? 0.7 : 0.8
  }));
}
