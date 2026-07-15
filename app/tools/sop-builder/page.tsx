import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ToolPageIntro } from "@/components/tools/ToolPageIntro";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";
import { toolFeatureFlags } from "@/lib/tools/config";
const SOPBuilder = dynamic(() => import("@/components/tools/SOPBuilder").then((module) => module.SOPBuilder));
export const metadata: Metadata = buildMetadata({ title: "Free SOP Planning Framework Builder", description: "Plan an evidence-led SOP framework with programme-fit, motivation, and career-direction prompts from WriteX.", path: "/tools/sop-builder" });
export default function SOPBuilderPage() { if (!toolFeatureFlags.publicHub || !toolFeatureFlags.sopBuilder) notFound(); return <><JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Free Tools", path: "/tools" }, { name: "SOP Builder", path: "/tools/sop-builder" }])} /><ToolPageIntro eyebrow="Free SOP Builder" title="Plan an SOP framework around evidence and programme fit" description="Build a guided framework for your own drafting and review. The tool does not promise admission or generate a guaranteed final statement."><SOPBuilder /></ToolPageIntro></>; }

