import "server-only";

import { normalizeInvoiceId, normalizeWhatsapp } from "@/lib/client/identifiers";
import type {
  MyWritexCustomer,
  MyWritexDocument,
  MyWritexProject,
  MyWritexProjectFile,
  MyWritexTimelineStage,
} from "@/lib/my-writex/types";

export const MY_WRITEX_DEV_CUSTOMER_ID = "CUST-TEST-001";
export const MY_WRITEX_DEV_WRITEX_ID = "rahulsharma.7k2";
export const MY_WRITEX_DEV_PHONE = "+447700900001";
export const MY_WRITEX_DEV_INVOICE = "WX-MW-1001";
export const MY_WRITEX_DEV_CUSTOMER_B_ID = "CUST-TEST-002";
export const MY_WRITEX_DEV_WRITEX_B_ID = "sarahjones.9m4";
export const MY_WRITEX_DEV_PHONE_B = "+447700900002";

export function isMyWritexDevFixtureEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.MY_WRITEX_DEV_FIXTURES === "true"
  );
}

const timelineEvents = [
  ["requirement_received", "Requirement Received", "Your brief reached WriteX and was added to this project."],
  ["requirement_confirmed", "Requirement Confirmed", "The agreed scope and delivery expectation were confirmed."],
  ["payment_confirmed", "Payment Confirmed", "The verified payment position was linked to this project."],
  ["work_started", "Work Started", "Your WriteX team began the agreed work."],
  ["in_progress", "In Progress", "The work moved through the active production stage."],
  ["quality_review", "Quality Review", "The work is being reviewed for accuracy and presentation."],
  ["ready_for_delivery", "Ready for Delivery", "The approved files are ready in your project room."],
  ["delivered", "Delivered", "The project was delivered to you."],
] as const;

function timeline(
  currentKey: (typeof timelineEvents)[number][0],
  dates: Partial<Record<(typeof timelineEvents)[number][0], string>>,
): MyWritexTimelineStage[] {
  const currentIndex = timelineEvents.findIndex(([key]) => key === currentKey);
  return timelineEvents.slice(0, currentIndex + 1).map(([key, label, description], index) => ({
    key,
    label,
    description,
    date: dates[key],
    state: index === currentIndex ? ("current" as const) : ("complete" as const),
  }));
}

