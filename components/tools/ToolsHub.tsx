"use client";

import Link from "next/link";
import { Clock3, FileText, GraduationCap, LayoutTemplate, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";

const tools = [
  { name: "CV Builder", value: "Create a clear academic, graduate, or early-career CV with a guided five-step workflow.", time: "10-15 minutes", href: "/tools/cv-builder", service: "CV and admissions support", serviceHref: "/sop-admissions-writing", icon: FileText },
  { name: "SOP Builder", value: "Plan an evidence-led SOP framework with programme-fit, motivation, and career-direction prompts.", time: "15-20 minutes", href: "/tools/sop-builder", service: "SOP & Admissions Support", serviceHref: "/sop-admissions-writing", icon: GraduationCap },
  { name: "Templates", value: "Preview and download five practical planning templates for academic and admissions work.", time: "2-5 minutes", href: "/templates", service: "Explore relevant support", serviceHref: "/assignment-support", icon: LayoutTemplate }
];

export function ToolsHub() {
  useEffect(() => trackQuoteEvent(quoteTrackingEvents.toolsHubViewed), []);
  return <div className="grid gap-5 lg:grid-cols-3">{tools.map((tool) => { const Icon = tool.icon; return <article key={tool.name} className="flex flex-col rounded-xl border border-wxViolet700/12 bg-wxSurface p-6 shadow-soft transition hover:-translate-y-1 hover:border-wxViolet700/35 hover:shadow-lift">
    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-wxSurfaceSoft text-wxViolet700"><Icon className="h-6 w-6" aria-hidden /></span>
    <h2 className="mt-5 text-xl font-semibold text-wxIndigo900">{tool.name}</h2>
    <p className="mt-3 flex-1 text-sm leading-7 text-wxIndigo500">{tool.value}</p>
    <p className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-wxBlue500"><Clock3 className="h-4 w-4" /> {tool.time}</p>
    <Link href={tool.href} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-wxViolet700 px-4 text-sm font-semibold text-white">Start <ArrowRight className="h-4 w-4" /></Link>
    <Link href={tool.serviceHref} className="mt-3 text-center text-xs font-semibold text-wxViolet700 hover:underline">{tool.service}</Link>
  </article>; })}</div>;
}

