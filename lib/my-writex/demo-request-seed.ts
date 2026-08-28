import type {
  MyWritexRequestRecord,
  MyWritexRequestStatus,
  MyWritexRequirementFields,
} from "@/lib/my-writex/request-types";
import { MY_WRITEX_DEMO_CUSTOMER_ID } from "@/lib/my-writex/demo-mode";

function fields(
  title: string,
  service: string,
  category: string,
  deadlineDate: string,
): MyWritexRequirementFields {
  return {
    service,
    category,
    title,
    subject: "Business and Management",
    module: "Postgraduate Business Programme",
    institution: "Demo University",
    course: "Postgraduate Business Programme",
    scope: "2,500 words",
    wordCount: "2500",
    deadlineDate,
    deadlineTime: "17:00",
    timezone: "Europe/London",
    urgency: "Standard",
    context: "A synthetic demo requirement used only for Founder review.",
    expectedDeliverable: "Structured academic support draft and review notes",
    detailedBrief:
      "Prepare a structured response aligned to the sample brief, marking criteria and agreed learning outcomes. This contains no real customer information.",
    fileNote: "Demo metadata only; no file content is uploaded.",
  };
}

function request({
  id,
  publicReference,
  title,
  service,
  category,
  status,
  createdAt,
  deadlineDate,
}: {
  id: string;
  publicReference: string;
  title: string;
  service: string;
  category: string;
  status: MyWritexRequestStatus;
  createdAt: string;
  deadlineDate: string;
}): MyWritexRequestRecord {
  const requestFields = fields(title, service, category, deadlineDate);
  const informationNeeded = status === "More Information Needed";
  return {
    id,
    fixtureScope: `customer:${MY_WRITEX_DEMO_CUSTOMER_ID}`,
    owner: { kind: "customer", customerMasterId: MY_WRITEX_DEMO_CUSTOMER_ID },
    publicReference,
    source: "new_requirement",
    idempotencyKey: `demo-seed-${id}`,
    fields: requestFields,
    files: [],
    manager: { name: "Aman", role: "My WriteX Manager" },
    status,
    createdAt,
    updatedAt: createdAt,
    submittedAt: createdAt,
    history: [
      {
        id: `${id}-history-submitted`,
        at: createdAt,
        actor: "Customer",
        title: "Requirement sent to Aman",
        detail: "Shubham submitted this demo-only requirement.",
        fromStatus: "Draft",
        toStatus: "Submitted",
      },
      ...(informationNeeded
        ? [{
            id: `${id}-history-information`,
            at: createdAt,
            actor: "Aman" as const,
            title: "Aman requested more information",
            detail: "Please confirm the preferred case organisation and attach the sample marking rubric.",
            fromStatus: "Reviewing" as const,
            toStatus: "More Information Needed" as const,
          }]
        : []),
    ],
    notes: informationNeeded
      ? [{
          id: `${id}-note-information`,
          at: createdAt,
          author: "Aman",
          visibility: "customer",
          body: "Please confirm the preferred case organisation and attach the sample marking rubric.",
        }]
      : [],
    events: [
      {
        id: `${id}-event-submitted`,
        at: createdAt,
        name: "request_submitted",
        source: "new_requirement",
        status: "Submitted",
      },
      ...(informationNeeded
        ? [{
            id: `${id}-event-information`,
            at: createdAt,
            name: "information_requested" as const,
            source: "new_requirement" as const,
            status: "More Information Needed" as const,
          }]
        : []),
    ],
  };
}

export function createMyWritexDemoRequestDatabase() {
  return {
    version: 1 as const,
    sequence: 3,
    requests: [
      request({
        id: "demo-request-reviewing",
        publicReference: "REQ-DEMO-0001",
        title: "Leadership Reflection Review",
        service: "Assignment Support",
        category: "Leadership",
        status: "Reviewing",
        createdAt: "2026-08-25T09:30:00.000Z",
        deadlineDate: "2026-09-18",
      }),
      request({
        id: "demo-request-information",
        publicReference: "REQ-DEMO-0002",
        title: "Strategic Management Case Analysis",
        service: "Assignment Support",
        category: "Management",
        status: "More Information Needed",
        createdAt: "2026-08-26T11:15:00.000Z",
        deadlineDate: "2026-09-24",
      }),
      request({
        id: "demo-request-closed",
        publicReference: "REQ-DEMO-0003",
        title: "Research Methods Consultation",
        service: "Research Proposal Support",
        category: "Academic Research",
        status: "Closed",
        createdAt: "2026-08-20T14:00:00.000Z",
        deadlineDate: "2026-09-12",
      }),
    ],
  };
}
