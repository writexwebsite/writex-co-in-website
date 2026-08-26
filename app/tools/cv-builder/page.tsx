import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ToolPageIntro } from "@/components/tools/ToolPageIntro";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";
import { toolFeatureFlags } from "@/lib/tools/config";
const CVBuilder = dynamic(() => import("@/components/tools/CVBuilder").then((module) => module.CVBuilder));
export const metadata: Metadata = buildMetadata({ title: "Free Academic and Graduate CV Builder", description: "Build a clear academic, graduate, or early-career CV by organising education, skills, experience, and evidence with the free WriteX CV tool.", path: "/tools/cv-builder" });
export default function CVBuilderPage() { if (!toolFeatureFlags.publicHub || !toolFeatureFlags.cvBuilder) notFound(); return <><JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Free Tools", path: "/tools" }, { name: "CV Builder", path: "/tools/cv-builder" }])} /><ToolPageIntro eyebrow="Free CV Builder" title="Build a clear CV from accurate evidence" description="Choose one of three focused layouts, organise your education and experience, preview the result, then download your file."><CVBuilder /></ToolPageIntro></>; }