const projects: MyWritexProject[] = [
  {
    id: "project-research-proposal",
    customerMasterId: MY_WRITEX_DEV_CUSTOMER_ID,
    invoiceReference: MY_WRITEX_DEV_INVOICE,
    title: "Research Proposal",
    service: "Research Proposal Support",
    category: "Academic Research",
    phase: "active",
    status: "quality_review",
    deliveryDate: "2026-08-28",
    nextAction: "Review the delivery note tomorrow",
    nextActionHref: "/my-writex/projects/project-research-proposal",
    summary:
      "A focused research proposal covering the problem statement, methodology and a submission-ready structure.",
    progressLabel: "Quality Review",
    timeline: timeline("quality_review", {
      requirement_received: "2026-08-18",
      requirement_confirmed: "2026-08-19",
      payment_confirmed: "2026-08-19",
      work_started: "2026-08-20",
      in_progress: "2026-08-21",
      quality_review: "2026-08-26",
    }),
    files: [
      { id: "file-rp-brief", name: "Research proposal brief.pdf", kind: "brief", addedAt: "2026-08-18", sizeLabel: "1.8 MB" },
      { id: "file-rp-notes", name: "Supervisor notes.docx", kind: "reference", addedAt: "2026-08-19", sizeLabel: "640 KB" },
      { id: "file-rp-invoice", name: "Invoice WX-MW-1001.pdf", kind: "invoice", addedAt: "2026-08-18", sizeLabel: "182 KB" },
    ],
    payment: { currency: "GBP", total: 420, paid: 420, status: "Paid" },
    canOrderSimilar: false,
  },
  {
    id: "project-dissertation-chapter-four",
    customerMasterId: MY_WRITEX_DEV_CUSTOMER_ID,
    invoiceReference: "WX-MW-1002",
    title: "Dissertation — Chapter Four",
    service: "Dissertation Support",
    category: "Data Analysis",
    phase: "active",
    status: "in_progress",
    deliveryDate: "2026-09-04",
    nextAction: "No action needed — we are working on it",
    nextActionHref: "/my-writex/projects/project-dissertation-chapter-four",
    summary:
      "Results interpretation and a clear chapter narrative aligned to the approved methodology.",
    progressLabel: "In Progress",
    timeline: timeline("in_progress", {
      requirement_received: "2026-08-21",
      requirement_confirmed: "2026-08-22",
      payment_confirmed: "2026-08-22",
      work_started: "2026-08-23",
      in_progress: "2026-08-24",
    }),
    files: [
      { id: "file-d4-data", name: "Anonymised dataset.xlsx", kind: "reference", addedAt: "2026-08-23", sizeLabel: "2.4 MB" },
      { id: "file-d4-outline", name: "Approved chapter outline.docx", kind: "brief", addedAt: "2026-08-22", sizeLabel: "84 KB" },
      { id: "file-d4-guide", name: "Analysis approach.pdf", kind: "supporting", addedAt: "2026-08-24", sizeLabel: "310 KB" },
    ],
    payment: { currency: "GBP", total: 680, paid: 340, status: "Partially paid" },
    canOrderSimilar: false,
  },
  {
    id: "project-strategy-case-analysis",
    customerMasterId: MY_WRITEX_DEV_CUSTOMER_ID,
    invoiceReference: "WX-MW-1003",
    title: "Strategic Management Case Analysis",
    service: "Assignment Support",
    category: "Management",
    phase: "active",
    status: "awaiting_information",
    deliveryDate: "2026-09-07",
    nextAction: "Upload your marking rubric",
    nextActionHref: "/my-writex/projects/project-strategy-case-analysis#files",
    summary:
      "A structured case analysis connecting strategic frameworks to the evidence in your selected organisation.",
    progressLabel: "Awaiting Information",
    timeline: timeline("requirement_received", {
      requirement_received: "2026-08-26",
    }),
    files: [
      { id: "file-ca-brief", name: "Module brief.pdf", kind: "brief", addedAt: "2026-08-26", sizeLabel: "920 KB" },
    ],
    payment: { currency: "GBP", total: 310, paid: 100, status: "Partially paid" },
    canOrderSimilar: false,
  },
  {
    id: "project-marketing-presentation-october",
    customerMasterId: MY_WRITEX_DEV_CUSTOMER_ID,
    invoiceReference: "WX-MW-1004",
    title: "Marketing Presentation",
    service: "Presentation Support",
    category: "Marketing",
    phase: "upcoming",
    status: "payment_pending",
    deliveryDate: "2026-10-10",
    nextAction: "Review the pending invoice",
    nextActionHref: "/my-writex/invoices",
    summary:
      "A planned presentation project reserved for October, ready for the final brief and payment confirmation.",
    progressLabel: "Payment Pending",
    timeline: timeline("requirement_confirmed", {
      requirement_received: "2026-08-25",
      requirement_confirmed: "2026-08-26",
    }),
    files: [
      { id: "file-mp-outline", name: "Presentation outline.docx", kind: "brief", addedAt: "2026-08-25", sizeLabel: "72 KB" },
      { id: "file-mp-invoice", name: "Invoice WX-MW-1004.pdf", kind: "invoice", addedAt: "2026-08-26", sizeLabel: "174 KB" },
    ],
    payment: { currency: "GBP", total: 260, paid: 0, status: "Payment due" },
    canOrderSimilar: false,
  },
  {
    id: "project-literature-review",
    customerMasterId: MY_WRITEX_DEV_CUSTOMER_ID,
    invoiceReference: "WX-MW-0978",
    title: "Systematic Literature Review",
    service: "Literature Review Support",
    category: "Academic Research",
    phase: "completed",
    status: "completed",
    deliveryDate: "2026-06-12",
    nextAction: "Order similar work when you are ready",
    nextActionHref: "/my-writex/start?similar=project-literature-review",
    summary:
      "Completed review with a documented search strategy and synthesis framework.",
    progressLabel: "Completed",
    timeline: timeline("delivered", {
      requirement_received: "2026-05-28",
      requirement_confirmed: "2026-05-29",
      payment_confirmed: "2026-05-29",
      work_started: "2026-05-30",
      in_progress: "2026-06-01",
      quality_review: "2026-06-10",
      ready_for_delivery: "2026-06-12",
      delivered: "2026-06-12",
    }),
    files: [
      { id: "file-lr-final", name: "Literature review — final.docx", kind: "delivery", addedAt: "2026-06-12", sizeLabel: "1.2 MB" },
      { id: "file-lr-receipt", name: "Payment receipt.pdf", kind: "receipt", addedAt: "2026-06-10", sizeLabel: "96 KB" },
    ],
    payment: { currency: "GBP", total: 540, paid: 540, status: "Paid" },
    canOrderSimilar: true,
    qualitySummary: {
      headline: "Reviewed across structure, sources and presentation",
      reviewedAt: "2026-06-12",
      checks: [
        { label: "Brief alignment", detail: "Delivery reviewed against the confirmed scope.", state: "confirmed" },
        { label: "Source presentation", detail: "Citations and reference list reviewed for consistency.", state: "reviewed" },
        { label: "Final presentation", detail: "Document structure and formatting reviewed before delivery.", state: "reviewed" },
      ],
    },
  },
  {
    id: "project-mba-presentation",
    customerMasterId: MY_WRITEX_DEV_CUSTOMER_ID,
    invoiceReference: "WX-MW-0951",
    title: "MBA Strategy Presentation",
    service: "Presentation Support",
    category: "Business Strategy",
    phase: "delivered",
    status: "delivered",
    deliveryDate: "2026-04-22",
    nextAction: "View your delivered files",
    nextActionHref: "/my-writex/projects/project-mba-presentation#files",
    summary:
      "A concise executive presentation with speaker notes and supporting sources.",
    progressLabel: "Delivered",
    timeline: timeline("delivered", {
      requirement_received: "2026-04-10",
      requirement_confirmed: "2026-04-11",
      payment_confirmed: "2026-04-11",
      work_started: "2026-04-12",
      in_progress: "2026-04-14",
      quality_review: "2026-04-20",
      ready_for_delivery: "2026-04-22",
      delivered: "2026-04-22",
    }),
    files: [
      { id: "file-mba-final", name: "Strategy presentation — final.pptx", kind: "delivery", addedAt: "2026-04-22", sizeLabel: "4.8 MB" },
    ],
    payment: { currency: "GBP", total: 290, paid: 290, status: "Paid" },
    canOrderSimilar: true,
    qualitySummary: {
      headline: "Presentation and speaker-note review completed",
      reviewedAt: "2026-04-22",
      checks: [
        { label: "Narrative flow", detail: "Slide sequence reviewed against the approved outline.", state: "confirmed" },
        { label: "Visual consistency", detail: "Layout, hierarchy and legibility reviewed.", state: "reviewed" },
        { label: "Speaker notes", detail: "Notes reviewed for continuity with each slide.", state: "reviewed" },
      ],
    },
  },
];

