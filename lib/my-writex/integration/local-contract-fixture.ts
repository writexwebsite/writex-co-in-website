export const LOCAL_CUSTOMER_A_ID = "CUST-TEST-001";
export const LOCAL_CUSTOMER_A_WRITEX_ID = "rahulsharma.7k2";
export const LOCAL_CUSTOMER_A_PHONE = "+447700900001";
export const LOCAL_CUSTOMER_B_ID = "CUST-TEST-002";
export const LOCAL_CUSTOMER_B_WRITEX_ID = "sarahjones.9m4";
export const LOCAL_CUSTOMER_B_PHONE = "+447700900002";
export const LOCAL_INVOICE_REFERENCE = "WX-MW-1001";

const manager = {
  name: "Aman",
  role: "Relationship Manager",
  supportingCopy: "Your main point of contact at WriteX.",
};

const customerAProjects = [
  {
    publicRef: "project-research-proposal",
    invoiceReference: LOCAL_INVOICE_REFERENCE,
    title: "Research Proposal",
    service: "Research Proposal Support",
    category: "Academic Research",
    phase: "active",
    status: "quality_review",
    deliveryDate: "2026-08-28",
    progressLabel: "Quality Review",
    summary: "A focused research proposal prepared for local contract testing.",
    files: [
      {
        publicRef: "DOC-MOCK-1001",
        name: "Research proposal brief.pdf",
        kind: "Brief",
        addedAt: "2026-08-18",
        sizeLabel: "1.8 MB",
      },
      {
        publicRef: "DOC-MOCK-1002",
        name: "Invoice WX-MW-1001.pdf",
        kind: "Invoice",
        addedAt: "2026-08-18",
        sizeLabel: "182 KB",
      },
    ],
    payment: { currency: "GBP", total: 420, paid: 420, status: "Paid" },
    timeline: [
      {
        key: "requirement_received",
        label: "Requirement Received",
        date: "2026-08-18",
        state: "complete",
      },
      {
        key: "quality_review",
        label: "Quality Review",
        date: "2026-08-26",
        state: "current",
      },
    ],
  },
  {
    publicRef: "project-dissertation-chapter-four",
    invoiceReference: "WX-MW-1002",
    title: "Dissertation — Chapter Four",
    service: "Dissertation Support",
    category: "Data Analysis",
    phase: "active",
    status: "in_progress",
    deliveryDate: "2026-09-04",
    progressLabel: "In Progress",
    summary: "A second local project used to prove customer-scope access.",
    files: [
      {
        publicRef: "DOC-MOCK-1003",
        name: "Anonymised dataset.xlsx",
        kind: "Reference",
        addedAt: "2026-08-23",
        sizeLabel: "2.4 MB",
      },
    ],
    payment: {
      currency: "GBP",
      total: 680,
      paid: 340,
      status: "Partially Paid",
    },
    timeline: [
      {
        key: "in_progress",
        label: "In Progress",
        date: "2026-08-24",
        state: "current",
      },
    ],
  },
] as const;

function invoicesFor(projects: readonly (typeof customerAProjects)[number][]) {
  return projects.map((project) => ({
    invoiceReference: project.invoiceReference,
    projectPublicRef: project.publicRef,
    projectTitle: project.title,
    amount: project.payment.total,
    currency: project.payment.currency,
    paymentStatus: project.payment.status,
  }));
}

function documentsFor(projects: readonly (typeof customerAProjects)[number][]) {
  return projects.flatMap((project) =>
    project.files.map((file) => ({
      ...file,
      projectPublicRef: project.publicRef,
      projectTitle: project.title,
    })),
  );
}

export const LOCAL_CONTRACT_CUSTOMERS = [
  {
    customerMasterId: LOCAL_CUSTOMER_A_ID,
    writeXId: LOCAL_CUSTOMER_A_WRITEX_ID,
    registeredPhone: LOCAL_CUSTOMER_A_PHONE,
    name: "Rahul Sharma",
    preferredName: "Rahul",
    relationshipSince: 2023,
    clientStatus: "Preferred Client",
    manager,
    projects: customerAProjects,
    invoices: invoicesFor(customerAProjects),
    documents: documentsFor(customerAProjects),
    relationshipTimeline: [
      {
        year: 2023,
        type: "Joined",
        title: "Joined WriteX",
        description: "The first local-fixture project began the relationship.",
      },
      {
        year: 2026,
        type: "Project milestone",
        title: "40+ Projects Completed",
        description: "A local relationship-history fixture.",
      },
    ],
    historicalRequests: [
      {
        requestRef: "request-1",
        title: "Harvard referencing check",
        type: "Support",
        status: "Resolved",
        createdAt: "2026-06-13",
      },
    ],
  },
  {
    customerMasterId: LOCAL_CUSTOMER_B_ID,
    writeXId: LOCAL_CUSTOMER_B_WRITEX_ID,
    registeredPhone: LOCAL_CUSTOMER_B_PHONE,
    name: "Sarah Jones",
    preferredName: "Sarah",
    relationshipSince: 2026,
    clientStatus: "Local UAT Customer",
    manager,
    projects: [],
    invoices: [],
    documents: [],
    relationshipTimeline: [],
    historicalRequests: [],
  },
] as const;

export type LocalContractCustomer = (typeof LOCAL_CONTRACT_CUSTOMERS)[number];
export type LocalContractProject = (typeof customerAProjects)[number];

export function findLocalCustomerById(customerMasterId: string) {
  return LOCAL_CONTRACT_CUSTOMERS.find(
    (customer) => customer.customerMasterId === customerMasterId,
  );
}

export function findLocalCustomerByCredentials(writeXId: string, phone: string) {
  return LOCAL_CONTRACT_CUSTOMERS.find(
    (customer) =>
      customer.writeXId === writeXId && customer.registeredPhone === phone,
  );
}

export function findLocalProjectByInvoice(invoiceReference: string) {
  for (const customer of LOCAL_CONTRACT_CUSTOMERS) {
    const project = customer.projects.find(
      (candidate) => candidate.invoiceReference === invoiceReference,
    );
    if (project) return { customer, project };
  }
  return undefined;
}
