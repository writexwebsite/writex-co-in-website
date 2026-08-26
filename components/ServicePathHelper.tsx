"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Compass } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/site";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { cn } from "@/lib/utils";

const documentOptions = [
  "Coursework brief",
  "Dissertation chapter",
  "Draft for editing",
  "SOP or admissions file",
  "Referencing/originality concern"
] as const;

const draftOptions = ["Complete draft", "Partial draft", "Brief only"] as const;

const difficultyOptions = [
  "Structure",
  "Editing clarity",
  "References",
  "Deadline",
  "Originality"
] as const;

type HelperState = {
  document: (typeof documentOptions)[number];
  draft: (typeof draftOptions)[number];
  difficulty: (typeof difficultyOptions)[number];
};

const initialState: HelperState = {
  document: "Coursework brief",
  draft: "Brief only",
  difficulty: "Structure"
};

function getRecommendation(state: HelperState) {
  if (state.document === "Dissertation chapter") {
    return {
      label: "Dissertation & Thesis Support",
      href: "/dissertation-thesis-support",
      copy: "Best when the brief involves chapters, supervisor comments, methodology, literature review, formatting, or long-form review."
    };
  }

  if (state.document === "SOP or admissions file") {
    return {
      label: "SOP & Admissions Support",
      href: "/sop-admissions-writing",
      copy: "Best when the task is about profile notes, prompts, CV/LOR polish, or a clearer admissions narrative."
    };
  }

  if (state.document === "Draft for editing" || state.difficulty === "Editing clarity") {
    return {
      label: "Academic Editing & Proofreading",
      href: "/editing-proofreading",
      copy: "Best when you already have text and need clarity, academic tone, structure, grammar, citations, or final-readiness review."
    };
  }

  if (state.document === "Referencing/originality concern" || state.difficulty === "Originality") {
    return {
      label: "Originality & AI Review",
      href: "/plagiarism-ai-review",
      copy: "Best when you need similarity review, citation repair, source attribution guidance, or human language review."
    };
  }

  if (state.difficulty === "References") {
    return {
      label: "Formatting & Referencing Support",
      href: "/formatting-referencing",
      copy: "Best when citations, reference lists, headings, tables, figures, or university formatting instructions need alignment."
    };
  }

  return {
    label: "Coursework & Brief Support",
    href: "/assignment-support",
    copy: "Best when the brief needs structure planning, research guidance, referencing support, editing, or learning-focused model guidance."
  };
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-slateText">
        {label}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option === value;

          return (
            <button
              key={option}
              type="button"
              data-state={selected ? "selected" : "default"}
              className={cn(
                "wx-interactive-state min-h-10 rounded-md border px-3 py-2 text-left text-xs font-semibold transition"
              )}
              aria-pressed={selected}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ServicePathHelper() {
  const [state, setState] = useState<HelperState>(initialState);
  const recommendation = useMemo(() => getRecommendation(state), [state]);

  function updateState(next: Partial<HelperState>) {
    setState((current) => {
      const updated = { ...current, ...next };
      trackQuoteEvent(quoteTrackingEvents.supportPathStarted, {
        document: updated.document,
        draft: updated.draft,
        difficulty: updated.difficulty
      });
      return updated;
    });
  }

  function trackCompletion(destination: string) {
    trackQuoteEvent(quoteTrackingEvents.supportPathCompleted, {
      destination,
      recommendedService: recommendation.label,
      document: state.document,
      draft: state.draft,
      difficulty: state.difficulty
    });
  }

  return (
    <aside className="mt-5 rounded-md border border-sageBorder bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.25fr] lg:items-start">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxViolet700">
              <Compass className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mutedCopper">
                Not sure where to start?
              </p>
              <h3 className="mt-1 text-xl font-semibold text-charcoalInk">
                Find the closest support path
              </h3>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slateText">
            Pick the closest situation. WriteX will still review the real brief
            before confirming scope.
          </p>
        </div>

        <div className="grid gap-4">
          <OptionGroup
            label="Document"
            options={documentOptions}
            value={state.document}
            onChange={(document) => updateState({ document })}
          />
          <OptionGroup
            label="Draft status"
            options={draftOptions}
            value={state.draft}
            onChange={(draft) => updateState({ draft })}
          />
          <OptionGroup
            label="Main difficulty"
            options={difficultyOptions}
            value={state.difficulty}
            onChange={(difficulty) => updateState({ difficulty })}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 rounded-md border border-softTeal/25 bg-paleSage p-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-softTeal" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-charcoalInk">
              Recommended path: {recommendation.label}
            </p>
            <p className="mt-1 text-sm leading-6 text-slateText">
              {recommendation.copy}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={recommendation.href}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-sageBorder bg-white px-4 text-sm font-semibold text-charcoalInk transition hover:border-mutedCopper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mutedCopper"
            onClick={() => trackCompletion("service_page")}
          >
            View service
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/pricing#quote"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-softTeal/35 bg-white px-4 text-sm font-semibold text-charcoalInk transition hover:border-mutedCopper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mutedCopper"
            onClick={() => trackCompletion("quote_form")}
          >
            Share Brief
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noreferrer"
            className="wx-gradient-action inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
            onClick={() => trackCompletion("whatsapp")}
          >
            <WhatsAppIcon className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
      </div>
    </aside>
  );
}