const fileKindLabels: Record<MyWritexProjectFile["kind"], MyWritexDocument["kind"]> = {
  brief: "Brief",
  reference: "Reference",
  supporting: "Supporting file",
  delivery: "Delivered file",
  invoice: "Invoice",
  receipt: "Receipt",
};

const documents = projects.flatMap((project) =>
  project.files.map((file) => ({
    id: file.id,
    name: file.name,
    kind: fileKindLabels[file.kind],
    addedAt: file.addedAt,
    projectId: project.id,
    projectTitle: project.title,
    sizeLabel: file.sizeLabel,
  })),
);

const customer: MyWritexCustomer = {
  customerMasterId: MY_WRITEX_DEV_CUSTOMER_ID,
  writeXId: MY_WRITEX_DEV_WRITEX_ID,
  registeredPhone: MY_WRITEX_DEV_PHONE,
  name: "Rahul Sharma",
  preferredName: "Rahul",
  relationshipSince: 2023,
  clientStatus: "Preferred Client",
  manager: {
    name: "Aman",
    role: "Relationship Manager",
    supportingCopy: "Your main point of contact at WriteX.",
    whatsappLabel: "Message on WhatsApp",
    backup: {
      name: "Priya",
      role: "Client Support Manager",
      message: "Aman is unavailable today. Priya is covering your account.",
    },
  },
  summary: {
    activeProjects: 3,
    completedProjects: 44,
    upcomingDeliveries: 2,
    pendingActions: 3,
  },
  projects,
  invoices: projects.map((project, index) => ({
    invoiceReference: project.invoiceReference,
    projectId: project.id,
    projectTitle: project.title,
    issuedAt: ["2026-08-18", "2026-08-22", "2026-08-26", "2026-08-26", "2026-05-28", "2026-04-10"][index],
    amount: project.payment.total,
    currency: project.payment.currency,
    paymentStatus:
      project.payment.status === "Paid"
        ? ("Paid" as const)
        : project.payment.status === "Partially paid"
          ? ("Partially Paid" as const)
          : project.payment.status === "Cancelled"
            ? ("Cancelled" as const)
            : ("Pending" as const),
  })),
  documents,
  historicalRequests: [
    { id: "request-1", title: "Harvard referencing check", type: "Support", status: "Resolved", createdAt: "2026-06-13" },
    { id: "request-2", title: "Discuss Chapter Four results", type: "Callback", status: "Reviewing", createdAt: "2026-08-25" },
    { id: "request-3", title: "Delivery-format update", type: "General Query", status: "Waiting for Customer", createdAt: "2026-08-26" },
  ],
  pendingActions: [
    { id: "action-rubric", title: "Upload your marking rubric", context: "Strategic Management Case Analysis", href: "/my-writex/projects/project-strategy-case-analysis#files", tone: "attention" },
    { id: "action-invoice", title: "Review the pending invoice", context: "Marketing Presentation", href: "/my-writex/invoices", tone: "payment" },
    { id: "action-delivery", title: "Delivery tomorrow", context: "Research Proposal", href: "/my-writex/projects/project-research-proposal", tone: "delivery" },
  ],
  relationshipTimeline: [
    { year: 2023, type: "Joined", title: "Joined WriteX", description: "Your first project marked the beginning of our work together." },
    { year: 2024, type: "Project milestone", title: "10 Projects Completed", description: "A dependable rhythm across assignments and research support." },
    { year: 2025, type: "Client status milestone", title: "Preferred Client Status", description: "Recognised for your continued relationship with WriteX." },
    { year: 2026, type: "Project milestone", title: "40+ Projects Completed", description: "A growing body of work, context and shared understanding." },
  ],
  upcomingWork: [
    { id: "upcoming-1", title: "Research Proposal", dueLabel: "Due in 22 days", targetDate: "2026-09-18", note: "Confirm the research area after the supervisor meeting." },
    { id: "upcoming-2", title: "Marketing Presentation", dueLabel: "Due in 44 days", targetDate: "2026-10-10", note: "Prepare the presentation brief and marking criteria." },
  ],
  profile: {
    country: "United Kingdom",
    institution: "University of Manchester",
    programme: "MSc Management",
    serviceInterests: ["Dissertation support", "Research proposals", "Academic editing"],
    referencingPreference: "Harvard",
    preferredContactTime: "Weekdays, 4–7 PM (UK time)",
  },
  career: {
    profile: {
      education: [{ qualification: "MSc Management", institution: "University of Manchester", period: "2025–2026" }],
      employmentHistory: [{ role: "Student Research Assistant", organisation: "Manchester Business School", period: "2026" }],
      certificates: ["Microsoft Excel — Intermediate", "Foundations of Project Management"],
      projects: ["Dissertation data analysis", "Strategic management case analysis"],
      targetRoles: ["Graduate Business Analyst", "Strategy Analyst", "Research Associate"],
      preferredLocations: ["Manchester", "London", "Remote — UK"],
      workModes: ["Hybrid", "Remote"],
      strengths: ["Research", "Structured problem solving", "Stakeholder communication"],
      graduationDate: "September 2026",
      availability: "Available from October 2026",
      completeness: 82,
    },
    jobs: [
      { id: "job-northstar-analyst", role: "Graduate Business Analyst", employer: "Northstar Advisory", location: "Manchester", arrangement: "Hybrid", employmentType: "Graduate scheme", category: "Consulting", postedAt: "2026-08-25", source: "Northstar Careers", lastChecked: "2026-08-27 09:15 BST", summary: "Join a rotational analyst programme supporting client research, operating-model reviews and transformation projects.", skills: ["Research", "Excel", "Presentation", "Stakeholder communication"], matchReason: "Strong fit with your MSc, research work and preference for Manchester-based hybrid roles." },
      { id: "job-arc-strategy", role: "Junior Strategy Analyst", employer: "Arc & Field", location: "London", arrangement: "Hybrid", employmentType: "Full time", category: "Strategy", postedAt: "2026-08-24", source: "Arc & Field Careers", lastChecked: "2026-08-27 09:15 BST", summary: "Support market analysis, strategic planning and concise executive recommendations for growth-stage clients.", skills: ["Market research", "PowerPoint", "Analysis"], matchReason: "Matches your strategy focus and presentation experience." },
      { id: "job-civic-research", role: "Research Associate", employer: "Civic Futures Lab", location: "Remote — UK", arrangement: "Remote", employmentType: "Full time", category: "Research", postedAt: "2026-08-23", source: "Civic Futures Jobs", lastChecked: "2026-08-27 09:15 BST", summary: "Deliver desk research, evidence reviews and stakeholder-ready synthesis across public-interest programmes.", skills: ["Evidence review", "Writing", "Qualitative research"], matchReason: "A direct fit with your evidence synthesis and research-proposal strengths." },
      { id: "job-meridian-insights", role: "Commercial Insights Intern", employer: "Meridian Foods", location: "Leeds", arrangement: "Hybrid", employmentType: "Internship", category: "Insights", postedAt: "2026-08-22", source: "Meridian Early Careers", lastChecked: "2026-08-27 09:15 BST", summary: "Work with customer and market data to surface clear commercial opportunities for brand teams.", skills: ["Excel", "Consumer research", "Communication"], matchReason: "Builds on your analytical coursework and interest in commercial strategy." },
      { id: "job-brightline-pmo", role: "Graduate PMO Analyst", employer: "Brightline Digital", location: "Birmingham", arrangement: "Hybrid", employmentType: "Graduate scheme", category: "Project management", postedAt: "2026-08-21", source: "Brightline Careers", lastChecked: "2026-08-27 09:15 BST", summary: "Coordinate delivery reporting, risk tracking and stakeholder updates across digital transformation work.", skills: ["Organisation", "Reporting", "Stakeholder management"], matchReason: "Relevant to your structured working style and management programme." },
      { id: "job-verity-ops", role: "Operations Analyst", employer: "Verity Health", location: "London", arrangement: "On-site", employmentType: "Full time", category: "Operations", postedAt: "2026-08-20", source: "Verity Careers", lastChecked: "2026-08-27 09:15 BST", summary: "Analyse operating performance and help improve service processes across a growing health network.", skills: ["Data analysis", "Process mapping", "Excel"], matchReason: "Good functional match, though the on-site pattern is outside your preferred work modes." },
      { id: "job-harbour-marketing", role: "Marketing Planning Assistant", employer: "Harbour Living", location: "Manchester", arrangement: "On-site", employmentType: "Part time", category: "Marketing", postedAt: "2026-08-19", source: "Harbour Careers", lastChecked: "2026-08-27 09:15 BST", summary: "Support campaign planning, reporting and competitor tracking for a national consumer brand.", skills: ["Marketing", "Reporting", "Presentation"], matchReason: "Local part-time role with overlap across your marketing and presentation projects." },
      { id: "job-kinetic-data", role: "Junior Data Analyst", employer: "Kinetic Mobility", location: "Remote — UK", arrangement: "Remote", employmentType: "Full time", category: "Data", postedAt: "2026-08-18", source: "Kinetic Jobs", lastChecked: "2026-08-27 09:15 BST", summary: "Prepare recurring reporting and translate operational data into clear, decision-ready insights.", skills: ["Excel", "Data visualisation", "SQL"], matchReason: "Strong analysis overlap; SQL would be an area to strengthen before applying." },
    ],
    cvs: [
      { id: "cv-graduate-analyst", name: "Graduate Analyst CV", focus: "Consulting and strategy roles", updatedAt: "2026-08-25", template: "Structured", status: "Ready" },
      { id: "cv-research", name: "Research & Insights CV", focus: "Research associate roles", updatedAt: "2026-08-18", template: "Editorial", status: "Needs review" },
      { id: "cv-general", name: "General MSc CV", focus: "Broad graduate applications", updatedAt: "2026-07-29", template: "Classic", status: "Draft" },
    ],
    applications: [
      { id: "application-1", role: "Graduate Consultant", employer: "Westbridge Partners", stage: "Interview", updatedAt: "2026-08-26", nextStep: "Prepare two commercial-awareness examples" },
      { id: "application-2", role: "Research Analyst", employer: "Signal Works", stage: "Applied", updatedAt: "2026-08-24", nextStep: "Await response after application review" },
      { id: "application-3", role: "Junior Business Analyst", employer: "Delta North", stage: "Saved", updatedAt: "2026-08-23", nextStep: "Tailor the Graduate Analyst CV" },
      { id: "application-4", role: "Strategy Intern", employer: "Greenline Group", stage: "Closed", updatedAt: "2026-08-12", nextStep: "Record learning notes" },
      { id: "application-5", role: "Operations Graduate", employer: "Avon Systems", stage: "Offer", updatedAt: "2026-08-20", nextStep: "Review offer questions with your adviser" },
    ],
    interview: {
      nextSession: "Westbridge Partners · 2 September",
      focus: "Commercial awareness and structured examples",
      questionSets: 4,
    },
  },
};

