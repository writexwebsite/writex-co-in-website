export const toolTypes = ["cv_builder", "sop_builder", "template"] as const;
export type ToolType = (typeof toolTypes)[number];

export const toolFeatureFlags = {
  publicHub: process.env.NEXT_PUBLIC_FREE_TOOLS_ENABLED === "true",
  cvBuilder: process.env.CV_BUILDER_ENABLED === "true",
  sopBuilder: process.env.SOP_BUILDER_ENABLED === "true",
  templates: process.env.TEMPLATE_LIBRARY_ENABLED === "true",
  termPlans: process.env.TERM_PLAN_INTEREST_ENABLED === "true",
  referrals: process.env.REFERRAL_PUBLIC_ENABLED === "true"
};

export const templateDefinitions = [
  {
    id: "academic-cv",
    name: "Academic CV Template",
    description: "Organise education, research, projects, publications, and academic experience clearly.",
    usage: "Replace the demonstration prompts with accurate evidence from your own academic record.",
    service: "CV Review and SOP Support",
    serviceHref: "/sop-admissions-writing"
  },
  {
    id: "graduate-cv",
    name: "Graduate CV Template",
    description: "Present education, transferable skills, placements, and early-career evidence concisely.",
    usage: "Prioritise relevant evidence and adapt the profile to the role or programme you are targeting.",
    service: "CV Review and SOP Support",
    serviceHref: "/sop-admissions-writing"
  },
  {
    id: "sop-planning-worksheet",
    name: "SOP Planning Worksheet",
    description: "Map programme fit, evidence, motivation, and career direction before drafting.",
    usage: "Answer each prompt with specific examples, then use the responses to plan your narrative.",
    service: "SOP & Admissions Support",
    serviceHref: "/sop-admissions-writing"
  },
  {
    id: "dissertation-proposal-outline",
    name: "Dissertation Proposal Outline",
    description: "Plan the research problem, aim, objectives, literature context, and proposed methodology.",
    usage: "Use your institution's brief and supervisor guidance to adapt every section.",
    service: "Dissertation & Thesis Support",
    serviceHref: "/dissertation-thesis-support"
  },
  {
    id: "literature-review-matrix",
    name: "Literature Review Matrix",
    description: "Compare sources by method, findings, limitations, relevance, and emerging themes.",
    usage: "Add one source per row and use the theme column to identify synthesis opportunities.",
    service: "Dissertation & Research Guidance",
    serviceHref: "/dissertation-thesis-support"
  }
] as const;

export type TemplateId = (typeof templateDefinitions)[number]["id"];

export function isTemplateId(value: string): value is TemplateId {
  return templateDefinitions.some((template) => template.id === value);
}

