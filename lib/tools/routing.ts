import type { TemplateId, ToolType } from "./config";
import type { ToolLeadCategory } from "./leadScoring";

type RouteInput = {
  toolType: ToolType | "term_plan";
  templateId?: TemplateId;
  deadline?: string;
  category: ToolLeadCategory;
  programmeOrRole?: string;
};

const slaMinutes = {
  priority: 5,
  termPlan: 10,
  completedTool: 15,
  template: 120
} as const;

export function routeToolLead(input: RouteInput) {
  const deadlineTime = input.deadline ? new Date(input.deadline).getTime() : Number.NaN;
  const urgent = Number.isFinite(deadlineTime) && deadlineTime - Date.now() <= 48 * 60 * 60 * 1000;
  let queue = "Admissions / CV Review";
  let recommendedService = "CV Review and SOP Support";
  let sla: number = slaMinutes.completedTool;

  if (input.toolType === "sop_builder") {
    queue = "SOP & Admissions";
    recommendedService = "SOP & Admissions Support";
  } else if (input.toolType === "template") {
    sla = slaMinutes.template;
    if (input.templateId === "dissertation-proposal-outline") {
      queue = "Dissertation";
      recommendedService = "Dissertation & Thesis Support";
    } else if (input.templateId === "literature-review-matrix") {
      queue = "Dissertation / Research";
      recommendedService = "Dissertation Research Guidance";
    } else if (input.templateId === "sop-planning-worksheet") {
      queue = "SOP & Admissions";
      recommendedService = "SOP & Admissions Support";
    }
  } else if (input.toolType === "term_plan") {
    queue = "Term Plan Priority";
    recommendedService = "Trimester Academic Support Plan";
    sla = slaMinutes.termPlan;
  }

  if (urgent) {
    queue = "Priority";
    sla = slaMinutes.priority;
  }

  if (input.category === "nurture" || input.category === "low_confidence") {
    queue = "Nurture";
    sla = slaMinutes.template;
  }

  return {
    queue,
    recommendedService,
    slaMinutes: sla,
    nextAction: queue === "Nurture" ? "Review lead quality before contact" : "Make first contact",
    suggestedMessage: buildSuggestedMessage(input, recommendedService)
  };
}

function buildSuggestedMessage(input: RouteInput, service: string) {
  const target = input.programmeOrRole ? ` for ${input.programmeOrRole}` : "";
  if (input.toolType === "sop_builder") {
    return `You created an SOP framework${target}. Would you like a human review of the programme-fit and career-direction sections?`;
  }
  if (input.toolType === "cv_builder") {
    return `You created a CV${target}. Would you like a human review for clarity, relevance, and presentation?`;
  }
  if (input.toolType === "term_plan") {
    return "You asked about a Trimester Academic Support Plan. May we review your expected deadlines and support areas?";
  }
  return `You downloaded a WriteX planning template. Would you like guidance through our ${service} pathway?`;
}
