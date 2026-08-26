"use client";

import { useMemo, useState } from "react";
import { sampleCards } from "@/lib/content";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { SampleCard } from "./SampleCard";

const filters = [
  "All",
  "Coursework structure",
  "Dissertation review",
  "SOP narrative",
  "Academic editing",
  "Referencing",
  "Research proposal"
] as const;

const serviceHrefByTitle: Record<string, string> = {
  "MBA Coursework Structure Improvement": "/assignment-support",
  "Dissertation Literature Review Editing": "/dissertation-thesis-support",
  "SOP Transformation": "/sop-admissions-writing",
  "Harvard Referencing Correction": "/formatting-referencing",
  "Research Proposal Refinement": "/dissertation-thesis-support",
  "Academic Proofreading Review": "/editing-proofreading"
};

function sampleMatchesFilter(sample: (typeof sampleCards)[number], filter: string) {
  if (filter === "All") return true;

  const haystack = `${sample.title} ${sample.description} ${sample.tags.join(" ")}`.toLowerCase();

  if (filter === "Coursework structure") {
    return haystack.includes("coursework") || haystack.includes("structure");
  }
  if (filter === "Dissertation review") {
    return haystack.includes("dissertation") || haystack.includes("literature");
  }
  if (filter === "SOP narrative") {
    return haystack.includes("sop") || haystack.includes("narrative");
  }
  if (filter === "Academic editing") {
    return haystack.includes("editing") || haystack.includes("clarity");
  }
  if (filter === "Referencing") {
    return haystack.includes("referencing") || haystack.includes("citation");
  }

  return haystack.includes("proposal") || haystack.includes("methods");
}

export function SampleExplorer() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");
  const visibleSamples = useMemo(
    () => sampleCards.filter((sample) => sampleMatchesFilter(sample, activeFilter)),
    [activeFilter]
  );

  return (
    <div>
      <div
        className="flex gap-2 overflow-x-auto pb-2"
        role="tablist"
        aria-label="Sample category filters"
      >
        {filters.map((filter) => {
          const active = filter === activeFilter;

          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={active}
              data-state={active ? "selected" : "default"}
              className="wx-interactive-state min-h-10 shrink-0 rounded-md border px-3 py-2 text-sm font-semibold transition"
              onClick={() => {
                setActiveFilter(filter);
                trackQuoteEvent(quoteTrackingEvents.sampleInteraction, {
                  filter
                });
              }}
            >
              {filter}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleSamples.map((sample) => (
          <SampleCard
            key={sample.title}
            title={sample.title}
            description={sample.description}
            category={sample.category}
            reviewed={sample.reviewed}
            changed={sample.changed}
            learn={sample.learn}
            tags={sample.tags}
            ctaHref={serviceHrefByTitle[sample.title] || "/pricing#quote"}
          />
        ))}
      </div>
    </div>
  );
}
