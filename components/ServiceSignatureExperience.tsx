import {
  ArrowRight,
  BookMarked,
  CheckCircle2,
  FileSearch,
  GitBranch,
  ListChecks,
  PenLine,
  Quote,
  ShieldCheck
} from "lucide-react";
import type { ServicePage } from "@/lib/content";
import { SectionReveal } from "./SectionReveal";

type SignatureCard = {
  label: string;
  title: string;
  copy: string;
};

type SignatureConfig = {
  eyebrow: string;
  title: string;
  description: string;
  mode:
    | "brief"
    | "spine"
    | "editing"
    | "admissions"
    | "signals"
    | "referencing";
  cards: SignatureCard[];
};

const signatureByPath: Record<string, SignatureConfig> = {
  "/assignment-support": {
    eyebrow: "Brief reading",
    title: "Turn a complicated brief into a clear support plan.",
    description:
      "WriteX starts by identifying the requirement, deadline, rubric, word count, referencing style, and key instruction before suggesting the support path.",
    mode: "brief",
    cards: [
      {
        label: "Requirement",
        title: "Question and task type",
        copy: "The brief is read for the exact academic action requested."
      },
      {
        label: "Rubric",
        title: "Marking signals",
        copy: "Criteria and learning outcomes are separated from background text."
      },
      {
        label: "Support path",
        title: "Structure, review, or references",
        copy: "The route is framed around guidance, editing, referencing, and learning support."
      }
    ]
  },
  "/dissertation-thesis-support": {
    eyebrow: "Research journey",
    title: "One research journey. Every chapter connected.",
    description:
      "Dissertation support is easier to scope when the chapter, supervisor comments, research direction, and formatting needs are viewed together.",
    mode: "spine",
    cards: [
      {
        label: "01",
        title: "Proposal",
        copy: "Aim, objectives, feasibility, and research direction."
      },
      {
        label: "02",
        title: "Literature review",
        copy: "Theme grouping, source integration, and academic flow."
      },
      {
        label: "03",
        title: "Methodology",
        copy: "Method choice, rationale, limitations, and presentation clarity."
      },
      {
        label: "04",
        title: "Final review",
        copy: "Formatting, referencing, supervisor comments, and final readiness."
      }
    ]
  },
  "/editing-proofreading": {
    eyebrow: "Editing lens",
    title: "Keep your thinking. Strengthen the writing.",
    description:
      "The review focuses on clarity, academic tone, flow, citation consistency, and presentation while preserving the student's underlying argument.",
    mode: "editing",
    cards: [
      {
        label: "Original",
        title: "Meaning is preserved",
        copy: "The draft is read for the student's intended point before edits are made."
      },
      {
        label: "Edited",
        title: "Language becomes clearer",
        copy: "Sentences, transitions, grammar, and academic tone are improved."
      },
      {
        label: "Why it changed",
        title: "Review logic stays visible",
        copy: "Edits are guided by clarity, structure, citations, and formatting needs."
      }
    ]
  },
  "/sop-admissions-writing": {
    eyebrow: "Admissions narrative",
    title: "Your story, structured with purpose.",
    description:
      "SOP and admissions support turns scattered profile notes into a clearer, programme-aware narrative without inventing experience.",
    mode: "admissions",
    cards: [
      {
        label: "Profile",
        title: "Evidence and background",
        copy: "Academic record, experience, goals, and genuine motivations are organised."
      },
      {
        label: "Fit",
        title: "Programme relevance",
        copy: "The narrative is aligned with the course, country, and admissions context."
      },
      {
        label: "Polish",
        title: "Tone and final review",
        copy: "Clarity, flow, grammar, CV/LOR consistency, and specificity are reviewed."
      }
    ]
  },
  "/plagiarism-ai-review": {
    eyebrow: "Originality signals",
    title: "Review the signals. Strengthen the integrity.",
    description:
      "Originality and AI review focuses on similarity, citation gaps, attribution, source use, and human academic language.",
    mode: "signals",
    cards: [
      {
        label: "Similarity",
        title: "Source overlap",
        copy: "Text is reviewed for areas that may need citation or clearer attribution."
      },
      {
        label: "AI-style signals",
        title: "Human language review",
        copy: "The review checks whether language sounds academic, natural, and accountable."
      },
      {
        label: "Integrity path",
        title: "Responsible correction",
        copy: "Support is framed around citation repair, guidance, and learning-focused review."
      }
    ]
  },
  "/formatting-referencing": {
    eyebrow: "Citation system",
    title: "Every citation in its place.",
    description:
      "Formatting and referencing support checks in-text citations, reference lists, headings, tables, figures, appendices, and supplied style rules.",
    mode: "referencing",
    cards: [
      {
        label: "In-text",
        title: "Citation alignment",
        copy: "Names, years, page details, and source order are reviewed for consistency."
      },
      {
        label: "Reference list",
        title: "Style guide match",
        copy: "Harvard, APA, MLA, Chicago, OSCOLA, or university rules are checked."
      },
      {
        label: "Presentation",
        title: "Layout and structure",
        copy: "Headings, spacing, figures, tables, captions, and appendices are aligned."
      }
    ]
  }
};

