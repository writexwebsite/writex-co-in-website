import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ToolPageIntro } from "@/components/tools/ToolPageIntro";
import { ToolsHub } from "@/components/tools/ToolsHub";
import { breadcrumbSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/site";
import { toolFeatureFlags } from "@/lib/tools/config";

export const metadata: Metadata = buildMetadata({ title: "Free Academic and Admissions Planning Tools", description: "Use free WriteX tools to organise CV evidence, plan an SOP, and prepare a clearer academic or admissions brief before requesting support.", path: "/tools" });
export default function ToolsPage() { if (!toolFeatureFlags.publicHub) notFound(); return <><JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Free Tools", path: "/tools" }])} /><ToolPageIntro eyebrow="Free Tools" title="Free Tools for Academic and Admissions Planning" description="Create a clearer starting point with guided CV, SOP, and academic planning tools from WriteX."><ToolsHub /></ToolPageIntro></>; }
