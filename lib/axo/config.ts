import type { AxoService, AxoState } from "./types";

export const AXO_FEATURES = {
  enabled: process.env.NEXT_PUBLIC_AXO_ENABLED !== "false",
  deterministicOnly:
    process.env.NEXT_PUBLIC_AXO_DETERMINISTIC_ONLY !== "false",
  uploadsEnabled: true,
  savedBriefsEnabled: true
} as const;

export const AXO_SERVICES: AxoService[] = [
  {
    id: "coursework",
    label: "Coursework & Brief Support",
    shortDescription: "Organise a coursework brief for research guidance, structure, editing, or referencing support.",
    path: "/assignment-support",
    fields: ["subject", "title", "academicLevel", "countrySystem", "wordCount", "deadline", "deadlineTime", "timezone", "referencingStyle", "requiredSources", "instructions"],
    manualReview: true
  },
  {
    id: "dissertation",
    label: "Dissertation & Thesis Support",
    shortDescription: "Prepare a proposal, chapter, methodology, feedback, or long-form review request.",
    path: "/dissertation-thesis-support",
    fields: ["degreeLevel", "subject", "title", "chapterRequirement", "wordCount", "methodology", "proposalStatus", "supervisorFeedback", "dataAvailability", "deadline", "deadlineTime", "timezone", "instructions"],
    manualReview: true
  },
  {
    id: "sop",
    label: "SOP & Admissions Support",
    shortDescription: "Structure an evidence-led SOP, personal statement, LOR, or CV review.",
    path: "/sop-admissions-writing",
    fields: ["sopPurpose", "targetProgramme", "countrySystem", "academicBackground", "workExperience", "careerObjective", "draftAvailability", "deadline", "timezone", "instructions"],
    manualReview: true
  },
  {
    id: "editing",
    label: "Academic Editing & Proofreading",
    shortDescription: "Scope clarity, grammar, academic tone, structure, citation, and final-readiness review.",
    path: "/editing-proofreading",
    fields: ["documentType", "academicLevel", "wordCount", "editingLevel", "referencingStyle", "deadline", "timezone", "instructions"],
    manualReview: true
  },
  {
    id: "originality",
    label: "Originality & AI Review",
    shortDescription: "Prepare a similarity, citation, source-attribution, or human language review request.",
    path: "/plagiarism-ai-review",
    fields: ["documentType", "academicLevel", "wordCount", "deadline", "timezone", "instructions"],
    manualReview: true
  },
  {
    id: "formatting",
    label: "Formatting & Referencing Support",
    shortDescription: "Scope citation, reference list, layout, tables, figures, and university-style checks.",
    path: "/formatting-referencing",
    fields: ["documentType", "academicLevel", "wordCount", "referencingStyle", "deadline", "timezone", "instructions"],
    manualReview: true
  }
];

export const AXO_ACADEMIC_LEVELS = ["Foundation / Diploma", "Undergraduate", "Postgraduate", "MBA", "Doctoral / PhD", "Admissions", "Other"];
export const AXO_REFERENCING_STYLES = ["Harvard", "APA", "MLA", "Chicago", "OSCOLA", "University-specific", "Not sure"];
export const AXO_TIMEZONES = ["Asia/Kolkata", "Europe/London", "Australia/Sydney", "America/Toronto", "Asia/Dubai", "Other / confirm with team"];
export const AXO_ACCEPTED_FILES = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.txt";
export const AXO_MAX_FILE_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB || 25);

export const AXO_CONTEXT_PROMPTS: Record<string, string> = {
  "/": "Need help preparing your requirement? I can organise the brief before you speak with our team.",
  "/assignment-support": "Do you already have the coursework brief, deadline, and word count?",
  "/dissertation-thesis-support": "I can help organise your topic, level, chapter requirement, deadline, and available research material.",
  "/sop-admissions-writing": "Is the SOP for university admission, visa, scholarship, or another purpose?",
  "/contact": "I can prepare an enquiry summary so you do not have to repeat the details.",
  "/pricing": "I can organise the details the team needs for a scope-based quote."
};

export const AXO_MASCOT_STATES: Record<AxoState, { label: string; position: string }> = Object.fromEntries(
  ["idle", "welcoming", "attentive", "curious", "thinking", "guiding", "reassuring", "waiting", "concerned", "pleased", "successful", "unavailable"].map((state) => [state, { label: state, position: "52% 38%" }])
) as Record<AxoState, { label: string; position: string }>;

export function getAxoService(id?: string) {
  return AXO_SERVICES.find((service) => service.id === id);
}
