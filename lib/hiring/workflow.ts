export type HiringWorkflowInput = {
  role: string;
  stage: string;
  assignedReviewer?: boolean;
  hasEligibility?: boolean;
  hasAssessment?: boolean;
  assessmentState?: string | null;
  hasSystemReview?: boolean;
  hasAdminReview?: boolean;
  hasInterview?: boolean;
  interviewCompleted?: boolean;
  hasFinalDecision?: boolean;
  hasSalesVideo?: boolean;
  hasSalesVideoReview?: boolean;
};

export type HiringBlocker = { code: string; title: string; detail: string; action: string; href: string };

export function getHiringWorkflow(input: HiringWorkflowInput) {
  const blockers: HiringBlocker[] = [];
  if (!input.assignedReviewer) blockers.push({ code:"REVIEWER_UNASSIGNED",title:"Owner required",detail:"Assign an authorised hiring owner before the candidate moves forward.",action:"Assign owner",href:"#candidate-action" });
  if (input.role === "sales_executive" && !input.hasSalesVideo) blockers.push({ code:"SALES_VIDEO_MISSING",title:"Sales video introduction missing",detail:"The Sales application cannot enter eligibility review until the candidate supplies the consented 60-120 second video.",action:"Request video",href:"#candidate-video" });
  if (input.role === "sales_executive" && input.hasSalesVideo && !input.hasSalesVideoReview) blockers.push({ code:"SALES_VIDEO_REVIEW_PENDING",title:"Human video review pending",detail:"Watch the private video and record the structured human review. No automated appearance or body-language inference is used.",action:"Review video",href:"#candidate-video" });

  let next={ label:"Review current stage", reason:"Confirm the evidence and choose the next approved action.", href:"#candidate-action" };
  if (blockers.length) next={label:blockers[0].action,reason:blockers[0].detail,href:blockers[0].href};
  else if (!input.hasEligibility) next={label:"Complete eligibility",reason:"Record the human eligibility review before releasing an assessment.",href:"#candidate-eligibility-action"};
  else if (!input.hasAssessment) next={label:"Release assessment",reason:"Eligibility is complete; send the role-specific assessment.",href:"#candidate-action"};
  else if (input.assessmentState !== "submitted") next={label:"Await assessment",reason:"The assessment is active; no review can begin until the candidate submits it.",href:"#candidate-assessment"};
  else if (!input.hasSystemReview) next={label:"Run System Review",reason:"The submitted assessment awaits the separate rules-based System Review.",href:"#candidate-system-review-action"};
  else if (!input.hasAdminReview) next={label:"Record HR Review",reason:"System Review is complete; an authorised person must record the independent human review.",href:"#candidate-admin-review-action"};
  else if (!input.interviewCompleted) next={label:input.hasInterview?"Complete interview":"Schedule interview",reason:"The HR Review is complete; record the required interview before the final decision.",href:"#candidate-interview"};
  else if (!input.hasFinalDecision) next={label:"Record decision",reason:"All review evidence is complete and the final human outcome is ready.",href:"#candidate-decision-action"};
  else next={label:"Journey complete",reason:"The final human hiring outcome is recorded. Review the outcome or audit history if needed.",href:"#candidate-decision"};

  const steps=[
    {label:"Application",complete:true},
    {label:"Eligibility",complete:Boolean(input.hasEligibility)},
    {label:"Assessment + System Review",complete:Boolean(input.hasAssessment&&input.assessmentState==="submitted"&&input.hasSystemReview)},
    {label:"HR Review",complete:Boolean(input.hasAdminReview)},
    {label:"Interview",complete:Boolean(input.interviewCompleted)},
    {label:"Decision / Talent Pool",complete:Boolean(input.hasFinalDecision||input.stage==="talent_pool")}
  ];
  return { blockers, next, steps };
}