function SignatureVisual({ config }: { config: SignatureConfig }) {
  if (config.mode === "spine") {
    return (
      <div className="relative grid gap-3">
        <div
          aria-hidden
          className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-px bg-softTeal/35"
        />
        {config.cards.map((card, index) => (
          <div
            key={card.title}
            className="relative grid gap-3 rounded-md border border-sageBorder bg-white p-4 pl-14 shadow-sm"
          >
            <span className="absolute left-0 top-4 flex h-10 w-10 -translate-x-0 items-center justify-center rounded-md border border-softTeal/30 bg-paleSage text-xs font-semibold text-softTeal">
              {card.label}
            </span>
            <h3 className="text-base font-semibold text-charcoalInk">
              {card.title}
            </h3>
            <p className="text-sm leading-6 text-slateText">{card.copy}</p>
            {index < config.cards.length - 1 ? (
              <ArrowRight className="absolute right-4 top-5 h-4 w-4 text-mutedCopper" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  const visualIcons =
    config.mode === "editing"
      ? [FileSearch, PenLine, ListChecks]
      : config.mode === "admissions"
        ? [BookMarked, GitBranch, PenLine]
        : config.mode === "signals"
          ? [ShieldCheck, FileSearch, CheckCircle2]
          : config.mode === "referencing"
            ? [Quote, BookMarked, ListChecks]
            : [FileSearch, ListChecks, GitBranch];

  return (
    <div className="grid gap-3">
      {config.cards.map((card, index) => {
        const Icon = visualIcons[index] || FileSearch;

        return (
          <article
            key={card.title}
            className="group rounded-md border border-sageBorder bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-mutedCopper hover:shadow-soft"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxViolet700 transition group-hover:bg-wxViolet700 group-hover:text-white">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mutedCopper">
                  {card.label}
                </p>
                <h3 className="mt-1 text-base font-semibold text-charcoalInk">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slateText">
                  {card.copy}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ServiceSignatureExperience({ page }: { page: ServicePage }) {
  const config = signatureByPath[page.path];

  if (!config) return null;

  return (
    <section className="bg-white py-8 sm:py-10">
      <div className="premium-container grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <SectionReveal>
          <div className="rounded-md border border-sageBorder bg-warmIvory p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-softTeal">
              {config.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-charcoalInk sm:text-4xl">
              {config.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-slateText">
              {config.description}
            </p>
            <div className="mt-5 rounded-md border border-sageBorder bg-white px-4 py-3 text-sm font-semibold leading-6 text-charcoalInk">
              Bring the brief. Get a clear next step.
            </div>
          </div>
        </SectionReveal>
        <SectionReveal delay={0.06}>
          <div className="rounded-md border border-sageBorder bg-paleSage p-4 shadow-soft sm:p-5">
            <SignatureVisual config={config} />
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