const secondaryCustomer: MyWritexCustomer = {
  ...customer,
  customerMasterId: MY_WRITEX_DEV_CUSTOMER_B_ID,
  writeXId: MY_WRITEX_DEV_WRITEX_B_ID,
  registeredPhone: MY_WRITEX_DEV_PHONE_B,
  name: "Sarah Jones",
  preferredName: "Sarah",
  relationshipSince: 2026,
  clientStatus: "Local UAT Customer",
  summary: { activeProjects: 0, completedProjects: 0, upcomingDeliveries: 0, pendingActions: 0 },
  projects: [],
  invoices: [],
  documents: [],
  historicalRequests: [],
  pendingActions: [],
  relationshipTimeline: [],
  upcomingWork: [],
};

export function normalizeWriteXId(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function resolveDevelopmentInvoice(identifier: string, phone: string) {
  if (!isMyWritexDevFixtureEnabled()) return null;
  if (
    normalizeInvoiceId(identifier) !== MY_WRITEX_DEV_INVOICE ||
    normalizeWhatsapp(phone) !== MY_WRITEX_DEV_PHONE
  ) {
    return null;
  }
  const project = projects.find(
    (item) => item.invoiceReference === MY_WRITEX_DEV_INVOICE,
  )!;
  return {
    invoiceId: MY_WRITEX_DEV_INVOICE,
    customerMasterId: customer.customerMasterId,
    displayName: customer.name,
    project,
  };
}

export function resolveDevelopmentCustomer(identifier: string, phone: string) {
  if (!isMyWritexDevFixtureEnabled()) return null;
  if (
    normalizeWriteXId(identifier) === secondaryCustomer.writeXId &&
    normalizeWhatsapp(phone) === secondaryCustomer.registeredPhone
  ) return secondaryCustomer;
  if (
    normalizeWriteXId(identifier) !== customer.writeXId ||
    normalizeWhatsapp(phone) !== customer.registeredPhone
  ) {
    return null;
  }
  return customer;
}

export function getDevelopmentCustomer(customerMasterId: string) {
  if (!isMyWritexDevFixtureEnabled()) return null;
  if (customerMasterId === customer.customerMasterId) return customer;
  if (customerMasterId === secondaryCustomer.customerMasterId) return secondaryCustomer;
  return null;
}

export function getDevelopmentProjectForCustomer(
  customerMasterId: string,
  projectId: string,
) {
  const authorizedCustomer = getDevelopmentCustomer(customerMasterId);
  if (!authorizedCustomer) return null;
  return (
    authorizedCustomer.projects.find(
      (project) =>
        project.id === projectId &&
        project.customerMasterId === authorizedCustomer.customerMasterId,
    ) || null
  );
}

export function getDevelopmentProjectForInvoice(invoiceReference: string) {
  if (!isMyWritexDevFixtureEnabled()) return null;
  const normalized = normalizeInvoiceId(invoiceReference);
  return (
    projects.find((project) => project.invoiceReference === normalized) || null
  );
}
