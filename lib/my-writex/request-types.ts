export const MY_WRITEX_REQUEST_SOURCES = [
  "new_requirement",
  "similar_project",
  "upcoming_work",
  "invoice_workspace",
] as const;

export type MyWritexRequestSource = (typeof MY_WRITEX_REQUEST_SOURCES)[number];

export const MY_WRITEX_REQUEST_STATUSES = [
  "Draft",
  "Submitted",
  "Reviewing",
  "More Information Needed",
  "Ready for Discussion",
  "Quote Shared",
  "Accepted",
  "Closed",
  "Cancelled",
] as const;

export type MyWritexRequestStatus = (typeof MY_WRITEX_REQUEST_STATUSES)[number];

export type MyWritexRequestOwner =
  | { kind: "customer"; customerMasterId: string }
  | { kind: "invoice"; invoiceReference: string };

export type MyWritexRequirementFields = {
  service: string;
  category: string;
  title: string;
  subject: string;
  module: string;
  institution: string;
  course: string;
  scope: string;
  wordCount: string;
  deadlineDate: string;
  deadlineTime: string;
  timezone: string;
  urgency: string;
  context: string;
  expectedDeliverable: string;
  detailedBrief: string;
  fileNote: string;
};

export type MyWritexRequestFile = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  purpose: "brief" | "supporting";
  uploadState: "stored";
  addedAt: string;
};

export type MyWritexRequestHistoryEntry = {
  id: string;
  at: string;
  actor: "Customer" | "Aman" | "WriteX local inspector" | "System";
  title: string;
  detail: string;
  fromStatus?: MyWritexRequestStatus;
  toStatus?: MyWritexRequestStatus;
};

export type MyWritexRequestNote = {
  id: string;
  at: string;
  author: "Customer" | "Aman" | "WriteX local inspector";
  visibility: "customer" | "internal";
  body: string;
};

export type MyWritexRequestEventName =
  | "draft_started"
  | "draft_saved"
  | "request_submitted"
  | "status_changed"
  | "information_requested"
  | "customer_responded"
  | "request_cancelled";

export type MyWritexRequestEvent = {
  id: string;
  at: string;
  name: MyWritexRequestEventName;
  source: MyWritexRequestSource;
  status: MyWritexRequestStatus;
};

export type MyWritexRequestRecord = {
  id: string;
  fixtureScope: string;
  owner: MyWritexRequestOwner;
  publicReference: string;
  source: MyWritexRequestSource;
  sourceProjectId?: string;
  sourceProjectTitle?: string;
  sourceUpcomingId?: string;
  sourceUpcomingTitle?: string;
  sourceInvoiceReference?: string;
  idempotencyKey: string;
  fields: MyWritexRequirementFields;
  files: MyWritexRequestFile[];
  manager: { name: "Aman"; role: "My WriteX Manager" };
  status: MyWritexRequestStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  history: MyWritexRequestHistoryEntry[];
  notes: MyWritexRequestNote[];
  events: MyWritexRequestEvent[];
};

export type MyWritexRequestView = Omit<
  MyWritexRequestRecord,
  "fixtureScope" | "owner" | "idempotencyKey" | "events"
>;

export type MyWritexRequestInput = {
  requestId?: string;
  idempotencyKey: string;
  source: MyWritexRequestSource;
  sourceProjectId?: string;
  sourceProjectTitle?: string;
  sourceUpcomingId?: string;
  sourceUpcomingTitle?: string;
  sourceInvoiceReference?: string;
  fields: MyWritexRequirementFields;
  files: Array<{
    id?: string;
    name: string;
    size: number;
    mimeType: string;
    purpose: "brief" | "supporting";
  }>;
};

export type MyWritexRequestFunnel = {
  draftsStarted: number;
  draftsSaved: number;
  submitted: number;
  reviewing: number;
  informationNeeded: number;
  customerResponses: number;
  readyForDiscussion: number;
  cancelled: number;
};

export function emptyRequirementFields(): MyWritexRequirementFields {
  return {
    service: "",
    category: "",
    title: "",
    subject: "",
    module: "",
    institution: "",
    course: "",
    scope: "",
    wordCount: "",
    deadlineDate: "",
    deadlineTime: "",
    timezone: "Asia/Calcutta",
    urgency: "Standard",
    context: "",
    expectedDeliverable: "",
    detailedBrief: "",
    fileNote: "",
  };
}
