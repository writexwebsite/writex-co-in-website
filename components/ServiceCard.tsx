"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpenCheck, CheckCircle2 } from "lucide-react";
import type { ServiceCard as ServiceCardContent } from "@/lib/content";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";

type ServiceCardProps = {
  service: ServiceCardContent;
  icon?: LucideIcon;
};

const accents: Record<
  string,
  {
    line: string;
    icon: string;
    text: string;
    hover: string;
    tag: string;
  }
> = {
  "/assignment-support": {
    line: "via-wxViolet700/70",
    icon: "bg-wxViolet700/10 text-wxViolet700",
    text: "text-wxViolet700",
    hover: "hover:border-wxViolet700/55",
    tag: "text-wxViolet700"
  },
  "/dissertation-thesis-support": {
    line: "via-wxBlue500/70",
    icon: "bg-wxBlue500/10 text-wxBlue500",
    text: "text-wxBlue500",
    hover: "hover:border-wxBlue500/55",
    tag: "text-wxBlue500"
  },
  "/editing-proofreading": {
    line: "via-wxMagenta500/70",
    icon: "bg-wxMagenta500/10 text-wxMagenta500",
    text: "text-wxMagenta500",
    hover: "hover:border-wxMagenta500/55",
    tag: "text-wxMagenta500"
  },
  "/sop-admissions-writing": {
    line: "via-wxPink500/70",
    icon: "bg-wxPink500/10 text-wxPink500",
    text: "text-wxPink500",
    hover: "hover:border-wxPink500/55",
    tag: "text-wxPink500"
  },
  "/plagiarism-ai-review": {
    line: "via-wxGreen500/70",
    icon: "bg-wxBlue500/10 text-wxBlue500",
    text: "text-wxBlue500",
    hover: "hover:border-wxGreen500/55",
    tag: "text-wxGreen500"
  },
  "/formatting-referencing": {
    line: "via-wxOrange500/70",
    icon: "bg-wxOrange500/10 text-wxOrange500",
    text: "text-wxOrange500",
    hover: "hover:border-wxOrange500/55",
    tag: "text-wxOrange500"
  }
};

export function ServiceCard({ service, icon: Icon = BookOpenCheck }: ServiceCardProps) {
  const accent = accents[service.href] || accents["/assignment-support"];

  return (
    <Link
      href={service.href}
      className={cn(
        "group relative flex h-full min-h-[13.5rem] flex-col overflow-hidden rounded-xl border border-wxViolet700/10 bg-white p-5 shadow-[0_12px_32px_rgba(61,42,140,0.07)] transition duration-300 hover:-translate-y-[3px] hover:shadow-[0_18px_42px_rgba(61,42,140,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700",
        accent.hover
      )}
      onClick={() =>
        trackQuoteEvent(quoteTrackingEvents.serviceCardClicked, {
          service: service.title,
          href: service.href
        })
      }
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition duration-200 group-hover:opacity-100",
          accent.line
        )}
        aria-hidden
      />
      <div className="flex items-start gap-4">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-md transition duration-200", accent.icon)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-charcoalInk">{service.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slateText">{service.description}</p>
      <ul className="mt-4 grid gap-1.5 text-xs font-semibold text-slateText sm:grid-cols-2">
        {service.points.slice(0, 3).map((point) => (
          <li
            key={point}
            className="inline-flex items-center gap-1.5"
          >
            <CheckCircle2 className={cn("h-3.5 w-3.5 shrink-0", accent.tag)} aria-hidden />
            {point}
          </li>
        ))}
      </ul>
      <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-wxIndigo700 transition duration-200 group-hover:text-wxIndigo900">
        View Service
        <ArrowRight
          className="h-4 w-4 transition duration-200 group-hover:translate-x-1"
          aria-hidden
        />
      </span>
    </Link>
  );
}
