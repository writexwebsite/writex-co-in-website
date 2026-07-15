import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ToolPageIntro } from "@/components/tools/ToolPageIntro";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";
import { toolFeatureFlags } from "@/lib/tools/config";
const TemplateLibrary = dynamic(() => import("@/components/tools/TemplateLibrary").then((module) => module.TemplateLibrary));
export const metadata: Metadata = buildMetadata({ title: "Academic and Admissions Planning Templates", description: "Preview and download five practical WriteX templates for CVs, SOP planning, dissertation proposals, and literature reviews.", path: "/templates" });
export default function TemplatesPage() { if (!toolFeatureFlags.publicHub || !toolFeatureFlags.templates) notFound(); return <><JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Templates", path: "/templates" }])} /><ToolPageIntro eyebrow="Template Library" title="Practical templates for clearer academic planning" description="Preview the structure before sharing contact details. Every template uses demonstration prompts and must be adapted to your own brief and evidence."><TemplateLibrary /></ToolPageIntro></>; }

