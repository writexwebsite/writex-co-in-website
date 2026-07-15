import { academicIntegrityDisclaimer } from "@/lib/site";
import type { EditableContentStatus, SeoFaqItem, SeoInternalLink } from "./types";

export const editableStatus: EditableContentStatus =
  "Editable SEO draft - replace with WriteX/WIU approved copy before final rollout";

export const integrityDisclaimer = academicIntegrityDisclaimer;

export const links = {
  home: { label: "Home", href: "/" },
  pricing: { label: "Request a scope-based quote", href: "/pricing#quote" },
  contact: { label: "Contact WriteX", href: "/contact" },
  assignment: { label: "Coursework & Brief Support", href: "/assignment-support" },
  dissertation: {
    label: "Dissertation & Thesis Support",
    href: "/dissertation-thesis-support"
  },
  sop: { label: "SOP & Admissions Support", href: "/sop-admissions-writing" },
  editing: { label: "Academic Editing & Proofreading", href: "/editing-proofreading" },
  plagiarism: { label: "Originality & AI Review", href: "/plagiarism-ai-review" },
  formatting: {
    label: "Formatting & Referencing",
    href: "/formatting-referencing"
  },
  samples: { label: "Work quality", href: "/samples" },
  help: { label: "Academic guides", href: "/help" }
} satisfies Record<string, SeoInternalLink>;

export const serviceInternalLinks = [
  links.pricing,
  links.contact,
  links.assignment,
  links.dissertation,
  links.sop,
  links.editing,
  links.plagiarism,
  links.formatting
];

export const defaultSeoFaqs: SeoFaqItem[] = [
  {
    question: "Can I request a quote before confirming support?",
    answer:
      "Yes. Share the brief, deadline, word count, academic level, subject, and files so WriteX can review scope before quoting."
  },
  {
    question: "Is my information handled confidentially?",
    answer:
      "WriteX handles briefs, drafts, rubrics, SOP prompts, and support conversations through a private academic support workflow."
  },
  {
    question: "Is this academic integrity-safe support?",
    answer:
      "Yes. WriteX positions support around research guidance, editing, proofreading, formatting, referencing, originality review, AI review, and model solutions for learning."
  }
];

export const defaultSeoProcess = [
  "Share the brief, rubric, draft, deadline, academic level, subject, and any required referencing style.",
  "WriteX reviews the service type, document condition, missing details, and realistic support path.",
  "A scope-based quote is shared after the request is understood, not from a generic fixed-price table.",
  "Support begins after scope, timeline, and instructions are confirmed.",
  "The work is checked for clarity, structure, references, formatting, and agreed instructions."
];

export const standardUploadItems = [
  "Assignment brief or university instructions",
  "Marking rubric or assessment criteria",
  "Current draft, notes, or supervisor comments",
  "Deadline, word count, academic level, and subject",
  "Required referencing style or formatting guide"
];
