export type MyWritexProjectStatus =
  | "awaiting_information"
  | "payment_pending"
  | "in_progress"
  | "quality_review"
  | "ready_for_delivery"
  | "delivered"
  | "completed";

export type MyWritexProjectPhase =
  | "active"
  | "upcoming"
  | "delivered"
  | "completed";

export type MyWritexTimelineStage = {
  key: string;
  label: string;
  state: "complete" | "current" | "upcoming";
  date?: string;
  description?: string;
};

export type MyWritexProjectFile = {
  id: string;
  name: string;
  kind:
    | "brief"
    | "reference"
    | "supporting"
    | "delivery"
    | "invoice"
    | "receipt";
  addedAt: string;
  sizeLabel: string;
};

export type MyWritexProject = {
  id: string;
  customerMasterId: string;
  invoiceReference: string;
  title: string;
  service: string;
  category: string;
  phase: MyWritexProjectPhase;
  status: MyWritexProjectStatus;
  deliveryDate: string;
  nextAction: string;
  nextActionHref: string;
  summary: string;
  progressLabel: string;
  timeline: MyWritexTimelineStage[];
  files: MyWritexProjectFile[];
  payment: {
    currency: string;
    total: number;
    paid: number;
    status: "Paid" | "Partially paid" | "Payment due" | "Cancelled";
  };
  canOrderSimilar: boolean;
  qualitySummary?: {
    headline: string;
    reviewedAt: string;
    checks: Array<{
      label: string;
      detail: string;
      state: "confirmed" | "reviewed";
    }>;
  };
};

export type MyWritexProjectView = Omit<MyWritexProject, "customerMasterId">;

export type MyWritexDocument = {
  id: string;
  name: string;
  kind:
    | "Brief"
    | "Reference"
    | "Supporting file"
    | "Delivered file"
    | "Invoice"
    | "Receipt";
  addedAt: string;
  projectId: string;
  projectTitle: string;
  sizeLabel: string;
};

export type MyWritexUpcomingWork = {
  id: string;
  title: string;
  dueLabel: string;
  targetDate: string;
  note?: string;
};

export type MyWritexPendingAction = {
  id: string;
  title: string;
  context: string;
  href: string;
  tone: "attention" | "payment" | "delivery" | "upcoming";
};

export type MyWritexRequest = {
  id: string;
  title: string;
  type:
    | "New Requirement"
    | "Revision"
    | "Support"
    | "Callback"
    | "General Query";
  status:
    | "Submitted"
    | "Reviewing"
    | "In Progress"
    | "Waiting for Customer"
    | "Resolved";
  createdAt: string;
};

export type MyWritexExperienceState =
  | "active"
  | "established"
  | "no_active_project"
  | "new"
  | "job_seeking"
  | "payment_pressure"
  | "quality_concern"
  | "graduating";

export type MyWritexJob = {
  id: string;
  role: string;
  employer: string;
  location: string;
  arrangement: "On-site" | "Hybrid" | "Remote";
  employmentType: "Full time" | "Part time" | "Graduate scheme" | "Internship";
  category: string;
  postedAt: string;
  source: string;
  lastChecked: string;
  summary: string;
  skills: string[];
  matchReason: string;
};

export type MyWritexCv = {
  id: string;
  name: string;
  focus: string;
  updatedAt: string;
  template: string;
  status: "Ready" | "Needs review" | "Draft";
};

export type MyWritexApplication = {
  id: string;
  role: string;
  employer: string;
  stage: "Saved" | "Applied" | "Interview" | "Offer" | "Closed";
  updatedAt: string;
  nextStep: string;
};

export type MyWritexCareer = {
  profile: {
    education: Array<{ qualification: string; institution: string; period: string }>;
    employmentHistory: Array<{ role: string; organisation: string; period: string }>;
    certificates: string[];
    projects: string[];
    targetRoles: string[];
    preferredLocations: string[];
    workModes: string[];
    strengths: string[];
    graduationDate: string;
    availability: string;
    completeness: number;
  };
  jobs: MyWritexJob[];
  cvs: MyWritexCv[];
  applications: MyWritexApplication[];
  interview: {
    nextSession: string;
    focus: string;
    questionSets: number;
  };
};

export type MyWritexCustomer = {
  customerMasterId: string;
  writeXId: string;
  registeredPhone: string;
  name: string;
  preferredName: string;
  relationshipSince: number;
  clientStatus: string;
  manager: {
    name: string;
    role: string;
    supportingCopy: string;
    whatsappLabel: string;
    backup?: {
      name: string;
      role: string;
      message: string;
    };
  };
  summary: {
    activeProjects: number;
    completedProjects: number;
    upcomingDeliveries: number;
    pendingActions: number;
  };
  projects: MyWritexProject[];
  invoices: Array<{
    invoiceReference: string;
    projectId: string;
    projectTitle: string;
    issuedAt: string;
    amount: number;
    currency: string;
    paymentStatus: "Paid" | "Pending" | "Partially Paid" | "Cancelled";
  }>;
  documents: MyWritexDocument[];
  historicalRequests: MyWritexRequest[];
  pendingActions: MyWritexPendingAction[];
  relationshipTimeline: Array<{
    year: number;
    type:
      | "Joined"
      | "Project milestone"
      | "Client status milestone"
      | "Referral milestone"
      | "Relationship anniversary";
    title: string;
    description: string;
  }>;
  upcomingWork: MyWritexUpcomingWork[];
  profile: {
    country: string;
    institution: string;
    programme: string;
    serviceInterests: string[];
    referencingPreference: string;
    preferredContactTime: string;
  };
  career: MyWritexCareer;
};

export type MyWritexHomeState = MyWritexExperienceState;
